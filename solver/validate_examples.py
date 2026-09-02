"""Generate validated examples by instrumenting the real initializer functions."""
import numpy as np
from tree_distance import GuestTree
from initializers import (random_valid, nearest_neighbor, greedy_top_down,
                          bottom_up_merge, compact_tables)
from fitness import evaluate_population
from synthetic import generate_synthetic_tree

rng = np.random.default_rng(0)
g = generate_synthetic_tree(40, max_group_size=4, max_children=3, rng=rng)
tree = GuestTree(g)
dm = tree.precompute_dist_matrix()
C = 10
leaves = tree.leaf_indices
leaf_ids = [tree.ids[l] for l in leaves]
leaf_sizes = tree.sizes[leaves]
leaf_dm = dm[np.ix_(leaves, leaves)]

def show_result(name, a):
    a_c = compact_tables(a, tree, C)
    F = evaluate_population(a_c.reshape(1, -1), tree, C, dist_matrix=dm)[0]
    nt_raw = len(np.unique(a))
    nt = len(np.unique(a_c))
    print(f"  Result: {nt_raw} tables raw, {nt} after compaction, penalty={F[1]:.1f}")
    for t in sorted(np.unique(a_c)):
        m = np.where(a_c == t)[0]
        ids = [leaf_ids[i] for i in m]
        sizes = [int(leaf_sizes[i]) for i in m]
        print(f"    Table {t+1}: leaves {ids}, sizes {sizes}, total={sum(sizes)}")
    print()

# ============================================================
print("=" * 60)
print("RANDOM VALID (seed=0)")
print("=" * 60)
# Run the REAL function
a_rand = random_valid(tree, C, np.random.default_rng(0))
show_result("random", a_rand)

# ============================================================
print("=" * 60)
print("NEAREST-NEIGHBOR (seed=0)")
print("=" * 60)
a_nn = nearest_neighbor(tree, C, np.random.default_rng(0))
show_result("nearest_neighbor", a_nn)

# ============================================================
print("=" * 60)
print("TOP-DOWN (deterministic)")
print("=" * 60)
a_td = greedy_top_down(tree, C, np.random.default_rng(0))
show_result("top_down", a_td)

# ============================================================
print("=" * 60)
print("BOTTOM-UP MERGE (deterministic)")
print("=" * 60)
a_dp = bottom_up_merge(tree, C, np.random.default_rng(0))
show_result("bottom_up_merge", a_dp)
