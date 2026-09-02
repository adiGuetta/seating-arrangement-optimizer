"""Guest tree data structure with O(1) LCA distance via Euler tour + sparse table."""
import numpy as np
from math import log2

class GuestTree:
    def __init__(self, groups):
        """groups: list of dicts with id, size, parent_id (0=root), and optional edge_weight."""
        self.groups = {g['id']: g for g in groups}
        self.n = len(groups)
        self.ids = sorted(self.groups.keys())
        self.id_to_idx = {gid: i for i, gid in enumerate(self.ids)}
        self.sizes = np.array([self.groups[gid]['size'] for gid in self.ids])
        self.children = {gid: [] for gid in self.ids}
        self.root = None
        for g in groups:
            if g['parent_id'] == 0:
                self.root = g['id']
            else:
                self.children[g['parent_id']].append(g['id'])
        self.depth = np.zeros(self.n, dtype=np.int32)
        self.weighted_depth = np.zeros(self.n, dtype=np.float64)
        self.is_leaf = np.array([len(self.children[gid]) == 0 for gid in self.ids])
        self.leaf_indices = np.where(self.is_leaf)[0]
        self.n_leaves = len(self.leaf_indices)
        self._build_euler_tour()
        self._build_sparse_table()

    def _build_euler_tour(self):
        self.euler = []
        self.first_occurrence = np.zeros(self.n, dtype=np.int32)
        self.euler_depth = []
        visited = np.zeros(self.n, dtype=bool)
        stack = [(self.root, 0, 0.0, False)]
        while stack:
            node, d, wd, returning = stack.pop()
            idx = self.id_to_idx[node]
            self.euler.append(idx)
            self.euler_depth.append(d)
            if not visited[idx]:
                visited[idx] = True
                self.first_occurrence[idx] = len(self.euler) - 1
                self.depth[idx] = d
                self.weighted_depth[idx] = wd
            if not returning:
                for child in reversed(self.children[node]):
                    w = self.groups[child].get('edge_weight', 1.0)
                    stack.append((node, d, wd, True))
                    stack.append((child, d + 1, wd + w, False))
        self.euler = np.array(self.euler)
        self.euler_depth = np.array(self.euler_depth)

    def _build_sparse_table(self):
        m = len(self.euler_depth)
        if m == 0:
            self.sparse = np.zeros((0, 0), dtype=np.int32)
            self.log = 0
            return
        self.log = max(1, int(log2(m)) + 1)
        self.sparse = np.zeros((self.log, m), dtype=np.int32)
        self.sparse[0] = np.arange(m)
        for k in range(1, self.log):
            half = 1 << (k - 1)
            for i in range(m - (1 << k) + 1):
                l, r = self.sparse[k-1][i], self.sparse[k-1][i + half]
                self.sparse[k][i] = l if self.euler_depth[l] <= self.euler_depth[r] else r

    def lca_idx(self, i, j):
        """LCA of two group indices (not IDs)."""
        l, r = self.first_occurrence[i], self.first_occurrence[j]
        if l > r:
            l, r = r, l
        length = r - l + 1
        k = int(log2(length))
        left, right = self.sparse[k][l], self.sparse[k][r - (1 << k) + 1]
        return self.euler[left] if self.euler_depth[left] <= self.euler_depth[right] else self.euler[right]

    def dist(self, i, j):
        """Weighted distance between group indices i and j."""
        if i == j:
            return 0.0
        lca = self.lca_idx(i, j)
        return self.weighted_depth[i] + self.weighted_depth[j] - 2 * self.weighted_depth[lca]

    def precompute_dist_matrix(self):
        """Precompute full NxN weighted distance matrix — vectorized."""
        n = self.n
        fo = self.first_occurrence
        ii, jj = np.triu_indices(n, k=1)
        l = np.minimum(fo[ii], fo[jj])
        r = np.maximum(fo[ii], fo[jj])
        length = r - l + 1
        k = np.floor(np.log2(length)).astype(np.int32)
        left_idx = self.sparse[k, l]
        right_idx = self.sparse[k, r - (1 << k) + 1]
        lca_nodes = np.where(
            self.euler_depth[left_idx] <= self.euler_depth[right_idx],
            self.euler[left_idx],
            self.euler[right_idx]
        )
        dists = self.weighted_depth[ii] + self.weighted_depth[jj] - 2 * self.weighted_depth[lca_nodes]
        D = np.zeros((n, n), dtype=np.float64)
        D[ii, jj] = dists
        D[jj, ii] = dists
        return D
