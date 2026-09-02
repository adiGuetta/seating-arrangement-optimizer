"""Improved GNN initializer v2.

Key changes from v1:
1. No assignment input — just tree structure features
2. Better training targets from longer EA runs
3. Improved clustering: use embedding distances weighted by tree distance
4. Margin-based contrastive loss with hard negative mining
"""
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv
from torch_geometric.data import Data

class SeatingGNN(nn.Module):
    def __init__(self, in_features=4, hidden=64, embed_dim=32):
        super().__init__()
        self.conv1 = GCNConv(in_features, hidden)
        self.conv2 = GCNConv(hidden, hidden)
        self.conv3 = GCNConv(hidden, embed_dim)
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, x, edge_index):
        h = F.relu(self.conv1(x, edge_index))
        h = F.relu(self.conv2(h, edge_index))
        h = self.norm(self.conv3(h, edge_index))
        return h

def tree_to_pyg(tree, max_table_size=10):
    """Convert tree to PyG — only structural features, no assignment."""
    n = tree.n
    edges_src, edges_dst = [], []
    for gid in tree.ids:
        g = tree.groups[gid]
        if g['parent_id'] != 0:
            i, j = tree.id_to_idx[gid], tree.id_to_idx[g['parent_id']]
            edges_src.extend([i, j])
            edges_dst.extend([j, i])
    edge_index = torch.tensor([edges_src, edges_dst], dtype=torch.long)
    max_depth = max(tree.depth) if len(tree.depth) > 0 else 1
    total_people = float(tree.sizes[tree.leaf_indices].sum())
    x = torch.zeros(n, 4, dtype=torch.float32)
    for idx in range(n):
        x[idx, 0] = tree.depth[idx] / max(max_depth, 1)
        x[idx, 1] = tree.sizes[idx] / max_table_size
        x[idx, 2] = 1.0 if tree.is_leaf[idx] else 0.0
        # Subtree total people (sum of leaf sizes below this node)
        people = 0
        stack = [idx]
        while stack:
            node = stack.pop()
            if tree.is_leaf[node]:
                people += tree.sizes[node]
            for c in tree.children[tree.ids[node]]:
                stack.append(tree.id_to_idx[c])
        x[idx, 3] = people / total_people if total_people > 0 else 0.0
    data = Data(x=x, edge_index=edge_index)
    data.leaf_mask = torch.tensor(tree.is_leaf, dtype=torch.bool)
    return data

def embeddings_to_assignment(embeddings, tree, max_table_size):
    """Improved clustering: greedy by pairwise embedding distance."""
    emb = embeddings.detach().numpy()
    n = len(emb)
    leaf_sizes = tree.sizes[tree.leaf_indices]
    # Pairwise embedding distances
    dists = np.linalg.norm(emb[:, None] - emb[None, :], axis=2)
    assignment = np.full(n, -1, dtype=np.int32)
    unassigned = set(range(n))
    table_id = 0
    while unassigned:
        # Seed: pick unassigned leaf, prefer one far from already-assigned
        candidates = list(unassigned)
        if table_id == 0:
            seed = candidates[0]
        else:
            # Pick the leaf most distant (in embedding) from all assigned leaves
            assigned = [i for i in range(n) if assignment[i] >= 0]
            if assigned:
                min_dists = dists[np.ix_(candidates, assigned)].min(axis=1)
                seed = candidates[np.argmax(min_dists)]
            else:
                seed = candidates[0]
        assignment[seed] = table_id
        unassigned.remove(seed)
        current_size = int(leaf_sizes[seed])
        members = [seed]
        while unassigned and current_size < max_table_size:
            best = -1; best_d = np.inf
            for u in unassigned:
                if current_size + leaf_sizes[u] > max_table_size:
                    continue
                # Distance to closest member in this table
                d = min(dists[u, m] for m in members)
                if d < best_d:
                    best_d = d; best = u
            if best == -1:
                break
            assignment[best] = table_id
            unassigned.remove(best)
            current_size += int(leaf_sizes[best])
            members.append(best)
        table_id += 1
    return assignment

def contrastive_loss(embeddings, target_assignment):
    """Improved contrastive with margin and weighting."""
    n = len(embeddings)
    dists = torch.cdist(embeddings.unsqueeze(0), embeddings.unsqueeze(0)).squeeze(0)
    target = torch.tensor(target_assignment, dtype=torch.long)
    same = (target.unsqueeze(0) == target.unsqueeze(1)).float()
    margin = 3.0
    # Pull same-table pairs together
    loss_same = (same * dists ** 2).sum() / (same.sum() + 1)
    # Push different-table pairs apart (only hard negatives: those within margin)
    diff_mask = 1 - same
    loss_diff = (diff_mask * F.relu(margin - dists) ** 2).sum() / (diff_mask.sum() + 1)
    return loss_same + 0.5 * loss_diff

def _generate_one(args):
    """Worker for parallel training data generation."""
    n_groups, max_ts, seed, ea_pop, ea_gen = args
    from synthetic import generate_synthetic_tree
    from tree_distance import GuestTree
    from optimizer import run_optimization
    rng = np.random.default_rng(seed)
    groups = generate_synthetic_tree(int(n_groups), max_group_size=4, max_children=3, rng=rng)
    tree = GuestTree(groups)
    if tree.n_leaves < 10:
        return None
    try:
        result = run_optimization(tree, max_ts, pop_size=ea_pop, n_gen=ea_gen)
    except Exception:
        return None
    if result.F is None or len(result.F) == 0:
        return None
    # Use min-table solution (hardest problem)
    min_tables = int(result.F[:, 0].min())
    mask = result.F[:, 0] == min_tables
    best_idx = np.where(mask)[0][result.F[mask, 1].argmin()]
    best_a = result.X[best_idx].astype(np.int32)
    pyg_data = tree_to_pyg(tree, max_ts)
    pyg_data.target_assignment = best_a
    return pyg_data


def train_gnn(n_trees=1500, epochs=200, lr=5e-4, ea_pop=40, ea_gen=40):
    import os
    from concurrent.futures import ProcessPoolExecutor, as_completed

    n_workers = max(1, os.cpu_count() - 2)
    model = SeatingGNN()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, epochs)

    rng = np.random.default_rng(42)
    sizes = rng.integers(30, 1000, size=n_trees)
    max_tss = rng.choice([8, 10, 12], size=n_trees)
    seeds = rng.integers(0, 2**31, size=n_trees)
    args_list = [(int(sizes[i]), int(max_tss[i]), int(seeds[i]), ea_pop, ea_gen)
                 for i in range(n_trees)]

    print(f"Training GNN: {n_trees} trees, {epochs} epochs, {n_workers} workers", flush=True)
    all_data = []
    import time
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=n_workers) as executor:
        futures = {executor.submit(_generate_one, a): i for i, a in enumerate(args_list)}
        done = 0
        for future in as_completed(futures):
            done += 1
            result = future.result()
            if result is not None:
                all_data.append(result)
            if done % 100 == 0 or done == n_trees:
                elapsed = time.time() - t0
                eta = elapsed / done * (n_trees - done) if done > 0 else 0
                print(f"  [{done}/{n_trees}] {len(all_data)} valid, "
                      f"{elapsed:.0f}s elapsed, ~{eta:.0f}s remaining", flush=True)

    print(f"  Training on {len(all_data)} examples", flush=True)
    best_loss = float('inf')
    t0_train = time.time()
    for epoch in range(epochs):
        total_loss = 0
        np.random.shuffle(all_data)
        model.train()
        for data in all_data:
            emb = model(data.x, data.edge_index)
            leaf_emb = emb[data.leaf_mask]
            loss = contrastive_loss(leaf_emb, data.target_assignment)
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += loss.item()
        scheduler.step()
        avg = total_loss / len(all_data)
        if avg < best_loss:
            best_loss = avg
            torch.save(model.state_dict(), 'gnn_model.pt')
        if (epoch + 1) % 25 == 0:
            elapsed = time.time() - t0_train
            eta = elapsed / (epoch + 1) * (epochs - epoch - 1)
            print(f"  Epoch {epoch+1}/{epochs}: loss={avg:.4f}, best={best_loss:.4f}, "
                  f"{elapsed:.0f}s elapsed, ~{eta:.0f}s remaining", flush=True)

    print(f"Done. Best loss: {best_loss:.4f}", flush=True)
    return model

def gnn_initializer(tree, max_table_size, model=None, rng=None, alpha=0.2, leaf_dm=None):
    """GNN-enhanced nearest-neighbor: blend tree distance with learned embedding distance."""
    if rng is None:
        rng = np.random.default_rng()
    if model is None:
        model = SeatingGNN()
        model.load_state_dict(torch.load('gnn_model.pt', weights_only=True))
    model.eval()
    data = tree_to_pyg(tree, max_table_size)
    with torch.no_grad():
        emb = model(data.x, data.edge_index)[data.leaf_mask].numpy()
    leaves = tree.leaf_indices
    leaf_sizes = tree.sizes[leaves]
    if leaf_dm is None:
        dm = tree.precompute_dist_matrix()
        leaf_dm = dm[np.ix_(leaves, leaves)].astype(float)
    emb_dists = np.linalg.norm(emb[:, None] - emb[None, :], axis=2)
    tree_max = leaf_dm.max() + 1
    emb_max = emb_dists.max() + 1
    combined = (1 - alpha) * (leaf_dm / tree_max) + alpha * (emb_dists / emb_max)
    n = len(leaves)
    assignment = np.full(n, -1, dtype=np.int32)
    unassigned = set(range(n))
    table_id = 0
    while unassigned:
        seed = rng.choice(list(unassigned))
        assignment[seed] = table_id
        unassigned.remove(seed)
        current_size = int(leaf_sizes[seed])
        members = [seed]
        while unassigned and current_size < max_table_size:
            best = -1; best_d = np.inf
            for u in unassigned:
                if current_size + leaf_sizes[u] > max_table_size:
                    continue
                d = min(combined[u, m] for m in members)
                if d < best_d:
                    best_d = d; best = u
            if best == -1:
                break
            assignment[best] = table_id
            unassigned.remove(best)
            current_size += int(leaf_sizes[best])
            members.append(best)
        table_id += 1
    return assignment

def finetune_gnn(model, tree, max_table_size, good_assignments, epochs=50, lr=1e-4):
    """Fine-tune GNN on a specific tree using EA solutions as targets.
    good_assignments: list of (assignment, penalty) tuples from the EA population.
    Returns the fine-tuned model (copy — original is not modified).
    """
    import copy
    ft = copy.deepcopy(model)
    # Freeze early layers, only train last layer
    for param in ft.conv1.parameters():
        param.requires_grad = False
    for param in ft.conv2.parameters():
        param.requires_grad = False
    optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, ft.parameters()), lr=lr)
    data = tree_to_pyg(tree, max_table_size)
    # Sort by penalty, use top solutions as targets
    good_assignments.sort(key=lambda x: x[1])
    targets = [a for a, p in good_assignments[:min(10, len(good_assignments))]]
    ft.train()
    for epoch in range(epochs):
        for target_a in targets:
            emb = ft(data.x, data.edge_index)
            leaf_emb = emb[data.leaf_mask]
            loss = contrastive_loss(leaf_emb, target_a)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
    ft.eval()
    return ft

if __name__ == '__main__':
    train_gnn()
