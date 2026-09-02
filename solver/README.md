# Seating Arrangement Optimizer

Multi-objective evolutionary algorithm (NSGA-II) for assigning guest groups to tables, optimizing cohesion, loneliness, and table count simultaneously.

## Quick Start

```bash
pip install numpy pymoo torch torch-geometric scipy matplotlib
python3.10 train_and_evaluate_gnn.py --step 1   # Train GNN (~47 min)
python3.10 train_and_evaluate_gnn.py --step 2   # Compare with/without GNN (~50 min)
```

## Documentation

- **`report.pdf`** — Full technical report (13 pages) with algorithms, examples, figures, hyperparameter tuning results, and reproduction instructions.

## Core Modules

| File | Description |
|------|-------------|
| `tree_distance.py` | Guest tree data structure with O(1) LCA distance (Euler tour + sparse table) |
| `fitness.py` | Fitness evaluation: loneliness, cohesion, combined penalty, weighted Pareto score |
| `initializers.py` | 4 seeding strategies + GNN: random, nearest-neighbor, top-down, bottom-up merge |
| `operators.py` | Mutation (swap, move, split, merge, nearest-neighbor move), crossover with smart repair |
| `optimizer.py` | NSGA-II integration with pymoo (custom sampling, mutation, crossover, GNN injection callback) |
| `gnn_model.py` | GNN initializer: 3-layer GCN + contrastive training on min-table targets |
| `synthetic.py` | Synthetic guest tree generator for testing |

## Scripts

| Script | Purpose |
|--------|---------|
| `run_all.py` | **Full tuning pipeline**: init → mutation → pop size → convergence → GNN |
| `train_and_evaluate_gnn.py` | Train GNN and evaluate its contribution (step 1: train; step 2: compare with/without) |
| `validate_examples.py` | Verify all examples in the report match the actual code output |
| `generate_examples.py` | Regenerate tree figures and validate examples for the report |

## Key Results

- **Best init**: bottom-up merge (40%) + nearest-neighbor (30%) + GNN (10%)
- **Best mutation**: 60% nn-move (with smart crossover repair)
- **Convergence**: ~132 generations for 384 leaves (~56s)
- **One extra table gives ~11% better quality**
- **GNN**: +5.3% penalty improvement (p=0.004) via min-table contrastive training with subtree-people features

## Requirements

- Python 3.10+
- numpy, pymoo (≥0.6), torch, torch-geometric, scipy, matplotlib
