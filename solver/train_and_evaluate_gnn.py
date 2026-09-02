#!/usr/bin/env python3.10
"""Train GNN and evaluate its contribution. Usage:
  Step 1 (train GNN):  python3.10 train_and_evaluate_gnn.py --step 1   (~47 min)
  Step 2 (evaluate):   python3.10 train_and_evaluate_gnn.py --step 2   (~60 min)
"""
import numpy as np
import json
import time
import argparse

SEED = 12345

def log(msg=""):
    print(msg, flush=True)


def step1():
    """Train the GNN model."""
    from gnn_model import train_gnn
    log("=" * 60)
    log("STEP 1: Train GNN (min-table targets, parallel)")
    log("=" * 60)
    t0 = time.time()
    train_gnn(n_trees=1500, epochs=200, lr=5e-4)
    log(f"Training complete in {time.time()-t0:.0f}s")
    log("Run: python3.10 train_and_evaluate_gnn.py --step 2")


def step2():
    """Evaluate GNN: init quality + EA convergence with proper statistics."""
    from scipy import stats
    from tree_distance import GuestTree
    from synthetic import generate_synthetic_tree
    from optimizer import run_optimization
    from initializers import (nearest_neighbor, bottom_up_merge, greedy_top_down,
                              random_valid, compact_tables)
    from gnn_model import gnn_initializer, SeatingGNN
    from fitness import evaluate_population, weighted_pareto_score
    import torch

    log("=" * 60)
    log("STEP 2: GNN Evaluation")
    log("=" * 60)

    # Use the same large tree as run_all.py (Section 6 benchmark)
    rng = np.random.default_rng(42)
    groups = generate_synthetic_tree(800, max_group_size=4, max_children=4, rng=rng)
    tree = GuestTree(groups)
    C = 10
    dm = tree.precompute_dist_matrix()
    leaf_sizes = tree.sizes[tree.leaf_indices]
    min_t = int(np.ceil(leaf_sizes.sum() / C))
    log(f"Tree: {tree.n_leaves} leaves, {int(leaf_sizes.sum())} people, C={C}, min_tables={min_t}")

    # Load tuning results for best config
    with open('tuning_results.json') as f:
        tuning = json.load(f)
    best = tuning['best_config']
    log(f"Best config from tuning: init={best['init']}, mutation={best['mutation']}, pop={best['pop_size']}")

    # ================================================================
    # Part A: Init quality comparison (no EA, 500 samples each)
    # ================================================================
    log(f"\n{'='*60}")
    log("PART A: Init quality (500 samples, no EA)")
    log(f"{'='*60}")

    model = SeatingGNN()
    model.load_state_dict(torch.load('gnn_model.pt', weights_only=True))

    init_methods = {
        'random': lambda rng: random_valid(tree, C, rng),
        'nearest_neighbor': lambda rng: nearest_neighbor(tree, C, rng),
        'top_down': lambda rng: greedy_top_down(tree, C, rng),
        'bottom_up_merge': lambda rng: bottom_up_merge(tree, C, rng),
        'gnn': lambda rng: gnn_initializer(tree, C, model, rng),
    }

    n_samples = 500
    init_results = {}
    for name, fn in init_methods.items():
        penalties_at_min = []
        all_tables = []
        t0 = time.time()
        for i in range(n_samples):
            a = compact_tables(fn(np.random.default_rng(i)), tree, C)
            F = evaluate_population(a.reshape(1, -1), tree, C, dist_matrix=dm)[0]
            all_tables.append(int(F[0]))
            if int(F[0]) == min_t:
                penalties_at_min.append(float(F[1]))
        elapsed = time.time() - t0
        hit_rate = len(penalties_at_min) / n_samples
        avg_p = np.mean(penalties_at_min) if penalties_at_min else float('inf')
        init_results[name] = {'hit_rate': hit_rate, 'avg_penalty': avg_p,
                              'avg_tables': np.mean(all_tables), 'time_ms': elapsed / n_samples * 1000}
        log(f"  {name:20s}: hit={len(penalties_at_min):3d}/{n_samples} ({hit_rate:.1%}), "
            f"penalty@min={avg_p:8.0f}, avg_tables={np.mean(all_tables):.1f}, "
            f"{init_results[name]['time_ms']:.1f}ms/sample")

    # ================================================================
    # Part B: EA convergence (30 runs, with and without GNN)
    # ================================================================
    log(f"\n{'='*60}")
    log("PART B: EA convergence (30 runs each, t-test)")
    log(f"{'='*60}")

    n_runs = 30
    pop_size = best['pop_size']
    n_gen = 150

    # Use best init config from tuning
    init_no_gnn = {k: v for k, v in best['init_cfg'].items() if k != 'gnn'}
    total_w = sum(init_no_gnn.values())
    init_no_gnn = {k: v / total_w for k, v in init_no_gnn.items()}

    init_with_gnn = dict(best['init_cfg'])

    mutation_probs = best['mutation_cfg']

    ea_results = {}
    for label, props in [("no_gnn", init_no_gnn), ("with_gnn", init_with_gnn)]:
        log(f"\n--- {label} (pop={pop_size}, gen={n_gen}) ---")
        penalties = []
        wpss = []
        for run in range(n_runs):
            r = run_optimization(tree, C, pop_size=pop_size, n_gen=n_gen,
                                 proportions=props, mutation_probs=mutation_probs,
                                 converge_tol=0)
            mask = r.F[:, 0] == min_t
            p = float(r.F[mask, 1].min()) if mask.any() else float('inf')
            wps = float(weighted_pareto_score(r.F))
            penalties.append(p)
            wpss.append(wps)
            if (run + 1) % 10 == 0:
                log(f"  [{run+1}/{n_runs}] avg penalty@{min_t}={np.mean(penalties):.0f} ± {np.std(penalties):.0f}")

        ea_results[label] = {'penalties': penalties, 'wpss': wpss}
        log(f"  {label}: penalty@{min_t}={np.mean(penalties):.0f} ± {np.std(penalties):.0f}, "
            f"wps={np.mean(wpss):.0f} ± {np.std(wpss):.0f}")

    # Statistical test
    p_no = ea_results['no_gnn']['penalties']
    p_gnn = ea_results['with_gnn']['penalties']
    # Filter out inf
    p_no_f = [x for x in p_no if x != float('inf')]
    p_gnn_f = [x for x in p_gnn if x != float('inf')]

    log(f"\n{'='*60}")
    log("RESULTS")
    log(f"{'='*60}")
    log(f"  no_gnn:   penalty@{min_t} = {np.mean(p_no_f):.0f} ± {np.std(p_no_f):.0f} "
        f"({len(p_no_f)}/{n_runs} hit min tables)")
    log(f"  with_gnn: penalty@{min_t} = {np.mean(p_gnn_f):.0f} ± {np.std(p_gnn_f):.0f} "
        f"({len(p_gnn_f)}/{n_runs} hit min tables)")

    if len(p_no_f) >= 5 and len(p_gnn_f) >= 5:
        t_stat, p_value = stats.ttest_ind(p_no_f, p_gnn_f)
        delta = np.mean(p_no_f) - np.mean(p_gnn_f)
        pct = delta / np.mean(p_no_f) * 100
        log(f"  Delta: {delta:+.0f} ({pct:+.1f}%)")
        log(f"  t-test: t={t_stat:.2f}, p={p_value:.4f}")
        log(f"  Significant at 5%? {'YES' if p_value < 0.05 else 'NO'}")
    else:
        log(f"  Not enough valid runs for t-test")

    w_no = ea_results['no_gnn']['wpss']
    w_gnn = ea_results['with_gnn']['wpss']
    t2, p2 = stats.ttest_ind(w_no, w_gnn)
    log(f"\n  WPS: no_gnn={np.mean(w_no):.0f}±{np.std(w_no):.0f}, "
        f"with_gnn={np.mean(w_gnn):.0f}±{np.std(w_gnn):.0f}")
    log(f"  WPS t-test: t={t2:.2f}, p={p2:.4f}, significant={'YES' if p2 < 0.05 else 'NO'}")

    # Save all results
    output = {
        'tree': {'n_leaves': tree.n_leaves, 'total_people': int(leaf_sizes.sum()),
                 'C': C, 'min_tables': min_t},
        'best_config': best,
        'init_quality': init_results,
        'ea_results': {k: {'penalties': v['penalties'], 'wpss': v['wpss']}
                       for k, v in ea_results.items()},
    }
    with open('gnn_eval_results.json', 'w') as f:
        json.dump(output, f, indent=2)
    log(f"\nResults saved to gnn_eval_results.json")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--step', type=int, required=True, choices=[1, 2])
    args = parser.parse_args()
    if args.step == 1:
        step1()
    else:
        step2()
