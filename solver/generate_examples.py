"""Regenerate tree figures and validate all examples for the report.
Produces: tree figures, crossover example, per-method comparison.
All examples come from calling the real functions.
"""
import numpy as np, matplotlib, os, sys
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from collections import deque

from tree_distance import GuestTree
from synthetic import generate_synthetic_tree
from initializers import (random_valid, nearest_neighbor, greedy_top_down,
                          bottom_up_merge, compact_tables)
from operators import crossover, _renumber
from fitness import evaluate_population
from gnn_model import gnn_initializer, SeatingGNN
import torch

os.makedirs('figures', exist_ok=True)

# ============================================================
# draw_tree function
# ============================================================
def draw_tree(groups, filename, title, assignment=None):
    tree = GuestTree(groups)
    fig, ax = plt.subplots(1, 1, figsize=(10, 6))
    ax.set_title(title, fontsize=14, fontweight='bold'); ax.axis('off')
    level_nodes = {}
    q = deque([(tree.root, 0)])
    while q:
        node, depth = q.popleft()
        level_nodes.setdefault(depth, []).append(node)
        for c in tree.children[node]: q.append((c, depth + 1))
    max_depth = max(level_nodes.keys())
    pos = {}
    for depth, nodes in level_nodes.items():
        for i, node in enumerate(nodes):
            pos[node] = ((i + 0.5) / len(nodes), 1.0 - depth / (max_depth + 1))
    tc = ['#e6194b','#3cb44b','#4363d8','#f58231','#911eb4','#42d4f4','#f032e6','#bfef45',
          '#fabed4','#469990','#dcbeff','#9A6324','#800000','#aaffc3','#808000','#ffd8b1',
          '#000075','#a9a9a9','#ffe119','#000000']
    is_leaf = {gid: len(tree.children[gid]) == 0 for gid in tree.ids}
    leaf_table = {}
    if assignment is not None:
        for li, leaf_idx in enumerate(tree.leaf_indices):
            leaf_table[tree.ids[leaf_idx]] = assignment[li]
    il = {}; cnt = 1
    bfs = deque([tree.root])
    while bfs:
        node = bfs.popleft()
        if not is_leaf[node]: il[node] = cnt; cnt += 1
        for c in tree.children[node]: bfs.append(c)
    for gid in tree.ids:
        g = tree.groups[gid]
        if g['parent_id'] != 0:
            x1, y1 = pos[gid]; x2, y2 = pos[g['parent_id']]
            ax.plot([x1, x2], [y1, y2], 'k-', linewidth=0.8, alpha=0.5)
    for gid in tree.ids:
        x, y = pos[gid]
        if is_leaf[gid] and gid in leaf_table:
            color = tc[leaf_table[gid] % len(tc)]
        elif is_leaf[gid]:
            color = 'lightblue'
        else:
            color = '#d0d0d0'
        r = 0.025 if is_leaf[gid] else 0.012
        ax.add_patch(plt.Circle((x, y), r, color=color, ec='black', linewidth=0.8, zorder=5))
        if is_leaf[gid]:
            ax.text(x, y, f'{gid}\n({tree.groups[gid]["size"]})', ha='center', va='center', fontsize=5, zorder=6, linespacing=0.8)
        else:
            ax.text(x, y, f'G{il[gid]}', ha='center', va='center', fontsize=5, zorder=6)
    if assignment is not None:
        tabs = sorted(set(assignment))
        handles = [mpatches.Patch(color=tc[t % len(tc)], label=f'Table {i+1}') for i, t in enumerate(tabs[:16])]
        ax.legend(handles=handles, loc='lower right', fontsize=6, ncol=4)
    ax.set_xlim(-0.05, 1.05); ax.set_ylim(-0.05, 1.15)
    fig.tight_layout()
    fig.savefig(f'figures/{filename}', dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f'  Saved figures/{filename}')

# ============================================================
# Small example tree
# ============================================================
print("=== Small example tree ===")
small_groups = generate_synthetic_tree(40, max_group_size=4, max_children=3, rng=np.random.default_rng(0))
tree = GuestTree(small_groups)
dm = tree.precompute_dist_matrix()
C = 10
leaf_ids = [tree.ids[l] for l in tree.leaf_indices]
leaf_sizes = tree.sizes[tree.leaf_indices]
leaf_dm = dm[np.ix_(tree.leaf_indices, tree.leaf_indices)].astype(np.float64)
total = int(leaf_sizes.sum())
min_t = int(np.ceil(total / C))
print(f"  {tree.n} nodes, {tree.n_leaves} leaves, {total} people, C={C}, min_tables={min_t}")

# Plain tree
draw_tree(small_groups, 'tree_plain.png',
          f'Example Guest Tree — {tree.n_leaves} leaves ({total} people), C={C}')

# ============================================================
# Generate and validate each method
# ============================================================
print("\n=== Random Valid ===")
a_rand = _renumber(compact_tables(random_valid(tree, C, np.random.default_rng(0)), tree, C))
F_rand = evaluate_population(a_rand.reshape(1,-1), tree, C, dist_matrix=dm)[0]
nt_rand = len(np.unique(a_rand))
draw_tree(small_groups, 'tree_random.png', f'Random Valid — {nt_rand} tables, penalty={F_rand[1]:.0f}', a_rand)
print(f"  {nt_rand} tables, penalty={F_rand[1]:.1f}")
for t in sorted(np.unique(a_rand)):
    m = np.where(a_rand == t)[0]
    print(f"  Table {t+1}: leaves {[leaf_ids[i] for i in m]}, sizes {[int(leaf_sizes[i]) for i in m]}, total={leaf_sizes[m].sum()}")

print("\n=== Nearest-Neighbor ===")
a_nn = _renumber(compact_tables(nearest_neighbor(tree, C, np.random.default_rng(0)), tree, C))
F_nn = evaluate_population(a_nn.reshape(1,-1), tree, C, dist_matrix=dm)[0]
nt_nn = len(np.unique(a_nn))
draw_tree(small_groups, 'tree_nearest_neighbor.png', f'Nearest-Neighbor — {nt_nn} tables, penalty={F_nn[1]:.0f}', a_nn)
print(f"  {nt_nn} tables, penalty={F_nn[1]:.1f}")
for t in sorted(np.unique(a_nn)):
    m = np.where(a_nn == t)[0]
    print(f"  Table {t+1}: leaves {[leaf_ids[i] for i in m]}, sizes {[int(leaf_sizes[i]) for i in m]}, total={leaf_sizes[m].sum()}")

print("\n=== Top-Down ===")
a_td = _renumber(compact_tables(greedy_top_down(tree, C, np.random.default_rng(0)), tree, C))
F_td = evaluate_population(a_td.reshape(1,-1), tree, C, dist_matrix=dm)[0]
nt_td = len(np.unique(a_td))
draw_tree(small_groups, 'tree_top_down.png', f'Top-Down — {nt_td} tables, penalty={F_td[1]:.0f}', a_td)
print(f"  {nt_td} tables, penalty={F_td[1]:.1f}")
for t in sorted(np.unique(a_td)):
    m = np.where(a_td == t)[0]
    print(f"  Table {t+1}: leaves {[leaf_ids[i] for i in m]}, sizes {[int(leaf_sizes[i]) for i in m]}, total={leaf_sizes[m].sum()}")

print("\n=== Bottom-Up Merge ===")
a_bu = _renumber(compact_tables(bottom_up_merge(tree, C, np.random.default_rng(0)), tree, C))
F_bu = evaluate_population(a_bu.reshape(1,-1), tree, C, dist_matrix=dm)[0]
nt_bu = len(np.unique(a_bu))
draw_tree(small_groups, 'tree_bottom_up_merge.png', f'Bottom-Up Merge — {nt_bu} tables, penalty={F_bu[1]:.0f}', a_bu)
print(f"  {nt_bu} tables, penalty={F_bu[1]:.1f}")
for t in sorted(np.unique(a_bu)):
    m = np.where(a_bu == t)[0]
    print(f"  Table {t+1}: leaves {[leaf_ids[i] for i in m]}, sizes {[int(leaf_sizes[i]) for i in m]}, total={leaf_sizes[m].sum()}")

print("\n=== GNN ===")
gnn = SeatingGNN()
gnn.load_state_dict(torch.load('gnn_model.pt', weights_only=True))
a_gnn = _renumber(compact_tables(gnn_initializer(tree, C, gnn, np.random.default_rng(0)), tree, C))
F_gnn = evaluate_population(a_gnn.reshape(1,-1), tree, C, dist_matrix=dm)[0]
nt_gnn = len(np.unique(a_gnn))
draw_tree(small_groups, 'tree_gnn.png', f'GNN — {nt_gnn} tables, penalty={F_gnn[1]:.0f}', a_gnn)
print(f"  {nt_gnn} tables, penalty={F_gnn[1]:.1f}")
for t in sorted(np.unique(a_gnn)):
    m = np.where(a_gnn == t)[0]
    print(f"  Table {t+1}: leaves {[leaf_ids[i] for i in m]}, sizes {[int(leaf_sizes[i]) for i in m]}, total={leaf_sizes[m].sum()}")

# ============================================================
# Crossover example
# ============================================================
print("\n=== Crossover Example ===")
parent_a = a_bu  # bottom-up merge
parent_b = a_rand  # random

# Find a good subtree (3-6 leaves)
is_leaf = {gid: len(tree.children[gid]) == 0 for gid in tree.ids}
for seed in range(50):
    crng = np.random.default_rng(seed)
    root_idx = crng.integers(tree.n)
    subtree_nodes = set()
    stack = [root_idx]
    while stack:
        node = stack.pop()
        subtree_nodes.add(node)
        for c in tree.children[tree.ids[node]]:
            stack.append(tree.id_to_idx[c])
    subtree_lp = [i for i, li in enumerate(tree.leaf_indices) if li in subtree_nodes]
    if 3 <= len(subtree_lp) <= 6:
        print(f"  Using seed={seed}, subtree root=node {tree.ids[root_idx]}, {len(subtree_lp)} leaves: {[leaf_ids[i] for i in subtree_lp]}")
        break

child = crossover(parent_a, parent_b, tree, leaf_sizes, leaf_dm, C, np.random.default_rng(seed))
F_child = evaluate_population(child.reshape(1,-1), tree, C, dist_matrix=dm)[0]
print(f"  Parent A (BU-merge): {len(np.unique(parent_a))} tables, penalty={F_bu[1]:.0f}")
print(f"  Parent B (random):   {len(np.unique(parent_b))} tables, penalty={F_rand[1]:.0f}")
print(f"  Child:               {len(np.unique(child))} tables, penalty={F_child[1]:.0f}")
print(f"  Child tables:")
for t in sorted(np.unique(child)):
    m = np.where(child == t)[0]
    print(f"    Table {t+1}: leaves {[leaf_ids[i] for i in m]}, total={leaf_sizes[m].sum()}")

print("\n=== All done ===")
