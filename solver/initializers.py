"""Heuristic initializers for seating assignments — only leaf nodes are assigned."""
import numpy as np

def compact_tables(assignment, tree, max_table_size, max_extra_tables=5):
    """Merge tables until within min_tables + max_extra_tables."""
    a = assignment.copy()
    leaf_sizes = tree.sizes[tree.leaf_indices]
    total_people = leaf_sizes.sum()
    min_t = int(np.ceil(total_people / max_table_size))
    max_t = min_t + max_extra_tables
    for _ in range(500):
        tables = np.unique(a)
        if len(tables) <= max_t:
            break
        t_sizes = [(t, int(leaf_sizes[a == t].sum())) for t in tables]
        t_sizes.sort(key=lambda x: x[1])
        merged = False
        for i in range(len(t_sizes)):
            for j in range(i + 1, len(t_sizes)):
                if t_sizes[i][1] + t_sizes[j][1] <= max_table_size:
                    a[a == t_sizes[j][0]] = t_sizes[i][0]
                    merged = True
                    break
            if merged:
                break
        if not merged:
            a[a == t_sizes[1][0]] = t_sizes[0][0]
    # Repair overflows
    for _ in range(len(a) * 5):
        tables = np.unique(a)
        if len(tables) <= max_t:
            break
        overflow = False
        for t in tables:
            members = np.where(a == t)[0]
            if leaf_sizes[members].sum() > max_table_size:
                overflow = True
                smallest = members[leaf_sizes[members].argmin()]
                best_t = -1
                best_room = -1
                for t2 in tables:
                    if t2 == t:
                        continue
                    room = max_table_size - leaf_sizes[a == t2].sum()
                    if room >= leaf_sizes[smallest] and room > best_room:
                        best_room = room
                        best_t = t2
                if best_t >= 0:
                    a[smallest] = best_t
                else:
                    break
                break
        if not overflow:
            break
    tables = np.unique(a)
    has_overflow = any(leaf_sizes[a == t].sum() > max_table_size for t in tables)
    if len(tables) > max_t or has_overflow:
        a = random_valid(tree, max_table_size)
    return a

def random_valid(tree, max_table_size, rng=None):
    """Randomly assign leaf groups to tables respecting size constraint."""
    if rng is None:
        rng = np.random.default_rng()
    n = tree.n_leaves
    leaf_sizes = tree.sizes[tree.leaf_indices]
    assignment = np.full(n, -1, dtype=np.int32)
    table_sizes = {}
    table_id = 0
    order = rng.permutation(n)
    for i in order:
        placed = False
        for t, sz in table_sizes.items():
            if sz + leaf_sizes[i] <= max_table_size:
                assignment[i] = t
                table_sizes[t] += leaf_sizes[i]
                placed = True
                break
        if not placed:
            assignment[i] = table_id
            table_sizes[table_id] = leaf_sizes[i]
            table_id += 1
    return assignment

def nearest_neighbor(tree, max_table_size, rng=None, leaf_dm=None):
    """Nearest-neighbor: pick a random seed leaf, fill table with closest unassigned leaves."""
    if rng is None:
        rng = np.random.default_rng()
    n = tree.n_leaves
    leaves = tree.leaf_indices
    leaf_sizes = tree.sizes[leaves]
    if leaf_dm is None:
        dm = tree.precompute_dist_matrix()
        leaf_dm = dm[np.ix_(leaves, leaves)].astype(np.float64)
    assignment = np.full(n, -1, dtype=np.int32)
    unassigned = np.ones(n, dtype=bool)
    table_id = 0
    while unassigned.any():
        candidates = np.where(unassigned)[0]
        seed = rng.choice(candidates)
        assignment[seed] = table_id
        unassigned[seed] = False
        current_size = int(leaf_sizes[seed])
        members = [seed]
        while current_size < max_table_size and unassigned.any():
            cand = np.where(unassigned)[0]
            fits = cand[leaf_sizes[cand] + current_size <= max_table_size]
            if len(fits) == 0:
                break
            d = leaf_dm[np.ix_(fits, members)].min(axis=1)
            best = fits[d.argmin()]
            assignment[best] = table_id
            unassigned[best] = False
            current_size += int(leaf_sizes[best])
            members.append(best)
        table_id += 1
    return assignment

def greedy_top_down(tree, max_table_size, rng=None):
    """Recursively assign leaves of subtrees that fit together."""
    if rng is None:
        rng = np.random.default_rng()
    leaves = tree.leaf_indices
    leaf_sizes = tree.sizes[leaves]
    n = tree.n_leaves
    assignment = np.full(n, -1, dtype=np.int32)
    leaf_map = {leaves[i]: i for i in range(n)}
    subtree_leaf_size = np.zeros(tree.n, dtype=np.int32)
    order = np.argsort(-tree.depth)
    for idx in order:
        gid = tree.ids[idx]
        if tree.is_leaf[idx]:
            subtree_leaf_size[idx] = tree.sizes[idx]
        for c in tree.children[gid]:
            subtree_leaf_size[idx] += subtree_leaf_size[tree.id_to_idx[c]]
    table_id = [0]
    def assign_subtree_leaves(node_idx, tid):
        if tree.is_leaf[node_idx]:
            assignment[leaf_map[node_idx]] = tid
            return
        gid = tree.ids[node_idx]
        for c in tree.children[gid]:
            assign_subtree_leaves(tree.id_to_idx[c], tid)
    stack = [tree.id_to_idx[tree.root]]
    while stack:
        node = stack.pop()
        if subtree_leaf_size[node] <= max_table_size:
            assign_subtree_leaves(node, table_id[0])
            table_id[0] += 1
        elif tree.is_leaf[node]:
            assignment[leaf_map[node]] = table_id[0]
            table_id[0] += 1
        else:
            gid = tree.ids[node]
            children = [tree.id_to_idx[c] for c in tree.children[gid]]
            rng.shuffle(children)
            for c in children:
                stack.append(c)
    return assignment

def bottom_up_merge(tree, max_table_size, rng=None):
    """Bottom-up merge: partition subtree leaves into tables via bin-packing."""
    if rng is None:
        rng = np.random.default_rng()
    leaves = tree.leaf_indices
    leaf_sizes = tree.sizes[leaves]
    n = tree.n_leaves
    assignment = np.full(n, -1, dtype=np.int32)
    leaf_map = {leaves[i]: i for i in range(n)}

    subtree_leaves = {}
    def get_leaves(node_idx):
        if node_idx in subtree_leaves:
            return subtree_leaves[node_idx]
        if tree.is_leaf[node_idx]:
            subtree_leaves[node_idx] = [leaf_map[node_idx]]
            return subtree_leaves[node_idx]
        result = []
        for c in tree.children[tree.ids[node_idx]]:
            result.extend(get_leaves(tree.id_to_idx[c]))
        subtree_leaves[node_idx] = result
        return result

    def partition(node_idx):
        gid = tree.ids[node_idx]
        if tree.is_leaf[node_idx]:
            return [[leaf_map[node_idx]]]
        children = [tree.id_to_idx[c] for c in tree.children[gid]]
        child_tables = []
        for c in children:
            child_tables.append(partition(c))
        all_tables = []
        for ct in child_tables:
            all_tables.extend(ct)
        rng.shuffle(all_tables)
        merged = []
        for tbl in all_tables:
            tbl_size = sum(leaf_sizes[i] for i in tbl)
            placed = False
            for m in merged:
                m_size = sum(leaf_sizes[i] for i in m)
                if m_size + tbl_size <= max_table_size:
                    m.extend(tbl)
                    placed = True
                    break
            if not placed:
                merged.append(list(tbl))
        return merged

    tables = partition(tree.id_to_idx[tree.root])
    for tid, tbl in enumerate(tables):
        for li in tbl:
            assignment[li] = tid
    return assignment


def largest_first_nn(tree, max_table_size, rng, leaf_dm=None):
    """Largest-first bin-packing with nearest-neighbor tiebreaking.
    Greedily fills each table starting with the largest unassigned leaf,
    then picks the largest fitting leaf closest to current table members.
    """
    n = tree.n_leaves
    leaf_sizes = tree.sizes[tree.leaf_indices].astype(int)
    if leaf_dm is None:
        dm = tree.precompute_dist_matrix()
        leaf_dm = dm[np.ix_(tree.leaf_indices, tree.leaf_indices)].astype(np.float64)

    assignment = np.full(n, -1, dtype=np.int32)
    assigned = np.zeros(n, dtype=bool)
    tid = 0

    while not assigned.all():
        remaining = np.where(~assigned)[0]
        first = remaining[np.argmax(leaf_sizes[remaining])]
        members = [first]
        people = int(leaf_sizes[first])
        assigned[first] = True
        assignment[first] = tid

        while people < max_table_size:
            cands = np.where(~assigned & (leaf_sizes <= max_table_size - people))[0]
            if len(cands) == 0:
                break
            # Primary: largest size, secondary: nearest to table
            best, best_key = None, (0, np.inf)
            for c in cands:
                min_d = min(leaf_dm[c, m] for m in members)
                key = (-leaf_sizes[c], min_d)
                if key < best_key:
                    best, best_key = c, key
            members.append(best)
            people += int(leaf_sizes[best])
            assigned[best] = True
            assignment[best] = tid
        tid += 1

    return assignment


def generate_initial_population(tree, max_table_size, pop_size, dist_matrix=None, proportions=None, rng=None):
    """Generate diverse initial population — assignments for leaf nodes only."""
    if rng is None:
        rng = np.random.default_rng()
    if proportions is None:
        proportions = {'random': 0.10, 'nearest_neighbor': 0.50, 'top_down': 0.10,
                       'bottom_up_merge': 0.30}
    if dist_matrix is None:
        dist_matrix = tree.precompute_dist_matrix()

    # Precompute leaf_dm once for all NN calls
    leaves = tree.leaf_indices
    leaf_dm = dist_matrix[np.ix_(leaves, leaves)].astype(np.float64)

    strategies = {
        'random': lambda: random_valid(tree, max_table_size, rng),
        'nearest_neighbor': lambda: nearest_neighbor(tree, max_table_size, rng, leaf_dm),
        'top_down': lambda: greedy_top_down(tree, max_table_size, rng),
        'bottom_up_merge': lambda: bottom_up_merge(tree, max_table_size, rng),
        'largest_first': lambda: largest_first_nn(tree, max_table_size, rng, leaf_dm),
    }
    # Add GNN initializer if model is available
    try:
        from gnn_model import gnn_initializer, SeatingGNN
        import torch, os
        if os.path.exists('gnn_model.pt'):
            _gnn = SeatingGNN()
            _gnn.load_state_dict(torch.load('gnn_model.pt', weights_only=True))
            strategies['gnn'] = lambda: gnn_initializer(tree, max_table_size, _gnn, rng, leaf_dm=leaf_dm)
    except Exception:
        pass
    population = np.zeros((pop_size, tree.n_leaves), dtype=np.int32)
    idx = 0
    for name, share in proportions.items():
        count = max(1, int(pop_size * share))
        fn = strategies.get(name, strategies['random'])
        for _ in range(count):
            if idx >= pop_size:
                break
            population[idx] = compact_tables(fn(), tree, max_table_size)
            idx += 1
    while idx < pop_size:
        population[idx] = compact_tables(random_valid(tree, max_table_size, rng), tree, max_table_size)
        idx += 1
    return population
