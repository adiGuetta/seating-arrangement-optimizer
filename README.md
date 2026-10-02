# Seating Arrangement Manager

A full-stack seating arrangement optimization app. Guests are organized into a hierarchical tree, and an AI-powered solver (NSGA-II + GNN) finds Pareto-optimal seating arrangements. Suitable for weddings, birthdays, corporate events, and any occasion with table seating.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser / Mobile                  │
│                                                      │
│   Expo (React Native Web)          Firebase Auth     │
│   ├── Guest tree management        (Google sign-in)  │
│   ├── Seating generation UI        FCM (push notif)  │
│   └── Arrangement viewer           Firestore (sync)  │
└──────────────┬──────────────────────────┬────────────┘
               │ HTTP                     │ Direct SDK
               ▼                          ▼
┌──────────────────────┐     ┌─────────────────────────┐
│   nginx (:80)        │     │   Firebase Cloud        │
│   ├── / → UI (:8081) │     │   ├── Authentication    │
│   ├── /solve → solver │     │   ├── Firestore DB     │
│   └── /health → solver│     │   └── Cloud Messaging  │
└──────┬───────┬───────┘
       │       │
       ▼       ▼
┌──────────┐ ┌──────────────┐
│ UI       │ │ Solver       │
│ container│ │ container    │
│ Expo     │ │ gunicorn     │
│ :8081    │ │ 3 workers    │
└──────────┘ │ :5050        │
             └──────────────┘
```

### Containers

| Container | Image | Port | Description |
|-----------|-------|------|-------------|
| `seating-ui` | `node:20-slim` | 8081 (internal) | Expo dev server serving the React Native Web app |
| `seating-solver` | `python:3.10-slim` | 5050 (internal) | Gunicorn (3 workers) wrapping the NSGA-II seating optimizer |
| `seating-nginx` | `nginx:alpine` | 80 (exposed) | Reverse proxy — the only port open to the outside |

All containers run on a shared Docker network (`seating`). Only nginx's port 80 is exposed to the host.

### Concurrency Architecture

The solver runs under **gunicorn with 3 pre-forked workers** and `--preload` so the GNN model (~30MB) is loaded once in the master process and shared via copy-on-write across workers.

**Thread budget management:** The solver's fitness evaluation uses a thread pool for parallel population evaluation. A shared counter tracks active solve requests across all workers. When a request arrives:

1. Increment active counter, compute thread budget: `max(1, (N_CPUs - 2) / active_count)`
2. Reconfigure the thread pool to that size
3. Run the solver
4. On completion, decrement counter and let remaining solves expand their thread pools

This ensures:
- **1 active request:** uses all available CPU threads (N-2)
- **2 concurrent requests:** each gets half the threads
- **3 concurrent requests:** each gets a third
- No thread oversubscription — total threads never exceed available CPUs

**Async solve:** Requests return immediately with a `jobId`. The UI polls `GET /solve/{jobId}` every 2 seconds. When the solve completes, the result is returned and an FCM push notification is sent (if the client provided an FCM token).

### Scripts

- `./start.sh` — Builds images, starts all 3 containers, waits for readiness
- `./start.sh --debug` — Same, but injects a large demo event (~500 guests)
- `./stop.sh` — Stops and removes all containers and the network
- Windows: `start.bat` / `stop.bat` (same behavior)

## Database Schema (Firestore)

The app uses a single Firestore collection. Each authenticated user has one document containing all their data.

### Collection: `users`

**Document ID:** Firebase Auth UID

```
users/{uid}
└── events: Event[]
```

The entire state is stored as a single `events` array. This is written on every change via `setDoc(..., { merge: true })`. Offline users store the same structure in `localStorage`.

### Data Types

```
Event
├── id: string                    # Unique event ID (timestamp-based)
├── name: string                  # "Our Wedding", "Birthday Party", etc.
├── date?: string                 # "2026-06-15" (optional)
├── createdAt: number             # Unix timestamp (ms)
├── seatingConfig: SeatingConfig
├── groups: GuestGroup[]          # The guest tree (flat list with parentId pointers)
└── arrangements: SeatingArrangement[]

SeatingConfig
├── maxTableSize: number          # e.g. 10
├── alpha: number                 # Loneliness penalty weight (default 2.0)
└── p: number                     # Loneliness penalty exponent (default 2.0)

GuestGroup
├── id: string
├── name: string                  # "Bride's Family", "Team Alpha", etc.
├── parentId: string | null       # null = root group
├── edgeWeight: number            # Tree edge weight (default 1.0)
├── createdAt: number             # Used for sibling ordering
└── guests: Guest[]

Guest
├── id: string
├── name: string
├── phone?: string
├── email?: string
├── notes?: string
├── expectedToArrive: boolean     # Included in seating optimization
├── arrivedConfirmed: boolean     # Day-of check-in tracking
└── giftDescription?: string

SeatingArrangement
├── id: string
├── name: string                  # "Arrangement (6 Tables)"
├── config: SeatingConfig         # Config snapshot at generation time
├── createdAt: number
└── tables: TableAssignment[]

TableAssignment
├── tableId: number               # 1-indexed
└── guests: TableGuest[]

TableGuest (inline object)
├── guestId: string
├── guestName: string
├── groupId: string
└── groupName: string
```

### Storage Strategy

| Mode | Storage | Sync |
|------|---------|------|
| Signed in | Firestore + localStorage | Bidirectional — loads from Firestore on login, writes on every change |
| Guest mode | localStorage only | No sync — sign in later to push to cloud |

The `events` array is serialized via `JSON.parse(JSON.stringify(...))` before writing to Firestore to strip `undefined` values (Firestore rejects them).

## Solver API

The solver runs as a separate Flask service behind gunicorn. The UI calls it via nginx reverse proxy.

### `POST /solve` (async)

Starts a solve job and returns immediately.

**Request:**
```json
{
  "groups": [
    { "id": "abc", "parentId": null, "guestCount": 0, "edgeWeight": 1 },
    { "id": "def", "parentId": "abc", "guestCount": 5, "edgeWeight": 3 }
  ],
  "tableCapacity": 10,
  "alpha": 2.0,
  "p": 2.0,
  "fcmToken": "optional-fcm-device-token"
}
```

**Response:**
```json
{ "jobId": "uuid-string" }
```

### `GET /solve/{jobId}` (poll)

**Response (pending):** `{ "status": "pending" }`

**Response (done):**
```json
{
  "status": "done",
  "solutions": [
    {
      "tables": 6,
      "penalty": 470.2,
      "chunks": [{ "groupId": "def", "tableId": 0, "size": 5 }]
    }
  ]
}
```

### API Data Transformations

| UI scenario | API transformation |
|---|---|
| Multiple root groups (`parentId: null`) | Wraps under a synthetic `_root` node |
| Group has both children and guests | Splits into internal node (size=0) + synthetic leaf `_direct_{id}` |
| Leaf group larger than table capacity | Splits into chunks of ≤ capacity as siblings with `edge_weight: 0` |

### `GET /health`

Returns `{"status": "ok", "cpus": N, "solver_threads": M}`

## UI Structure

```
ui/
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout (providers: Store, Auth, I18n, Theme)
│   ├── index.tsx           # Landing / event list
│   ├── event/[id].tsx      # Event detail (group tree list)
│   ├── group/[id].tsx      # Group detail (guests, subgroups, actions)
│   ├── seating.tsx         # Seating generation, candidates, arrangements
│   ├── tree-view.tsx       # Visual tree with move support
│   ├── add-group.tsx       # Create group form
│   ├── add-guest.tsx       # Create guest form
│   ├── edit-group.tsx      # Edit group (name, weight, parent)
│   └── edit-guest.tsx      # Edit guest details
├── components/
│   ├── VisualTree.tsx      # SVG tree renderer with move support
│   ├── ColoredTree.tsx     # Table-colored tree visualization
│   ├── TableCircle.tsx     # Circular table visualization
│   ├── GuestCard.tsx       # Guest row with toggle
│   ├── TreeRow.tsx         # Collapsible tree list row
│   ├── Button.tsx          # Themed button
│   ├── Input.tsx           # Themed text input
│   └── LoginScreen.tsx     # Google sign-in screen
├── lib/
│   ├── store.tsx           # React context store (state + Firestore sync)
│   ├── types.ts            # TypeScript interfaces
│   ├── firebase.ts         # Firebase config and initialization
│   ├── auth.tsx            # Auth context (Google sign-in)
│   ├── i18n.tsx            # English/Hebrew translations
│   ├── theme.tsx           # Light/dark theme
│   ├── metrics.ts          # Table cohesion/loneliness calculations
│   └── alert.ts            # Cross-platform alert helpers
└── public/                 # Static assets
```

## Solver Structure

```
solver/
├── api.py                  # Flask API with async jobs, thread budget, FCM
├── solve.py                # Main solver entry point
├── tree_distance.py        # GuestTree with weighted LCA distance
├── optimizer.py            # NSGA-II integration with pymoo
├── fitness.py              # Fitness evaluation (loneliness + cohesion)
├── initializers.py         # Population initializers (random, nearest-neighbor, top-down, bottom-up, GNN)
├── operators.py            # Mutation and crossover operators
├── gnn_model.py            # Graph Neural Network model and training
├── gnn_model.pt            # Pre-trained GNN weights
├── synthetic.py            # Synthetic tree generator for testing
├── generate_demo.py        # Large demo event generator (debug mode)
└── requirements.txt        # Python dependencies
```

### Research scripts and report artifacts

```
solver/
├── run_all.py              # Full experiment runner (tuning, training, evaluation)
├── generate_examples.py    # Generates figures for the report
├── validate_examples.py    # Validates generated examples
├── train_and_evaluate_gnn.py # GNN training script
├── tuning_results.json     # Hyperparameter tuning results
research/
├── report.tex              # LaTeX source for the research paper
├── report.pdf              # Compiled research paper
└── figures/                # PNG figures for the report
```

## Mobile (Android/iOS)

The app is built with Expo and supports Android/iOS via Expo Go or EAS Build:

```bash
# Development
npx expo start          # Expo Go
eas build --platform android  # Native build
eas build --platform ios      # Native build
```

Google sign-in uses `signInWithPopup` on web with `signInWithRedirect` fallback for native environments.
