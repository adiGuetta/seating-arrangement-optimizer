"""Generate synthetic guest trees for testing."""
import numpy as np

def generate_synthetic_tree(n_groups, max_group_size=4, max_children=5, rng=None):
    """Generate a random guest tree.
    Only leaf nodes get nonzero size (actual guests). Internal nodes are logical categories.
    Returns list of group dicts.
    """
    if rng is None:
        rng = np.random.default_rng()
    groups = []
    # First pass: build tree structure
    groups.append({'id': 1, 'size': 0, 'parent_id': 0})
    for i in range(2, n_groups + 1):
        parent = rng.integers(1, i)
        children_count = sum(1 for g in groups if g['parent_id'] == parent)
        if children_count >= max_children:
            parent = rng.integers(1, i)
        groups.append({'id': i, 'size': 0, 'parent_id': parent})
    # Second pass: identify leaves and assign sizes only to them
    all_ids = {g['id'] for g in groups}
    parents = {g['parent_id'] for g in groups if g['parent_id'] != 0}
    for g in groups:
        if g['id'] not in parents:  # leaf
            g['size'] = int(rng.integers(1, max_group_size + 1))
        else:
            g['size'] = 0
    return groups

def generate_varied_trees(n_examples=100, rng=None):
    """Generate diverse set of trees with varying sizes and shapes."""
    if rng is None:
        rng = np.random.default_rng(42)
    examples = []
    for i in range(n_examples):
        # Vary tree size
        n_groups = rng.integers(20, 120)
        max_group_size = rng.choice([2, 3, 4, 5])
        max_children = rng.choice([2, 3, 4, 6, 8])
        max_table_size = rng.choice([8, 10, 12])
        groups = generate_synthetic_tree(n_groups, max_group_size, max_children, rng)
        examples.append({
            'groups': groups,
            'max_table_size': max_table_size,
            'n_groups': n_groups,
            'max_group_size': max_group_size,
            'max_children': max_children,
        })
    return examples
