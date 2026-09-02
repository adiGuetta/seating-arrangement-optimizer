#!/usr/bin/env python3.10
"""Full pipeline: train GNN, tune hyperparameters, benchmark, generate figures + report.
Usage: python3.10 -u run_all.py [--skip-gnn-train]
"""
import numpy as np, json, time, sys, os, argparse
from multiprocessing import Pool
from tree_distance import GuestTree
from synthetic import generate_varied_trees, generate_synthetic_tree
from optimizer import (SeatingProblem, SeatingSampling, SeatingMutation, SeatingCrossover,
                       run_optimization)
from fitness import evaluate_population, weighted_pareto_score
from initializers import (random_valid, nearest_neighbor, greedy_top_down,
                          bottom_up_merge, compact_tables)
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.optimize import minimize
from pymoo.termination.max_gen import MaximumGenerationTermination
from pymoo.core.callback import Callback

os.makedirs('figures', exist_ok=True)
SEED = 42
N_CPUS = min(os.cpu_count(), 48)

# ============================================================
# Shared large tree
# ============================================================
rng_tree = np.random.default_rng(SEED)
LARGE_GROUPS = generate_synthetic_tree(800, max_group_size=4, max_children=4, rng=rng_tree)
LARGE_TREE = GuestTree(LARGE_GROUPS)
LARGE_DM = LARGE_TREE.precompute_dist_matrix()
LARGE_C = 10
LARGE_TOTAL = int(LARGE_TREE.sizes[LARGE_TREE.leaf_indices].sum())
LARGE_MIN_T = int(np.ceil(LARGE_TOTAL / LARGE_C))

# ============================================================
# Helpers
# ============================================================
def solve_one_tree_for_gnn(args):
    """Generate one tree, solve with EA, return training data."""
    seed, n_nodes, max_ts = args
    rng = np.random.default_rng(seed)
    groups = generate_synthetic_tree(n_nodes, max_group_size=5, max_children=4, rng=rng)
    tree = GuestTree(groups)
    if tree.n_leaves < 10:
        return None
    try:
        result = run_optimization(tree, max_ts, pop_size=50, n_gen=50)
        if result.F is None or len(result.F) == 0:
            return None
        best_idx = result.F[:, 1].argmin()
        best_a = result.X[best_idx].astype(np.int32)
        clean_groups = [{'id': int(g['id']), 'size': int(g['size']),
                         'parent_id': int(g['parent_id'])} for g in groups]
        return (clean_groups, int(max_ts), [int(x) for x in best_a.tolist()],
                int(tree.n_leaves), int(tree.sizes[tree.leaf_indices].sum()))
    except:
        return None

def run_config_tune(args):
    """Run one config on tuning examples."""
    name, pop_size, mut_probs, init_cfg, n_gen, examples = args
    scores = []
    for ex in examples:
        tree = GuestTree(ex['groups'])
        try:
            r = run_optimization(tree, ex['max_table_size'], pop_size=pop_size, n_gen=n_gen,
                                 proportions=init_cfg, mutation_probs=mut_probs)
            if r.F is not None and len(r.F) > 0:
                scores.append(weighted_pareto_score(r.F))
        except:
            pass
    return {'name': name, 'mean_wps': float(np.mean(scores)) if scores else float('inf'),
            'std_wps': float(np.std(scores)) if scores else 0,
            'n_valid': len(scores)}

class HistCB(Callback):
    def __init__(self, min_t, max_extra=5):
        super().__init__()
        self.per_table = {nt: [] for nt in range(min_t, min_t + max_extra + 1)}
        self.wps = []
        self.t0 = time.time()
        self.min_t = min_t
        self.max_extra = max_extra
    def notify(self, algo):
        F = algo.pop.get('F')
        t = time.time() - self.t0
        self.wps.append((algo.n_gen, t, weighted_pareto_score(F, self.max_extra)))
        for nt in range(self.min_t, self.min_t + self.max_extra + 1):
            mask = F[:, 0] == nt
            self.per_table[nt].append((algo.n_gen, t, float(F[mask, 1].min()) if mask.any() else None))

def run_large(name, pop_size, mut_probs, init_cfg, n_gen):
    """Run on large tree with history tracking."""
    cb = HistCB(LARGE_MIN_T)
    t0 = time.time()
    algo = NSGA2(pop_size=pop_size,
        sampling=SeatingSampling(LARGE_TREE, LARGE_C, LARGE_DM, init_cfg),
        crossover=SeatingCrossover(LARGE_TREE, LARGE_C, LARGE_DM),
        mutation=SeatingMutation(LARGE_TREE, LARGE_C, LARGE_DM, mut_probs))
    minimize(SeatingProblem(LARGE_TREE, LARGE_C, dist_matrix=LARGE_DM),
             algo, MaximumGenerationTermination(n_gen), seed=42, verbose=False, callback=cb)
    elapsed = time.time() - t0
    r = {'name': name, 'elapsed': elapsed, 'wps_history': cb.wps, 'per_table': {}}
    for nt in range(LARGE_MIN_T, LARGE_MIN_T + 6):
        vals = [d[2] for d in cb.per_table[nt] if d[2] is not None]
        r['per_table'][str(nt)] = {'final': vals[-1] if vals else None,
                                    'history': [(d[0], d[2]) for d in cb.per_table[nt]]}
    r['final_wps'] = cb.wps[-1][2] if cb.wps else None
    return r

# ============================================================
# MAIN
# ============================================================
parser = argparse.ArgumentParser()
parser.add_argument('--skip-gnn-train', action='store_true')
args = parser.parse_args()

print("=" * 70)
print(f"FULL PIPELINE — {LARGE_TREE.n_leaves} leaves, {LARGE_TOTAL} people, min_tables={LARGE_MIN_T}")
print(f"CPUs: {N_CPUS}")
print("=" * 70)
sys.stdout.flush()
t_total = time.time()

# ============================================================
# STEP 0: Train GNN
# ============================================================
if not args.skip_gnn_train:
    print("\n>>> STEP 0: Training GNN (1500 trees, parallel)")
    sys.stdout.flush()
    rng_gnn = np.random.default_rng(42)
    gnn_jobs = []
    for i in range(1500):
        n_nodes = int(rng_gnn.integers(30, 1000))
        max_ts = int(rng_gnn.choice([8, 10, 12]))
        gnn_jobs.append((i + 10000, n_nodes, max_ts))
    t0 = time.time()
    with Pool(N_CPUS) as pool:
        raw = pool.map(solve_one_tree_for_gnn, gnn_jobs)
    training_data = [r for r in raw if r is not None]
    print(f"  Generated {len(training_data)} examples in {time.time()-t0:.0f}s")
    sizes = [r[3] for r in training_data]
    print(f"  Leaf range: {min(sizes)}-{max(sizes)}")
    sys.stdout.flush()

    import torch
    from gnn_model import SeatingGNN, tree_to_pyg, contrastive_loss
    all_pyg = []
    for groups, max_ts, best_a_list, n_leaves, total_people in training_data:
        tree = GuestTree(groups)
        data = tree_to_pyg(tree, max_ts)
        data.target_assignment = np.array(best_a_list, dtype=np.int32)
        all_pyg.append(data)

    model = SeatingGNN()
    opt = torch.optim.Adam(model.parameters(), lr=5e-4, weight_decay=1e-5)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, 200)
    best_loss = float('inf')
    for epoch in range(200):
        total_loss = 0
        np.random.shuffle(all_pyg)
        model.train()
        for data in all_pyg:
            emb = model(data.x, data.edge_index)
            leaf_emb = emb[data.leaf_mask]
            loss = contrastive_loss(leaf_emb, data.target_assignment)
            opt.zero_grad(); loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            total_loss += loss.item()
        sched.step()
        avg = total_loss / len(all_pyg)
        if avg < best_loss:
            best_loss = avg
            torch.save(model.state_dict(), 'gnn_model.pt')
        if (epoch + 1) % 50 == 0:
            print(f"  Epoch {epoch+1}/200: loss={avg:.4f}, best={best_loss:.4f}")
            sys.stdout.flush()
    print(f"  GNN trained. Best loss: {best_loss:.4f}")
else:
    print("\n>>> STEP 0: Skipping GNN training (--skip-gnn-train)")
sys.stdout.flush()

# ============================================================
# STEP 1: Init config tuning
# ============================================================
print("\n>>> STEP 1: Init config tuning (200 examples, pop=50, gen=60)")
sys.stdout.flush()
TUNE_EXAMPLES = generate_varied_trees(200, rng=np.random.default_rng(99))
BASE_MUT = [0.40, 0.40, 0.05, 0.05, 0.10]
INIT_CFGS = {
    'balanced': {'random': 0.25, 'nearest_neighbor': 0.25, 'top_down': 0.25, 'bottom_up_merge': 0.25},
    'heavy_bu_merge': {'random': 0.10, 'nearest_neighbor': 0.10, 'top_down': 0.10, 'bottom_up_merge': 0.70},
    'bu_merge_nn_mix': {'random': 0.10, 'nearest_neighbor': 0.30, 'top_down': 0.10, 'bottom_up_merge': 0.40, 'gnn': 0.10},
    'heavy_nn': {'random': 0.10, 'nearest_neighbor': 0.50, 'top_down': 0.10, 'bottom_up_merge': 0.30},
    'all_random': {'random': 1.0},
    'lf_mix': {'random': 0.05, 'nearest_neighbor': 0.20, 'top_down': 0.05, 'bottom_up_merge': 0.30, 'gnn': 0.10, 'largest_first': 0.30},
    'lf_heavy': {'random': 0.05, 'nearest_neighbor': 0.15, 'top_down': 0.05, 'bottom_up_merge': 0.20, 'gnn': 0.05, 'largest_first': 0.50},
    'lf_light': {'random': 0.10, 'nearest_neighbor': 0.30, 'top_down': 0.10, 'bottom_up_merge': 0.30, 'gnn': 0.10, 'largest_first': 0.10},
}
init_jobs = [(f'init={k}', 50, BASE_MUT, v, 60, TUNE_EXAMPLES) for k, v in INIT_CFGS.items()]
t0 = time.time()
init_results = []
for job in init_jobs:
    r = run_config_tune(job)
    init_results.append(r)
    print(f"  {r['name']:35s} wps={r['mean_wps']:.0f} ± {r['std_wps']:.0f} ({r['n_valid']}/200)")
    sys.stdout.flush()
init_results.sort(key=lambda x: x['mean_wps'])
print(f"  Done in {time.time()-t0:.0f}s")
for r in init_results:
    print(f"  {r['name']:35s} wps={r['mean_wps']:.0f} ± {r['std_wps']:.0f} ({r['n_valid']}/200)")
best_init_name = init_results[0]['name'].replace('init=', '')
best_init = INIT_CFGS[best_init_name]
print(f"  >>> Best init: {best_init_name}")
sys.stdout.flush()

# ============================================================
# STEP 2: Mutation config tuning
# ============================================================
print("\n>>> STEP 2: Mutation config tuning (200 examples, pop=50, gen=60)")
sys.stdout.flush()
MUT_CFGS = {
    '40%swap+40%move': [0.40, 0.40, 0.05, 0.05, 0.10],
    '60%nn_move': [0.05, 0.05, 0.15, 0.15, 0.60],
    '40%nn+25%S+25%M': [0.05, 0.05, 0.25, 0.25, 0.40],
    '35%S+35%M': [0.10, 0.10, 0.35, 0.35, 0.10],
    'balanced': [0.20, 0.20, 0.20, 0.20, 0.20],
}
mut_jobs = [(f'mut={k}', 50, v, best_init, 60, TUNE_EXAMPLES) for k, v in MUT_CFGS.items()]
t0 = time.time()
mut_results = []
for job in mut_jobs:
    r = run_config_tune(job)
    mut_results.append(r)
    print(f"  {r['name']:35s} wps={r['mean_wps']:.0f} ± {r['std_wps']:.0f}")
    sys.stdout.flush()
mut_results.sort(key=lambda x: x['mean_wps'])
print(f"  Done in {time.time()-t0:.0f}s")
for r in mut_results:
    print(f"  {r['name']:35s} wps={r['mean_wps']:.0f} ± {r['std_wps']:.0f}")
best_mut_name = mut_results[0]['name'].replace('mut=', '')
best_mut = MUT_CFGS[best_mut_name]
print(f"  >>> Best mutation: {best_mut_name}")
sys.stdout.flush()

# ============================================================
# STEP 3: Population size tuning (on large tree)
# ============================================================
print("\n>>> STEP 3: Population size (large tree, 150 gen)")
sys.stdout.flush()
pop_results = []
for p in [30, 50, 100, 200]:
    r = run_large(f'pop={p}', p, best_mut, best_init, 150)
    pop_results.append(r)
    print(f"  pop={p}: wps={r['final_wps']:.0f}, time={r['elapsed']:.0f}s")
    sys.stdout.flush()
pop_results.sort(key=lambda x: x['final_wps'] or float('inf'))
best_pop = int(pop_results[0]['name'].replace('pop=', ''))
print(f"  >>> Best pop: {best_pop}")
sys.stdout.flush()

# ============================================================
# STEP 4: Convergence (best config, 500 gen)
# ============================================================
print("\n>>> STEP 4: Convergence (500 gen)")
sys.stdout.flush()
conv_result = run_large('best_config', best_pop, best_mut, best_init, 500)
print(f"  Done in {conv_result['elapsed']:.0f}s, final_wps={conv_result['final_wps']:.0f}")
wps_hist = conv_result['wps_history']
conv_gen = len(wps_hist)
for i in range(20, len(wps_hist)):
    if wps_hist[i-20][2] > 0 and (wps_hist[i-20][2] - wps_hist[i][2]) / wps_hist[i-20][2] < 0.005:
        conv_gen = i; break
print(f"  Convergence at ~gen {conv_gen}")
sys.stdout.flush()

# ============================================================
# STEP 5: GNN transfer learning
# ============================================================
print("\n>>> STEP 5: GNN transfer learning")
sys.stdout.flush()
try:
    import torch, shutil
    from gnn_model import SeatingGNN, gnn_initializer, finetune_gnn
    shutil.copy('gnn_model.pt', 'gnn_model_orig.pt')
    gnn = SeatingGNN()
    gnn.load_state_dict(torch.load('gnn_model.pt', weights_only=True))

    # Baseline: no GNN
    init_no_gnn = {k: v for k, v in best_init.items() if k != 'gnn'}
    # Renormalize
    total_w = sum(init_no_gnn.values())
    init_no_gnn = {k: v/total_w for k, v in init_no_gnn.items()}
    r_base = run_large('no_gnn', best_pop, best_mut, init_no_gnn, 50)
    print(f"  No GNN: wps={r_base['final_wps']:.0f}")

    # Pre-trained GNN
    r_pre = run_large('pretrained_gnn', best_pop, best_mut, best_init, 50)
    print(f"  Pre-trained GNN: wps={r_pre['final_wps']:.0f}")

    # Collect solutions for fine-tuning
    base_result = run_optimization(LARGE_TREE, LARGE_C, pop_size=best_pop, n_gen=30,
                                   proportions=best_init, mutation_probs=best_mut)
    if base_result.F is not None:
        good_assignments = [(base_result.X[i].astype(np.int32), float(base_result.F[i, 1]))
                           for i in range(len(base_result.F))]
        init_ft = dict(best_init)
        init_ft['gnn'] = 0.30
        non_gnn = sum(v for k, v in init_ft.items() if k != 'gnn')
        for k in init_ft:
            if k != 'gnn': init_ft[k] *= 0.70 / non_gnn

        for ft_epochs in [10, 30, 50]:
            ft_model = finetune_gnn(gnn, LARGE_TREE, LARGE_C, good_assignments, epochs=ft_epochs)
            torch.save(ft_model.state_dict(), 'gnn_model.pt')
            r_ft = run_large(f'finetune_{ft_epochs}ep', best_pop, best_mut, init_ft, 50)
            imp = (r_base['final_wps'] - r_ft['final_wps']) / r_base['final_wps'] * 100
            print(f"  Fine-tuned {ft_epochs}ep: wps={r_ft['final_wps']:.0f} ({imp:+.1f}%)")

    shutil.copy('gnn_model_orig.pt', 'gnn_model.pt')
    os.remove('gnn_model_orig.pt')
except Exception as e:
    print(f"  GNN transfer learning failed: {e}")
    import traceback; traceback.print_exc()
    if os.path.exists('gnn_model_orig.pt'):
        import shutil; shutil.copy('gnn_model_orig.pt', 'gnn_model.pt'); os.remove('gnn_model_orig.pt')
sys.stdout.flush()

# ============================================================
# STEP 6: Hard test case (largest_first benchmark)
# ============================================================
print("\n>>> STEP 6: Hard test case (81 leaves, 366 people, min=37 tables)")
sys.stdout.flush()
hard_groups = generate_synthetic_tree(180, max_group_size=8, max_children=3,
                                      rng=np.random.default_rng(0))
hard_tree = GuestTree(hard_groups)
hard_C = 10
hard_total = int(hard_tree.sizes[hard_tree.leaf_indices].sum())
hard_min_t = int(np.ceil(hard_total / hard_C))
print(f"  Tree: {hard_tree.n_leaves} leaves, {hard_total} people, C={hard_C}, min_tables={hard_min_t}")
hard_result = run_optimization(hard_tree, hard_C, pop_size=best_pop, n_gen=250,
                                proportions=best_init, mutation_probs=best_mut,
                                min_tables=hard_min_t)
if hard_result.F is not None:
    hard_min_found = int(hard_result.F[:, 0].min())
    hard_mask = hard_result.F[:, 0] == hard_min_t
    hard_penalty = float(hard_result.F[hard_mask, 1].min()) if hard_mask.any() else None
    print(f"  Min tables found: {hard_min_found} (target: {hard_min_t})")
    if hard_penalty is not None:
        print(f"  Penalty@{hard_min_t}: {hard_penalty:.0f}")
    else:
        print(f"  WARNING: Did not reach min tables {hard_min_t}")
sys.stdout.flush()

# ============================================================
# SAVE RESULTS
# ============================================================
all_results = {
    'tree_info': {'n_leaves': LARGE_TREE.n_leaves, 'total_people': LARGE_TOTAL,
                  'min_tables': LARGE_MIN_T, 'C': LARGE_C},
    'step1_init': init_results,
    'step2_mutation': mut_results,
    'step3_pop': [{'name': r['name'], 'final_wps': r['final_wps'], 'elapsed': r['elapsed'],
                    'per_table': r['per_table']} for r in pop_results],
    'step4_convergence': {'wps_history': conv_result['wps_history'],
                           'per_table': conv_result['per_table'],
                           'conv_gen': conv_gen, 'elapsed': conv_result['elapsed']},
    'best_config': {'init': best_init_name, 'init_cfg': best_init,
                    'mutation': best_mut_name, 'mutation_cfg': best_mut,
                    'pop_size': best_pop, 'conv_gen': conv_gen},
}
with open('tuning_results.json', 'w') as f:
    json.dump(all_results, f, indent=2, default=str)
print("\nSaved tuning_results.json")

# ============================================================
# GENERATE FIGURES
# ============================================================
print("\n>>> Generating figures")
sys.stdout.flush()
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Fig 1: Init comparison
fig, ax = plt.subplots(figsize=(8, 4))
names = [r['name'] for r in init_results]
vals = [r['mean_wps'] for r in init_results]
stds = [r['std_wps'] for r in init_results]
colors = ['#e41a1c' if r == init_results[0] else '#377eb8' for r in init_results]
ax.barh(names, vals, xerr=stds, color=colors, capsize=3)
ax.set_xlabel('Weighted Pareto Score (lower = better)')
ax.set_title('Step 1: Init Strategy (200 examples, pop=50, gen=60)')
ax.grid(True, axis='x', alpha=0.3)
fig.tight_layout(); fig.savefig('figures/tune_init.png', dpi=150, bbox_inches='tight'); plt.close(fig)

# Fig 2: Mutation comparison
fig, ax = plt.subplots(figsize=(8, 4))
names = [r['name'] for r in mut_results]
vals = [r['mean_wps'] for r in mut_results]
stds = [r['std_wps'] for r in mut_results]
colors = ['#e41a1c' if r == mut_results[0] else '#377eb8' for r in mut_results]
ax.barh(names, vals, xerr=stds, color=colors, capsize=3)
ax.set_xlabel('Weighted Pareto Score (lower = better)')
ax.set_title('Step 2: Mutation Strategy (200 examples, pop=50, gen=60)')
ax.grid(True, axis='x', alpha=0.3)
fig.tight_layout(); fig.savefig('figures/tune_mutation.png', dpi=150, bbox_inches='tight'); plt.close(fig)

# Fig 3: Pop size
fig, ax1 = plt.subplots(figsize=(8, 5))
pops = [int(r['name'].replace('pop=','')) for r in pop_results]
wps_v = [r['final_wps'] for r in pop_results]
times_v = [r['elapsed'] for r in pop_results]
ax1.bar([str(p) for p in pops], wps_v, color='#377eb8', alpha=0.7)
ax1.set_xlabel('Population Size'); ax1.set_ylabel('WPS (lower = better)', color='#377eb8')
ax2 = ax1.twinx()
ax2.plot([str(p) for p in pops], times_v, 'ro-', linewidth=2)
ax2.set_ylabel('Runtime (s)', color='red')
ax1.set_title('Step 3: Population Size (large tree, 150 gen)')
fig.tight_layout(); fig.savefig('figures/tune_popsize.png', dpi=150, bbox_inches='tight'); plt.close(fig)

# Fig 4: Convergence
fig, ax = plt.subplots(figsize=(8, 5))
gens = [w[0] for w in wps_hist]; wps_v = [w[2] for w in wps_hist]
ax.plot(gens, wps_v, 'b-', linewidth=2)
ax.axvline(conv_gen, color='red', linestyle='--', alpha=0.7, label=f'Convergence ~gen {conv_gen}')
ax.set_xlabel('Generation'); ax.set_ylabel('Weighted Pareto Score')
ax.set_title(f'Step 4: Convergence ({LARGE_TREE.n_leaves} leaves, pop={best_pop})')
ax.legend(); ax.grid(True, alpha=0.3)
fig.tight_layout(); fig.savefig('figures/tune_convergence.png', dpi=150, bbox_inches='tight'); plt.close(fig)

# Fig 5: Per-table convergence (6 panels)
fig, axes = plt.subplots(2, 3, figsize=(16, 10))
clrs = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628']
for idx, nt in enumerate(range(LARGE_MIN_T, LARGE_MIN_T + 6)):
    ax = axes[idx//3][idx%3]
    hist = conv_result['per_table'][str(nt)]['history']
    gs = [h[0] for h in hist if h[1] is not None]
    vs = [h[1] for h in hist if h[1] is not None]
    if gs:
        ax.plot(gs, vs, color=clrs[idx], linewidth=2)
        ax.annotate(f'{vs[0]:.0f}', (gs[0], vs[0]), fontsize=8, color='gray')
        ax.annotate(f'{vs[-1]:.0f}', (gs[-1], vs[-1]), fontsize=8, ha='right', color='gray')
        imp = (vs[0]-vs[-1])/vs[0]*100 if vs[0] > 0 else 0
        ax.text(0.95, 0.95, f'Δ={imp:.1f}%', transform=ax.transAxes, ha='right', va='top',
                fontsize=11, fontweight='bold', color=clrs[idx])
    else:
        ax.text(0.5, 0.5, 'No solutions', ha='center', va='center', transform=ax.transAxes)
    ax.set_title(f'{nt} tables (+{nt-LARGE_MIN_T})', fontsize=13, fontweight='bold')
    ax.set_xlabel('Generation'); ax.set_ylabel('Penalty'); ax.grid(True, alpha=0.3)
fig.suptitle(f'Per-Table Convergence — {LARGE_TREE.n_leaves} leaves, {LARGE_TOTAL} people, best config', fontsize=14)
fig.tight_layout(); fig.savefig('figures/results_per_table.png', dpi=150, bbox_inches='tight'); plt.close(fig)

print("All figures saved")
total_time = time.time() - t_total
print(f"\n{'='*70}")
print(f"DONE in {total_time/60:.1f} min")
print(f"Best config: init={best_init_name}, mut={best_mut_name}, pop={best_pop}, conv~gen{conv_gen}")
print(f"{'='*70}")
