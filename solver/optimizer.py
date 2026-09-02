"""NSGA-II integration with pymoo — leaf-only assignments."""
import numpy as np
import time
from pymoo.core.problem import Problem
from pymoo.core.sampling import Sampling
from pymoo.core.mutation import Mutation
from pymoo.core.crossover import Crossover
from pymoo.core.callback import Callback
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.optimize import minimize
from pymoo.termination.max_gen import MaximumGenerationTermination

from tree_distance import GuestTree
from fitness import evaluate_population, evaluate_phase2
from initializers import generate_initial_population, compact_tables
from operators import mutate, crossover as subtree_crossover, repair

class SeatingProblem(Problem):
    def __init__(self, tree, max_table_size, alpha=2.0, p=2.0, dist_matrix=None, phase=1):
        self.tree = tree
        self.max_table_size = max_table_size
        self.alpha = alpha
        self.p = p
        self.dist_matrix = dist_matrix if dist_matrix is not None else tree.precompute_dist_matrix()
        self.phase = phase
        super().__init__(n_var=tree.n_leaves, n_obj=2, n_constr=0, xl=0, xu=tree.n_leaves)

    def _evaluate(self, X, out, *args, **kwargs):
        X = X.astype(np.int32)
        if self.phase == 1:
            out["F"] = evaluate_population(X, self.tree, self.max_table_size, self.alpha, self.p, self.dist_matrix)
        else:
            out["F"] = evaluate_phase2(X, self.tree, self.max_table_size, self.p, self.dist_matrix)

class SeatingSampling(Sampling):
    def __init__(self, tree, max_table_size, dist_matrix, proportions=None):
        super().__init__()
        self.tree = tree
        self.max_table_size = max_table_size
        self.dist_matrix = dist_matrix
        self.proportions = proportions

    def _do(self, problem, n_samples, **kwargs):
        return generate_initial_population(
            self.tree, self.max_table_size, n_samples,
            self.dist_matrix, self.proportions
        )

class SeatingMutation(Mutation):
    def __init__(self, tree, max_table_size, dist_matrix, mutation_probs=None):
        super().__init__()
        self.tree = tree
        self.max_table_size = max_table_size
        self.dist_matrix = dist_matrix
        self.mutation_probs = mutation_probs
        self.rng = np.random.default_rng()
        # Precompute leaf data
        leaves = tree.leaf_indices
        self.leaf_sizes = tree.sizes[leaves].astype(np.float64)
        self.leaf_dm = dist_matrix[np.ix_(leaves, leaves)].astype(np.float64)
        self.min_tables = int(np.ceil(self.leaf_sizes.sum() / max_table_size))

    def _do(self, problem, X, **kwargs):
        for i in range(len(X)):
            X[i] = mutate(X[i], self.leaf_sizes, self.leaf_dm, self.max_table_size,
                          self.rng, self.mutation_probs, self.min_tables)
        return X

class SeatingCrossover(Crossover):
    def __init__(self, tree, max_table_size, dist_matrix):
        super().__init__(n_parents=2, n_offsprings=2)
        self.tree = tree
        self.max_table_size = max_table_size
        self.dist_matrix = dist_matrix
        self.rng = np.random.default_rng()
        # Precompute leaf data
        leaves = tree.leaf_indices
        self.leaf_sizes = tree.sizes[leaves].astype(np.float64)
        self.leaf_dm = dist_matrix[np.ix_(leaves, leaves)].astype(np.float64)

    def _do(self, problem, X, **kwargs):
        n_matings = X.shape[1]
        Y = np.zeros_like(X)
        for i in range(n_matings):
            Y[0, i] = subtree_crossover(X[0, i], X[1, i], self.tree,
                                         self.leaf_sizes, self.leaf_dm,
                                         self.max_table_size, self.rng)
            Y[1, i] = subtree_crossover(X[1, i], X[0, i], self.tree,
                                         self.leaf_sizes, self.leaf_dm,
                                         self.max_table_size, self.rng)
        return Y


class GNNInjectionCallback(Callback):
    """Mid-run GNN transfer learning."""

    def __init__(self, tree, max_table_size, dist_matrix,
                 inject_every=30, n_inject=10, finetune_epochs=30, alpha=0.1):
        super().__init__()
        self.tree = tree
        self.max_table_size = max_table_size
        self.dist_matrix = dist_matrix
        self.inject_every = inject_every
        self.n_inject = n_inject
        self.finetune_epochs = finetune_epochs
        self.alpha = alpha
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            import torch, os
            from gnn_model import SeatingGNN
            if os.path.exists('gnn_model.pt'):
                self.model = SeatingGNN()
                self.model.load_state_dict(torch.load('gnn_model.pt', weights_only=True))
        except Exception:
            self.model = None

    def notify(self, algorithm):
        if self.model is None:
            return
        gen = algorithm.n_gen
        if gen < self.inject_every or gen % self.inject_every != 0:
            return

        pop = algorithm.pop
        X = pop.get("X").astype(np.int32)
        F = pop.get("F")

        min_tables = int(F[:, 0].min())
        min_mask = F[:, 0] == min_tables
        if not min_mask.any():
            return
        assignments = [(X[i], float(F[i, 1])) for i in range(len(X)) if min_mask[i]]

        from gnn_model import finetune_gnn, gnn_initializer
        ft_model = finetune_gnn(self.model, self.tree, self.max_table_size,
                                assignments, epochs=self.finetune_epochs)

        new_X = []
        for i in range(self.n_inject):
            a = compact_tables(
                gnn_initializer(self.tree, self.max_table_size, ft_model,
                                np.random.default_rng(gen * 1000 + i), self.alpha),
                self.tree, self.max_table_size)
            new_X.append(a)
        new_X = np.array(new_X, dtype=np.float64)

        new_F = evaluate_population(new_X.astype(np.int32), self.tree, self.max_table_size,
                                    dist_matrix=self.dist_matrix)

        pop_F = pop.get("F")
        for i in range(len(new_X)):
            nt = int(new_F[i, 0])
            same_nt = pop_F[:, 0] == nt
            if same_nt.any():
                worst_at_nt = np.where(same_nt)[0][pop_F[same_nt, 1].argmax()]
                if new_F[i, 1] < pop_F[worst_at_nt, 1]:
                    pop[worst_at_nt].set("X", new_X[i])
                    pop[worst_at_nt].set("F", new_F[i])

        self.model = ft_model


def run_optimization(tree, max_table_size, alpha=2.0, p=2.0, pop_size=100, n_gen=200,
                     proportions=None, mutation_probs=None, phase=1,
                     gnn_inject=False, inject_every=30, n_inject=10, inject_alpha=0.1,
                     max_time=None, converge_window=20, converge_tol=0.005,
                     min_tables=None):
    """Run NSGA-II optimization."""
    dist_matrix = tree.precompute_dist_matrix()
    problem = SeatingProblem(tree, max_table_size, alpha, p, dist_matrix, phase)

    algorithm = NSGA2(
        pop_size=pop_size,
        sampling=SeatingSampling(tree, max_table_size, dist_matrix, proportions),
        crossover=SeatingCrossover(tree, max_table_size, dist_matrix),
        mutation=SeatingMutation(tree, max_table_size, dist_matrix, mutation_probs),
    )

    from pymoo.termination.max_time import TimeBasedTermination
    from pymoo.termination.collection import TerminationCollection
    terms = [MaximumGenerationTermination(n_gen)]
    if max_time is not None:
        terms.append(TimeBasedTermination(max_time))
    termination = terms[0] if len(terms) == 1 else TerminationCollection(*terms)

    kwargs = dict(seed=42, verbose=False)
    if gnn_inject:
        kwargs['callback'] = GNNInjectionCallback(
            tree, max_table_size, dist_matrix,
            inject_every=inject_every, n_inject=n_inject, alpha=inject_alpha)

    if converge_tol <= 0:
        return minimize(problem, algorithm, termination, **kwargs)

    algorithm.setup(problem, termination=termination, **kwargs)
    best_history = []
    t0 = time.time()

    while algorithm.has_next():
        algorithm.next()
        F = algorithm.pop.get("F")
        best_penalty = float(F[:, 1].min())
        best_history.append(best_penalty)

        if len(best_history) >= converge_window:
            old = best_history[-converge_window]
            if old > 0 and (old - best_penalty) / abs(old) < converge_tol:
                if min_tables is None or int(F[:, 0].min()) <= min_tables:
                    break

        if max_time is not None and (time.time() - t0) >= max_time:
            break

    return algorithm.result()
