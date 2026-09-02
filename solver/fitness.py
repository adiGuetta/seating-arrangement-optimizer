"""Fitness evaluation — only leaf nodes (actual guests) are evaluated."""
import numpy as np
from concurrent.futures import ThreadPoolExecutor

def _prepare_leaf_dm(tree, dist_matrix):
    if dist_matrix is None:
        dist_matrix = tree.precompute_dist_matrix()
    leaves = tree.leaf_indices
    leaf_dm = dist_matrix[np.ix_(leaves, leaves)].astype(np.float64)
    big = float(leaf_dm.max() + 1)
    with np.errstate(divide='ignore'):
        inv_dm = np.where(leaf_dm > 0, 1.0 / leaf_dm, 0.0)
    return leaf_dm, big, inv_dm

def _eval_one(args):
    """Evaluate a single assignment — designed for thread pool."""
    a, leaf_dm, big, inv_dm, alpha, p = args
    same = (a[:, None] == a[None, :])
    np.fill_diagonal(same, False)
    masked_dm = np.where(same, leaf_dm, big)
    min_dists = masked_dm.min(axis=1)
    alone = ~same.any(axis=1)
    min_dists[alone] = leaf_dm[alone].max(axis=1)
    total_loneliness = np.sum(min_dists ** p)
    total_cohesion = np.sum(same * inv_dm)
    return len(np.unique(a)), alpha * total_loneliness - total_cohesion

# Thread pool — configurable per request
_pool = ThreadPoolExecutor(max_workers=8)

def set_max_workers(n):
    """Reconfigure the global thread pool size."""
    global _pool
    _pool.shutdown(wait=False)
    _pool = ThreadPoolExecutor(max_workers=max(1, n))

def evaluate_population(assignments, tree, max_table_size, alpha=2.0, p=2.0, dist_matrix=None):
    """Evaluate fitness for a population of assignments (parallelized).
    assignments: (pop_size, n_leaves) array of table IDs for leaf nodes only.
    Returns: (pop_size, 2) array — [num_tables, combined_penalty].
    """
    leaf_dm, big, inv_dm = _prepare_leaf_dm(tree, dist_matrix)
    pop_size = assignments.shape[0]
    results = np.zeros((pop_size, 2))

    args = [(assignments[k], leaf_dm, big, inv_dm, alpha, p) for k in range(pop_size)]
    for k, (nt, penalty) in enumerate(_pool.map(_eval_one, args)):
        results[k, 0] = nt
        results[k, 1] = penalty
    return results

def evaluate_phase2(assignments, tree, max_table_size, p=2.0, dist_matrix=None):
    """Phase 2: fixed tables, two objectives: loneliness and -cohesion."""
    leaf_dm, big, inv_dm = _prepare_leaf_dm(tree, dist_matrix)
    pop_size, n = assignments.shape
    results = np.zeros((pop_size, 2))
    for k in range(pop_size):
        a = assignments[k]
        same = (a[:, None] == a[None, :])
        np.fill_diagonal(same, False)
        masked_dm = np.where(same, leaf_dm, big)
        min_dists = masked_dm.min(axis=1)
        alone = ~same.any(axis=1)
        min_dists[alone] = leaf_dm[alone].max(axis=1)
        results[k, 0] = np.sum(min_dists ** p)
        results[k, 1] = -np.sum(same * inv_dm)
    return results

def is_valid(assignment, tree, max_table_size):
    """Check if assignment respects table size constraints."""
    leaf_sizes = tree.sizes[tree.leaf_indices]
    tables = np.unique(assignment)
    for t in tables:
        members = np.where(assignment == t)[0]
        if leaf_sizes[members].sum() > max_table_size:
            return False
    return True

def weighted_pareto_score(F, max_extra_tables=5):
    """Weighted sum across table counts on the Pareto front."""
    if F is None or len(F) == 0:
        return float('inf')
    min_t = int(F[:, 0].min())
    total = 0.0
    total_weight = 0.0
    for delta in range(max_extra_tables + 1):
        nt = min_t + delta
        weight = max_extra_tables + 1 - delta
        mask = F[:, 0] == nt
        if mask.any():
            total += weight * float(F[mask, 1].min())
        else:
            total += weight * float(F[:, 1].max())
        total_weight += weight
    return total / total_weight
