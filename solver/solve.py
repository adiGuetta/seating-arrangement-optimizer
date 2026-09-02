#!/usr/bin/env python3.10
"""Production entry point for seating arrangement optimization.

Usage:
    from solve import solve
    pareto_front = solve(guest_groups, table_capacity=10)

    # Or from CLI:
    python3.10 solve.py example    # Run on example tree
"""
import numpy as np
import time

from tree_distance import GuestTree
from optimizer import run_optimization
from fitness import weighted_pareto_score


def solve(groups, table_capacity=10, pop_size=100, alpha=2.0, p=2.0, verbose=False):
    """Optimize seating for a guest tree.

    Args:
        groups: list of dicts with 'id', 'size', 'parent_id'.
                Leaves (no children) are guest groups; internal nodes have size=0.
        table_capacity: max people per table.
        pop_size: EA population size (200=best quality, 50=4x faster).
        verbose: print progress.

    Returns:
        list of dicts, one per Pareto-optimal solution, sorted by table count:
        [{'tables': int, 'penalty': float, 'assignment': {leaf_id: table_id}}]

    Stops on convergence (<0.5% improvement over 20 generations) or after 10 minutes.
    Typical runtime: ~50s for 400 leaves (pop=100), ~20s (pop=50).
    """
    tree = GuestTree(groups)
    leaf_sizes = tree.sizes[tree.leaf_indices]
    total = int(leaf_sizes.sum())
    min_t = int(np.ceil(total / table_capacity))

    if verbose:
        print(f"Tree: {tree.n_leaves} leaves, {total} people, C={table_capacity}, "
              f"min_tables={min_t}", flush=True)

    proportions = {'random': 0.10, 'nearest_neighbor': 0.40,
                   'top_down': 0.10, 'bottom_up_merge': 0.20, 'gnn': 0.10,
                   'largest_first': 0.10}
    mutation_probs = [0.05, 0.05, 0.15, 0.15, 0.60]

    t0 = time.time()
    result = run_optimization(tree, table_capacity, alpha=alpha, p=p,
                              pop_size=pop_size, n_gen=250,
                              proportions=proportions, mutation_probs=mutation_probs,
                              max_time=600, min_tables=min_t)
    elapsed = time.time() - t0

    if result.F is None or len(result.F) == 0:
        return []

    # Build Pareto front: best penalty per table count
    leaf_ids = [tree.ids[l] for l in tree.leaf_indices]
    front = {}
    for i in range(len(result.F)):
        nt = int(result.F[i, 0])
        penalty = float(result.F[i, 1])
        if nt not in front or penalty < front[nt]['penalty']:
            assignment = {}
            a = result.X[i].astype(int)
            for li, lid in enumerate(leaf_ids):
                assignment[lid] = int(a[li])
            front[nt] = {'tables': nt, 'penalty': penalty, 'assignment': assignment}

    solutions = sorted(front.values(), key=lambda s: s['tables'])

    if verbose:
        print(f"Done in {elapsed:.0f}s", flush=True)
        for s in solutions:
            marker = " (min)" if s['tables'] == min_t else ""
            print(f"  {s['tables']} tables: penalty={s['penalty']:.0f}{marker}", flush=True)

    return solutions


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'example':
        from synthetic import generate_synthetic_tree
        groups = generate_synthetic_tree(1000, max_group_size=4, max_children=3,
                                         rng=np.random.default_rng(42))
        solutions = solve(groups, table_capacity=10, verbose=True)
    else:
        print("Usage: python3.10 solve.py example")
