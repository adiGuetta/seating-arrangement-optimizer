"""Evolutionary operators — work on leaf-only assignments. Optimized with precomputed leaf data."""
import numpy as np

def repair(assignment, leaf_sizes, leaf_dm, max_table_size):
    """Fix tables exceeding max_table_size."""
    a = assignment.copy()
    n = len(a)
    for _ in range(n):
        max_tid = a.max() + 1
        table_people = np.bincount(a, weights=leaf_sizes, minlength=max_tid)
        violated = np.where(table_people > max_table_size)[0]
        if len(violated) == 0:
            break
        t = violated[0]
        members = np.where(a == t)[0]
        if len(members) == 1:
            worst_idx = members[0]
        else:
            sub_dm = leaf_dm[np.ix_(members, members)].copy()
            np.fill_diagonal(sub_dm, 1)
            cohesions = np.sum(1.0 / sub_dm, axis=1) - 1.0
            worst_idx = members[cohesions.argmin()]
        room = max_table_size - table_people
        room[t] = -1
        valid_tables = np.where(room >= leaf_sizes[worst_idx])[0]
        if len(valid_tables) > 0:
            dists_to_tables = np.full(max_tid, np.inf)
            for t2 in valid_tables:
                m2 = np.where(a == t2)[0]
                if len(m2) > 0:
                    dists_to_tables[t2] = leaf_dm[worst_idx, m2].min()
            a[worst_idx] = dists_to_tables.argmin()
        else:
            a[worst_idx] = max_tid
    return a

def mutate(assignment, leaf_sizes, leaf_dm, max_table_size, rng, probs=None,
           min_tables=None, max_extra_tables=5):
    if probs is None:
        probs = [0.40, 0.40, 0.05, 0.05, 0.10]
    a = assignment.copy()
    n = len(a)
    if min_tables is None:
        min_tables = int(np.ceil(leaf_sizes.sum() / max_table_size))
    max_t = min_tables + max_extra_tables

    max_tid = a.max() + 1
    table_people = np.bincount(a, weights=leaf_sizes, minlength=max_tid)
    n_tables = np.count_nonzero(table_people)

    choice = rng.choice(5, p=probs)

    if choice == 0:  # Random swap
        i, j = rng.choice(n, 2, replace=False)
        if a[i] != a[j]:
            ti, tj = a[i], a[j]
            if (table_people[ti] - leaf_sizes[i] + leaf_sizes[j] <= max_table_size and
                table_people[tj] - leaf_sizes[j] + leaf_sizes[i] <= max_table_size):
                a[i], a[j] = a[j], a[i]
    elif choice == 1:  # Random move
        i = rng.integers(n)
        active = np.where(table_people > 0)[0]
        candidates = active[active != a[i]]
        if len(candidates) > 0:
            t = rng.choice(candidates)
            if table_people[t] + leaf_sizes[i] <= max_table_size:
                a[i] = t
    elif choice == 2:  # Split table
        if n_tables < max_t:
            active = np.where(table_people > 0)[0]
            t = rng.choice(active)
            members = np.where(a == t)[0]
            if len(members) > 1:
                split_point = rng.integers(1, len(members))
                rng.shuffle(members)
                new_table = max_tid
                for m in members[split_point:]:
                    a[m] = new_table
        else:
            a = _do_merge(a, leaf_sizes, max_table_size)
    elif choice == 3:  # Merge
        a = _do_merge(a, leaf_sizes, max_table_size)
    else:  # Nearest-neighbor move
        i = rng.integers(n)
        neighbors = np.argsort(leaf_dm[i])
        for nb in neighbors[1:]:
            if a[nb] != a[i]:
                if table_people[a[nb]] + leaf_sizes[i] <= max_table_size:
                    a[i] = a[nb]
                    break
    return a

def _do_merge(a, leaf_sizes, max_table_size):
    max_tid = a.max() + 1
    table_people = np.bincount(a, weights=leaf_sizes, minlength=max_tid)
    active = np.where(table_people > 0)[0]
    if len(active) >= 2:
        sizes = table_people[active]
        order = np.argsort(sizes)
        t1, s1 = active[order[0]], sizes[order[0]]
        t2, s2 = active[order[1]], sizes[order[1]]
        if s1 + s2 <= max_table_size:
            a[a == t2] = t1
    return a

def crossover(parent_a, parent_b, tree, leaf_sizes, leaf_dm, max_table_size, rng):
    """Subtree-swap crossover with lightweight repair."""
    leaves = tree.leaf_indices

    # Pick a random subtree — use boolean array instead of set
    root_idx = rng.integers(tree.n)
    in_subtree = np.zeros(tree.n, dtype=bool)
    stack = [root_idx]
    while stack:
        node = stack.pop()
        in_subtree[node] = True
        gid = tree.ids[node]
        for c in tree.children[gid]:
            stack.append(tree.id_to_idx[c])
    subtree_leaf_mask = in_subtree[leaves]

    child = parent_b.copy()
    offset = parent_a.max() + parent_b.max() + 1
    child[subtree_leaf_mask] = parent_a[subtree_leaf_mask] + offset
    child = _renumber(child)

    # Smart repair: redistribute small tables
    max_tid = child.max() + 1
    table_people = np.bincount(child, weights=leaf_sizes, minlength=max_tid)
    half_cap = max_table_size * 0.5
    small_tables = np.where((table_people > 0) & (table_people < half_cap))[0]

    if len(small_tables) > 0:
        small_tables = small_tables[np.argsort(table_people[small_tables])]
        for t in small_tables:
            members = np.where(child == t)[0]
            if len(members) == 0:
                continue
            for m in sorted(members, key=lambda x: leaf_sizes[x]):
                if child[m] != t:
                    continue
                cur_people = np.bincount(child, weights=leaf_sizes, minlength=max(child.max()+1, max_tid))
                room = max_table_size - cur_people
                room[t] = -1
                valid = np.where(room >= leaf_sizes[m])[0]
                if len(valid) == 0:
                    continue
                best_t = -1
                best_coh = -np.inf
                for t2 in valid:
                    t2m = np.where(child == t2)[0]
                    coh = float(np.sum(1.0 / np.maximum(leaf_dm[m, t2m], 1)))
                    if coh > best_coh:
                        best_coh = coh
                        best_t = t2
                if best_t >= 0:
                    child[m] = best_t

    child = repair(child, leaf_sizes, leaf_dm, max_table_size)
    return child

def _renumber(assignment):
    mapping = {}
    next_id = 0
    result = np.zeros_like(assignment)
    for i, t in enumerate(assignment):
        if t not in mapping:
            mapping[t] = next_id
            next_id += 1
        result[i] = mapping[t]
    return result
