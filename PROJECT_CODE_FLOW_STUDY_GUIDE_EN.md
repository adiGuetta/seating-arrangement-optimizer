# Project Code Flow Study Guide

## 1. High-Level Project Overview

This project is a seating arrangement optimizer for events. A user creates events, organizes guests into a weighted group tree, marks which guests are expected to arrive, generates optimized seating arrangements, saves arrangements, views them as tables, and can manually move guests afterward.

Main components:

- Frontend: `ui/`, an Expo React Native / web app using `expo-router`. It manages events, groups, guests, seating generation, saved arrangements, manual editing, tree views, theme, i18n, Firebase Auth, and Firestore sync.
- State layer: `ui/lib/store.tsx`. This is the main app state container. It stores `events`, the current event, `groups`, guests, seating config, and saved arrangements.
- Backend API: `solver/api.py`, a Flask API. It receives `/solve` requests, starts async solver jobs in background threads, stores job state in temp files, and exposes polling through `/solve/<job_id>`.
- Solver and algorithm: `solver/solve.py`, `solver/optimizer.py`, `solver/fitness.py`, `solver/tree_distance.py`, `solver/initializers.py`, `solver/operators.py`. These convert the guest tree into leaf assignments and run NSGA-II using `pymoo`.
- GNN research/initializer layer: `solver/gnn_model.py`, `solver/train_and_evaluate_gnn.py`, and `solver/gnn_model.pt`. The production solver may use the GNN as one initial population strategy if the model file is available. Mid-run GNN injection exists in code but is not enabled by the current API flow.
- Persistence: Firebase Auth and Firestore in `ui/lib/auth.tsx`, `ui/lib/firebase.ts`, and `ui/lib/store.tsx`; localStorage is also used on web.
- Deployment: Dockerfiles for UI and solver, plus `nginx.conf` and start/stop scripts. nginx routes `/` to Expo web UI, `/solve` to Flask, `/health` to Flask, and static debug/about files from `static/`.

Behind the scenes, the core flow is:

1. User creates an event in `ui/app/index.tsx`.
2. Event data is stored in `StoreProvider` in `ui/lib/store.tsx`.
3. User builds a group tree through `ui/app/add-group.tsx`, `ui/app/group/[id].tsx`, `ui/app/edit-group.tsx`, and `ui/app/event/[id].tsx`.
4. Guests are attached directly to groups through `ui/app/add-guest.tsx` and edited through `ui/app/edit-guest.tsx`.
5. Seating generation starts in `ui/app/seating.tsx`.
6. The frontend builds a solver payload from groups and expected guests only.
7. The frontend posts to `/solve`, receives a `jobId`, polls `/solve/<jobId>`, converts solver chunks back into real guest tables, and saves selected arrangements.
8. Saved arrangements persist through the central store to localStorage and, if logged in, Firestore.

## 2. File Map by Study Priority

### Must Know Deeply

| File | Purpose | Main functions / classes | Why it matters | Connects to |
|---|---|---|---|---|
| `ui/lib/store.tsx` | Central app state and persistence | `StoreProvider`, `addEvent`, `cloneEvent`, `addGroup`, `updateGroup`, `deleteGroup`, `moveGroup`, `reorderGroup`, `addGuest`, `updateGuest`, `removeGuest`, `getChildren`, `getSubtreeGroups`, `updateSeatingConfig`, `addArrangement`, `updateArrangement`, `deleteArrangement`, `exportSubtreeToEvent` | This is the real state model. Events, groups, guests, seating config, arrangements, localStorage, and Firestore sync all meet here. | All UI screens, Firebase, localStorage |
| `ui/lib/types.ts` | Frontend data model | `Guest`, `GuestGroup`, `SeatingConfig`, `TableAssignment`, `SeatingArrangement`, `Event` | Defines the shape of all important frontend data. | Store, UI, seating display |
| `ui/app/seating.tsx` | Seating generation, result viewing, manual editing | `SeatingScreen`, `solverGroupsPayload`, `chunksToTables`, `handleGenerate`, `handleSaveCandidate`, `handleMoveGuest`, `handleUndo`, `handleRedo`, `ArrangementView`, `generateRandomSeating` | Most important frontend file for the presentation. It owns the request to the solver and turns algorithm results into visible/saved tables. | Store, Flask `/solve`, metrics, visualizations |
| `solver/api.py` | Flask API and async job management | `_prepare_solver_groups`, `_add_leaf`, `_clean_assignment`, `_run_solve`, `solve_endpoint`, `solve_status`, `health`, `_acquire_threads`, `_release_threads` | Explains frontend-to-backend flow and normalization of UI groups before optimization. | Frontend `/solve`, `solver/solve.py` |
| `solver/solve.py` | Production solver entry point | `solve` | Creates `GuestTree`, computes minimum table count, calls NSGA-II, extracts best Pareto solution per table count. | Flask API, optimizer |
| `solver/optimizer.py` | NSGA-II integration | `SeatingProblem`, `SeatingSampling`, `SeatingMutation`, `SeatingCrossover`, `GNNInjectionCallback`, `run_optimization` | Core algorithm orchestration using `pymoo`. | Fitness, initializers, operators, GNN |
| `solver/tree_distance.py` | Weighted tree distance | `GuestTree`, `_build_euler_tour`, `_build_sparse_table`, `lca_idx`, `dist`, `precompute_dist_matrix` | One of the best technical areas to present. It computes weighted LCA distances efficiently. | Fitness, operators, initializers |
| `solver/fitness.py` | Fitness/objective calculations | `evaluate_population`, `_eval_one`, `evaluate_phase2`, `is_valid`, `weighted_pareto_score`, `set_max_workers` | Defines optimization objectives: number of tables and combined loneliness/cohesion penalty. | Optimizer, research scripts |
| `solver/initializers.py` | Initial population generation | `generate_initial_population`, `random_valid`, `nearest_neighbor`, `greedy_top_down`, `bottom_up_merge`, `largest_first_nn`, `compact_tables` | Shows how the algorithm starts from meaningful seating candidates, not only random assignments. | NSGA-II sampling |
| `solver/operators.py` | Mutation, crossover, repair | `mutate`, `crossover`, `repair`, `_do_merge`, `_renumber` | Shows how candidate seating arrangements evolve while respecting table capacity. | NSGA-II mutation/crossover |

### Important to Understand

| File | Purpose | Main functions / classes | Why it matters | Connects to |
|---|---|---|---|---|
| `ui/app/_layout.tsx` | App provider and routing root | `Layout`, `AppStack` | Shows provider order: theme, i18n, auth, store. | All frontend screens |
| `ui/app/index.tsx` | Event list and login gate | `LandingScreen`, `handleCreate`, `handleClone`, `handleDelete`, `openEvent` | First screen. Creates, clones, edits, deletes events. | Store, Auth, router |
| `ui/app/event/[id].tsx` | Event tree list | `EventScreen`, `flatTree`, `searchResults`, `toggle` | Main event management screen. Displays tree rows and supports drag-to-move groups. | Store, `TreeRow`, group/detail screens |
| `ui/app/group/[id].tsx` | Group detail page | `GroupDetailScreen`, `handleDelete` | Shows subgroups, direct guests, subtree stats, guest toggles, subtree export. | Store, `GuestCard`, group editing |
| `ui/app/add-group.tsx` | Group creation | `AddGroupScreen`, `handleSave` | Creates groups/subgroups and stores `edgeWeight`. | Store group functions |
| `ui/app/edit-group.tsx` | Group editing | `EditGroupScreen`, `handleSave` | Edits name, edge weight, parent, and order. Prevents moving a group under its own subtree. | Store group functions |
| `ui/app/add-guest.tsx` | Guest creation | `AddGuestScreen`, `handleSave` | Adds guests to one group and sets `expectedToArrive`. | Store guest functions |
| `ui/app/edit-guest.tsx` | Guest editing | `EditGuestScreen`, `handleSave`, `handleDelete` | Updates/removes guests and toggles expected status. | Store guest functions |
| `ui/lib/metrics.ts` | Frontend table metrics | `computeTableMetrics`, `findLoneliestGlobal`, `treeDist`, `buildDistMatrix`, `cohesionColor`, `cohesionLabel`, `lonelinessColor` | Displays cohesion/loneliness after arrangements are saved or viewed. Similar idea to solver metrics, but computed client-side for display. | Seating view, `TableCircleNative` |
| `ui/components/VisualTree.tsx` | General tree visualization | `VisualTree`, `subtreeWidth`, `layoutTree`, `flattenNodes`, `collectEdges` | Shows the weighted group tree and supports tree-based move interactions. | Tree view, seating subtree picker |
| `ui/components/ColoredTree.tsx` | Arrangement-to-tree visualization | `ColoredTree`, `groupToTables`, `layoutTree` | Shows how groups are split across tables using colors. Good visual explanation tool. | Seating arrangement view |
| `ui/components/TableCircleNative.tsx` | Table visualization | `TableCircleNative` | Shows guests around a table with colors, metrics, and move hit areas. | Seating arrangement view |
| `ui/lib/auth.tsx` | Firebase authentication | `AuthProvider`, `signInWithGoogle`, `logout` | Handles web/native Google login. | Firebase Auth, login screen |
| `ui/lib/firebase.ts` | Firebase setup | `auth`, `db` | Initializes Firebase Auth and Firestore. | Auth, store |
| `solver/gnn_model.py` | GNN model, training helper, initializer | `SeatingGNN`, `tree_to_pyg`, `gnn_initializer`, `train_gnn`, `finetune_gnn`, `contrastive_loss` | Useful if lecturers ask about research or ML. Important to explain honestly. | Initializers, optional optimizer callback, training script |
| `solver/train_and_evaluate_gnn.py` | GNN experiment script | `step1`, `step2` | Trains and evaluates GNN contribution. Not the normal app request path. | Research/evaluation |

### Background / Less Critical

| File | Purpose | Main functions / classes | Why it matters | Connects to |
|---|---|---|---|---|
| `ui/lib/i18n.tsx` | English/Hebrew translations | `I18nProvider`, `useI18n`, `t` | Important for UI text, but not core algorithm. | All UI |
| `ui/lib/theme.tsx` | Light/dark color system | `ThemeProvider`, `useTheme`, mutable `Colors` export | UI theming only. | All UI |
| `ui/lib/config.ts` | Server and Google client config | `CONFIG` | Controls native solver base URL and Google web client ID. | Auth, solver request |
| `ui/components/LoginScreen.tsx` | Sign-in UI | `LoginScreen` | Calls Google sign-in. | Auth |
| `ui/components/TreeRow.tsx` | Tree list row | `TreeRow` | Displays group counts and drop target states. | Event screen |
| `ui/components/GuestCard.tsx` | Guest list row | `GuestCard` | Displays guest and expected toggle. | Event/group screens |
| `ui/components/Button.tsx`, `ui/components/Input.tsx` | Shared UI controls | `Button`, `Input` | Styling-level support. | Forms |
| `solver/synthetic.py`, `solver/generate_examples.py`, `solver/generate_demo.py`, `solver/run_all.py`, `solver/validate_examples.py` | Demo, synthetic data, research, validation | Various script functions | Useful background for experiments/demos, not core app runtime. | Solver research/debug |
| `nginx.conf` | Reverse proxy | nginx `location` blocks | Explains deployment routing. | Docker services |
| `ui/Dockerfile`, `solver/Dockerfile` | Container builds | Docker commands | Deployment only. | start scripts |
| `start.bat`, `start.sh`, `stop.bat`, `stop.sh` | Local Docker orchestration | Script commands | Build/run/stop services. | Docker, nginx |

## 3. Full End-to-End System Flow

### 3.1 Application Startup

1. Expo starts from `ui/package.json`, where `"main": "expo-router/entry"`.
2. `ui/app/_layout.tsx` renders `Layout`.
3. Provider order in `Layout`:
   - `SafeAreaProvider`
   - `ThemeProvider`
   - `I18nProvider`
   - `AuthProvider`
   - `StoreProvider`
   - `AppStack`
4. `ThemeProvider` in `ui/lib/theme.tsx` initializes light mode and keeps the exported mutable `Colors` object synchronized.
5. `I18nProvider` in `ui/lib/i18n.tsx` initializes English by default and exposes `t`, `lang`, `setLang`, and `isRTL`.
6. `AuthProvider` in `ui/lib/auth.tsx` listens to Firebase Auth through `onAuthStateChanged`. On native it also configures Google Sign-In.
7. `StoreProvider` in `ui/lib/store.tsx` loads events from web localStorage using `loadFromStorage()`.
8. If web debug data exists, `StoreProvider` tries to fetch `/demo-event.json`.
9. If the user logs in, `StoreProvider` loads Firestore document `users/{uid}` and replaces local events if Firestore contains a non-empty `events` array.
10. Every event change is saved to localStorage. If logged in and Firestore has loaded, it also writes `{ events }` to `users/{uid}` using `setDoc(..., { merge: true })`.

### 3.2 Event Creation and Event Management

The event list screen is `ui/app/index.tsx`, component `LandingScreen`.

Important functions:

- `handleCreate`: calls `addEvent(newName, newDate)`, closes the form, sets the new event as current with `setCurrentEventId(ev.id)`, then navigates to `/event/${ev.id}`.
- `handleClone`: calls `cloneEvent(cloneSourceId, newName)`, sets current event, and navigates to it.
- `handleDelete`: confirms and calls `deleteEvent(id)`.
- `openEvent`: calls `setCurrentEventId(id)` and navigates to `/event/${id}`.

Store functions:

- `addEvent` creates an `Event` with empty `groups`, default `seatingConfig: { maxTableSize: 10, alpha: 2.0, p: 2.0 }`, empty `arrangements`, and `createdAt`.
- `cloneEvent` deep-clones groups and guests with new IDs, remaps `parentId`, copies seating config, and starts with no arrangements.
- `updateEvent` updates event fields.
- `deleteEvent` removes an event and clears `currentEventId` if needed.

Data is saved in:

- React state inside `StoreProvider`.
- Browser localStorage under `STORAGE_KEY = 'seating_data'` on web.
- Firestore document `users/{uid}` when authenticated and Firestore has loaded.

### 3.3 Building the Guest Group Tree

Tree data model:

- A group is a `GuestGroup` from `ui/lib/types.ts`.
- It has `id`, `name`, `parentId`, `guests`, `edgeWeight`, and `createdAt`.
- The tree is represented as a flat array of groups. Parent-child relationships are stored by `parentId`.
- Top-level groups have `parentId: null`.
- `edgeWeight` belongs to the child group and means the distance/cost from that group to its parent.

Group creation:

- Screen: `ui/app/add-group.tsx`, component `AddGroupScreen`.
- `handleSave` calls `addGroup(name.trim(), parentId)`.
- `addGroup` in `ui/lib/store.tsx` creates `{ id, name, parentId, guests: [], edgeWeight: 1, createdAt }`.
- If the user entered a non-default edge weight, `handleSave` calls `updateGroup(g.id, { edgeWeight: Math.max(0.1, w) })`.

Subgroup creation:

- From `ui/app/group/[id].tsx`, the "Add Subgroup" action routes to `/add-group?parentId=${id}`.
- `AddGroupScreen` receives `parentId` from route params and creates the new group under that parent.

Guest attachment:

- Screen: `ui/app/add-guest.tsx`.
- `handleSave` calls `addGuest(groupId, guestData)`.
- `addGuest` appends the guest into the matching group's `guests` array.
- Guests are not separate global records; they live inside exactly one group.

Delete / move / reorder / subtree export:

- `deleteGroup(id)` recursively deletes the group and all descendant groups.
- `moveGroup(id, newParentId)` changes `parentId`, but first prevents moving a group into its own subtree using `getSubtreeGroups(id)`.
- `reorderGroup(id, 'up' | 'down')` swaps `createdAt` with a sibling to change display order.
- `getSubtreeGroups(rootId)` recursively returns the group plus descendants.
- `exportSubtreeToEvent(rootGroupId, targetEventId)` deep-clones a subtree into another event with new group and guest IDs, remapping internal parents and making the exported root top-level.

Tree display:

- `ui/app/event/[id].tsx` builds `flatTree` from `groups` and an `expanded` set.
- `TreeRow` displays each group and subtree counts.
- Drag mode in `EventScreen` calls `moveGroup(draggingId, item.group.id)`.
- `ui/app/tree-view.tsx` uses `VisualTree` for SVG-based tree display and long-press move behavior.

### 3.4 Seating Arrangement Generation

This is the most important frontend flow.

Entry screen:

- `ui/app/event/[id].tsx` has a stats button that routes to `/seating`.
- `ui/app/seating.tsx` renders `SeatingScreen`.

State in `SeatingScreen`:

- `maxTableSize`
- `familyPriority` mapped to solver `alpha`
- `strictness` mapped to solver `p`
- `depthWeighting`
- `arrName`
- `candidates`
- `solving`
- `activeArrId`
- manual editing state: `movingGuest`, `undoStack`, `redoStack`

Payload construction:

- `guestsByGroup` is a `useMemo` map from `groupId` to expected guests only.
- It filters guests with `gu.expectedToArrive`.
- `solverGroupsPayload` is a `useMemo` that maps every frontend group to:
  - `id`
  - `parentId`
  - `guestCount`: number of expected guests in that group
  - `edgeWeight`: group `edgeWeight`, optionally multiplied by a depth weighting multiplier
- Depth weighting is controlled by the `depthWeighting` switch. If enabled, shallower groups get larger multipliers so crossing top-level branches costs more.

Generation chain:

1. User presses the Generate button in `ui/app/seating.tsx`.
2. Button calls `handleGenerate`.
3. `handleGenerate` calls `updateSeatingConfig({ maxTableSize, alpha: familyPriority, p: strictness })`.
4. If `totalExpected === 0`, it shows an alert and returns.
5. It chooses `baseUrl = ''` on web. That means web requests go through nginx relative paths. Native uses `CONFIG.SERVER_URL`.
6. It sends:

```ts
fetch(`${baseUrl}/solve`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    groups: solverGroupsPayload,
    tableCapacity: maxTableSize,
    alpha: familyPriority,
    p: strictness,
  }),
})
```

7. It expects `{ jobId }` from the backend.
8. It polls `GET /solve/${jobId}` up to 300 times, waiting 2 seconds between polls. That is up to about 10 minutes.
9. If status is `done`, it uses the returned `solutions`.
10. If status is `error`, it throws.
11. If timeout or error happens, it falls back to `generateRandomSeating(groups, maxTableSize)`.

Result conversion:

- Backend solutions contain chunks like `{ groupId, tableId, size }`.
- `chunksToTables(chunks)` converts these chunks into frontend `TableAssignment[]`.
- It uses `guestsByGroup` to take the next `size` expected guests from each group.
- It tracks consumed guests per group with `consumed`.
- It builds `tableMap`.
- It remaps solver table IDs to display table IDs starting from 1.

Saving:

- Generated candidates are stored in local component state as `candidates`.
- `handleSaveCandidate(idx)` calls:
  - `addArrangement(name, c.tables, { maxTableSize, alpha: familyPriority, p: strictness })`
  - then marks that candidate as `saved: true`.
- `addArrangement` in `ui/lib/store.tsx` appends a `SeatingArrangement` to the current event.
- Persistence then happens through the store effects to localStorage and Firestore.

### 3.5 Backend Solver Flow

Backend file: `solver/api.py`.

Endpoints:

- `POST /solve`: `solve_endpoint`
- `GET /solve/<job_id>`: `solve_status`
- `GET /health`: `health`

Async job flow:

1. `solve_endpoint` reads `request.json`.
2. It creates `job_id = str(uuid.uuid4())`.
3. It writes job state as pending using `_set_job(job_id, {'status': 'pending'})`.
4. It starts a daemon `threading.Thread` running `_run_solve(...)`.
5. It immediately returns `{ jobId }`.

Job storage:

- Jobs are stored as JSON files in `tempfile.gettempdir()/seating_jobs`.
- `_set_job`, `_get_job`, and `_del_job` manage those files.
- This allows polling to work across gunicorn workers through shared filesystem state.

Thread management:

- `_acquire_threads` increments active solve count and sets the fitness thread pool size using `set_max_workers`.
- `_release_threads` decreases active solve count and readjusts thread budget.

Normalization:

- `_prepare_solver_groups(ui_groups, table_capacity)` converts frontend groups into solver format.
- Solver groups use:
  - `id`
  - `size`
  - `parent_id`
  - `edge_weight`
- If there is not exactly one root, it creates a synthetic `_root`.
- If a group has both children and direct guests, it creates the group as internal `size: 0` and adds a direct leaf `_direct_<groupId>`.
- If a leaf group has more guests than table capacity, it splits it into `_chunk_<groupId>_0`, `_chunk_<groupId>_1`, etc.
- This matters because the optimizer assigns only leaves to tables.

Solving:

- `_run_solve` calls `_prepare_solver_groups`, then calls `solve(...)` from `solver/solve.py`.
- After solving, it cleans internal leaf IDs with `_clean_assignment`.
- `_clean_assignment` maps `_direct_...` and `_chunk_...` back to real frontend group IDs and includes chunk `size`.
- It stores final job result as `{'status': 'done', 'result': {'solutions': solutions}}`.

Polling:

- `solve_status(job_id)` returns:
  - `{ status: 'pending' }`
  - `{ status: 'error', error, solutions: [] }` with HTTP 500
  - `{ status: 'done', solutions: [...] }`
- When done, it deletes the job file with `_del_job(job_id)`.

FCM:

- `_send_fcm` exists and `_run_solve` accepts `fcm_token`.
- The current frontend `handleGenerate` does not send `fcmToken`, so push notification is not part of the observed production frontend flow.

### 3.6 Algorithm Flow

Problem being solved:

The solver assigns leaf guest groups to table IDs. It tries to minimize:

1. Number of tables.
2. A seating penalty based on loneliness and cohesion.

Solution representation:

- In solver code, an assignment is a NumPy array of length `tree.n_leaves`.
- Each element is a table ID for one leaf group.
- A leaf group may represent:
  - a real group with guests,
  - a direct-guest pseudo-leaf created from an internal group,
  - or a chunk of an oversized group.

Tree and distance:

- `GuestTree` in `solver/tree_distance.py` builds a weighted rooted tree.
- It stores `sizes`, `children`, `depth`, `weighted_depth`, and `leaf_indices`.
- It builds an Euler tour and sparse table for LCA lookup.
- Distance is:
  - `weighted_depth[i] + weighted_depth[j] - 2 * weighted_depth[lca]`
- `precompute_dist_matrix()` computes a full weighted distance matrix.

Fitness:

- `evaluate_population` in `solver/fitness.py` evaluates many assignments in parallel.
- `_eval_one` computes:
  - `same`: pairwise same-table matrix.
  - `min_dists`: for each leaf, distance to the closest same-table leaf.
  - if a leaf is alone, it uses that leaf's maximum distance to any other leaf.
  - `total_loneliness = sum(min_dists ** p)`.
  - `total_cohesion = sum(same * inv_dm)`.
  - penalty = `alpha * total_loneliness - total_cohesion`.
- The returned objective vector is `[number_of_tables, penalty]`.

Cohesion:

- Guests/groups seated with close tree relatives increase cohesion because `1 / distance` is larger for nearby groups.
- Same-group distance is zero and does not contribute in the solver's inverse-distance matrix.

Loneliness:

- A group is lonely if its closest same-table group is far away in the tree.
- The `p` parameter makes large distances more expensive.
- The `alpha` parameter scales the loneliness penalty.

NSGA-II:

- `run_optimization` in `solver/optimizer.py` creates a `SeatingProblem`.
- It uses `NSGA2` from `pymoo`.
- `SeatingProblem._evaluate` delegates to `evaluate_population`.
- The two objectives are number of tables and penalty.
- It stops after max generations, max time, or convergence.

Initial population:

- `SeatingSampling._do` calls `generate_initial_population`.
- `generate_initial_population` mixes strategies according to proportions from `solve.py`:
  - `random`
  - `nearest_neighbor`
  - `top_down`
  - `bottom_up_merge`
  - `gnn`
  - `largest_first`
- If `gnn_model.pt` cannot be loaded, the GNN strategy silently falls back through the strategy lookup to random.

Operators and repair:

- `SeatingMutation._do` calls `mutate`.
- `mutate` can do random swap, random move, split table, merge, or nearest-neighbor move.
- `SeatingCrossover._do` calls subtree crossover.
- `crossover` chooses a random subtree, copies that subtree assignment from one parent into the other, renumbers table IDs, redistributes small tables, and calls `repair`.
- `repair` fixes over-capacity tables by moving the least cohesive member to another table with room or creating a new table.

Capacity:

- Initializers generally place groups only where they fit.
- `compact_tables` merges tables and repairs overflows; if it cannot repair, it falls back to `random_valid`.
- `repair` is used after crossover.
- `mutate` checks size constraints before swaps/moves and handles split/merge.

Returning candidates:

- `solve` in `solver/solve.py` extracts the best penalty per table count from `result.F`.
- It returns a sorted list of candidate solutions:
  - `{ tables, penalty, assignment }`
- The Flask API converts `assignment` into frontend-friendly `chunks`.

### 3.7 GNN / Research Flow

GNN exists and is meaningful, but it should be presented carefully.

Production path:

- `solver/solve.py` includes `proportions` with `'gnn': 0.10`.
- `solver/initializers.py` tries to load `gnn_model.pt`.
- If loading succeeds, `generate_initial_population` adds a `gnn` strategy using `gnn_initializer`.
- Therefore the GNN can affect production as an initial population strategy.

Not enabled in current API path:

- `GNNInjectionCallback` in `solver/optimizer.py` supports mid-run fine-tuning/injection.
- But `run_optimization` default is `gnn_inject=False`.
- `solve()` does not pass `gnn_inject=True`.
- So mid-run GNN transfer learning exists in code but is not used by the current frontend/backend request flow.

Training:

- `solver/gnn_model.py` defines:
  - `SeatingGNN`
  - `tree_to_pyg`
  - `contrastive_loss`
  - `train_gnn`
  - `gnn_initializer`
  - `finetune_gnn`
- `solver/train_and_evaluate_gnn.py` defines:
  - `step1`: trains the GNN model.
  - `step2`: evaluates initializer quality and EA convergence.

What to say if asked why GNN is used:

"The seating problem is mainly solved by NSGA-II. The GNN is used as a learned initializer: it embeds the tree structure so the initial population can include candidates that group structurally related leaves together. It is not replacing the evolutionary optimizer. In this codebase, the production path uses it only if `gnn_model.pt` is available, and mid-run GNN injection is implemented but not enabled by the current API call."

### 3.8 Viewing, Searching, and Manually Editing Seating Arrangements

Display:

- Main file: `ui/app/seating.tsx`.
- Saved arrangements are listed from `currentEvent.arrangements`.
- Selecting one sets `activeArrId`.
- `ArrangementView` displays the active arrangement.
- Tables are shown both as circular visual tables through `TableCircleNative` and as list rows.

Searching:

- `ArrangementView` stores `search`.
- `searchResults` scans `arr.tables` for guest names containing the query.
- Results show guest name and table number.

Manual editing:

- User selects a guest by pressing or long-pressing.
- This sets `movingGuest = { guestId, fromTableId }`.
- User taps a destination table.
- `handleMoveGuest(guestId, fromTableId, toTableId)`:
  - saves current tables to `undoStack`;
  - clears `redoStack`;
  - removes the guest from source table;
  - appends the guest to destination table;
  - removes empty tables;
  - calls `updateArrangement(activeArr.id, { tables: newTables })`;
  - clears `movingGuest`.

Undo/redo:

- `handleUndo` pushes current tables to `redoStack`, pops the last state from `undoStack`, and writes it through `updateArrangement`.
- `handleRedo` pushes current tables to `undoStack`, pops from `redoStack`, and writes it through `updateArrangement`.

Over-capacity:

- `overCapacityTables` is computed in `SeatingScreen` by comparing each active table's guest count to `maxTableSize`.
- `ArrangementView` displays a warning and highlights over-capacity table rows.
- Manual editing does not prevent over-capacity moves; it warns the user afterward.

Visualizations:

- `TableCircleNative` shows table circles, guests, group colors, cohesion/loneliness badges, and drag/drop hit areas.
- `computeTableMetrics` in `ui/lib/metrics.ts` calculates frontend metrics for display.
- `ColoredTree` maps group IDs to table IDs and shows whether a group is split across multiple tables.
- `VisualTree` shows the group hierarchy and edge weights, and supports focusing/moving nodes.

### 3.9 Firebase / Persistence / Sync

Login:

- `ui/lib/firebase.ts` initializes Firebase.
- `ui/lib/auth.tsx` uses:
  - `onAuthStateChanged`
  - `signInWithPopup` on web
  - native Google Sign-In plus `signInWithCredential` on mobile
  - `signOut`
- `ui/components/LoginScreen.tsx` calls `signInWithGoogle`.
- `ui/app/index.tsx` displays `LoginScreen` unless the user is logged in or chooses to continue without an account.

Firestore:

- `StoreProvider` reads Firestore from document `users/{user.uid}`.
- It expects `data.events` to be an array.
- It writes `{ events: JSON.parse(JSON.stringify(events)) }` with merge.

localStorage:

- On web, `loadFromStorage()` reads `localStorage.getItem('seating_data')`.
- `saveToStorage(events)` writes the whole events array.
- Native currently returns no local storage from these functions; native persistence depends on Firebase Auth persistence, not event local storage.

Load/write timing:

- Initial store state loads localStorage synchronously on web.
- When Firebase user appears, Firestore load runs.
- Every event state change writes localStorage.
- Firestore writes happen only after `firestoreLoaded` is true.

Limitations / risks:

- Firestore stores the whole events array in one user document, which can become large.
- There is no conflict resolution for multiple devices editing at once.
- If Firestore contains non-empty events, it replaces the local events state after login.
- Firebase config is directly in source code.
- The UI has an `arrivedConfirmed` field, but I did not find a screen action that sets it to true.

### 3.10 Deployment

Docker services:

- `solver/Dockerfile` builds a Python 3.10 image, installs PyTorch CPU, torch-geometric, solver requirements, copies solver code, exposes `5050`, and starts gunicorn with `api:app`.
- `ui/Dockerfile` builds a Node 20 image, installs npm dependencies, copies UI code, exposes `8081`, and starts Expo web.
- nginx runs from the official `nginx:alpine` image in the start scripts.

nginx routing in `nginx.conf`:

- `/about.html` -> static file `/static/about.html`
- `/demo-event.json` -> static file `/static/demo-event.json`
- `/gifs/` -> static folder
- `/` -> `http://seating-ui:8081`
- `/solve` -> `http://seating-solver:5050/solve`
- `/health` -> `http://seating-solver:5050/health`

Start/stop scripts:

- `start.bat` and `start.sh`:
  - remove existing containers;
  - create Docker network `seating`;
  - build solver and UI images;
  - optionally generate `static/demo-event.json` in `--debug` mode;
  - run `seating-solver`;
  - run `seating-ui`;
  - run `seating-nginx` on host port 80;
  - wait for `http://localhost`.
- `stop.bat` and `stop.sh` remove containers and the Docker network.

## 4. Interesting Code Areas to Present to Lecturers

### 1. Building the Solver Payload from the UI

- Why interesting: It connects user-entered event data to the algorithm.
- Files/functions: `ui/app/seating.tsx`, `guestsByGroup`, `solverGroupsPayload`, `handleGenerate`, `chunksToTables`.
- Explain verbally: The frontend sends only group structure and expected guest counts, not all guest details. Guest identities stay in the UI and are reattached after the solver returns group chunks.
- Show in code: `solverGroupsPayload` and `chunksToTables`.
- Possible question: "How do you make sure absent guests are not seated?"
- Suggested answer: "`guestsByGroup` and `solverGroupsPayload` both filter by `expectedToArrive`, so the solver only sees expected guest counts."

### 2. Normalizing the Guest Tree Before Optimization

- Why interesting: The UI allows direct guests on internal groups and oversized groups, but the optimizer works on leaves.
- Files/functions: `solver/api.py`, `_prepare_solver_groups`, `_add_leaf`, `_clean_assignment`.
- Explain verbally: The backend converts UI groups into solver leaves, adds a synthetic root if needed, creates direct guest leaves for internal groups, and chunks oversized groups.
- Show in code: `_prepare_solver_groups`.
- Possible question: "What happens if a group has children and direct guests?"
- Suggested answer: "The group becomes an internal `size: 0` node, and its direct guests become a pseudo-leaf named `_direct_<groupId>`."

### 3. Weighted Tree Distance / LCA

- Why interesting: This is a real algorithmic implementation.
- Files/functions: `solver/tree_distance.py`, `GuestTree`, `_build_euler_tour`, `_build_sparse_table`, `lca_idx`, `dist`, `precompute_dist_matrix`.
- Explain verbally: Groups are a weighted tree, and distance between two leaves is based on weighted path length through their lowest common ancestor.
- Show in code: `dist` and `precompute_dist_matrix`.
- Possible question: "How does the algorithm know who is close to whom?"
- Suggested answer: "It converts the family/group tree into weighted distances. Two groups under the same nearby branch have a smaller LCA path distance than groups separated near the root."

### 4. Fitness Function: Cohesion and Loneliness

- Why interesting: It is the heart of what "good seating" means.
- Files/functions: `solver/fitness.py`, `_eval_one`, `evaluate_population`; display equivalent in `ui/lib/metrics.ts`, `computeTableMetrics`.
- Explain verbally: Objective 1 is table count. Objective 2 rewards close groups at the same table and penalizes isolated groups whose closest same-table neighbor is far away.
- Show in code: `_eval_one`.
- Possible question: "What do alpha and p do?"
- Suggested answer: "`alpha` scales loneliness, and `p` makes large loneliness distances more severe."

### 5. Custom NSGA-II Optimization

- Why interesting: It shows use of a real multi-objective evolutionary algorithm.
- Files/functions: `solver/optimizer.py`, `SeatingProblem`, `SeatingSampling`, `SeatingMutation`, `SeatingCrossover`, `run_optimization`; `solver/solve.py`, `solve`.
- Explain verbally: NSGA-II searches for tradeoffs between fewer tables and better seating quality, then `solve` returns the best candidate per table count.
- Show in code: `run_optimization` and Pareto extraction in `solve`.
- Possible question: "Why NSGA-II?"
- Suggested answer: "Because table count and social quality conflict. NSGA-II naturally returns a Pareto set instead of forcing one fixed weighting."

### 6. Initializers / Operators / Repair

- Why interesting: It shows domain-specific optimization design beyond using a library.
- Files/functions: `solver/initializers.py`, `generate_initial_population`, `nearest_neighbor`, `bottom_up_merge`, `compact_tables`; `solver/operators.py`, `mutate`, `crossover`, `repair`.
- Explain verbally: The algorithm starts with reasonable candidates and then evolves them with seating-specific operations.
- Show in code: `generate_initial_population`, `crossover`, `repair`.
- Possible question: "How do you avoid exceeding table capacity?"
- Suggested answer: "Initializers place only fitting groups when possible, mutation checks capacity before moves/swaps, crossover calls `repair`, and `compact_tables` falls back to `random_valid` if needed."

### 7. Manual Seating Editing with Undo/Redo

- Why interesting: It shows practical UX after optimization.
- Files/functions: `ui/app/seating.tsx`, `ArrangementView`, `handleMoveGuest`, `handleUndo`, `handleRedo`, `overCapacityTables`.
- Explain verbally: The solver gives a starting arrangement, but the user can override it manually and undo/redo changes.
- Show in code: `handleMoveGuest`.
- Possible question: "Can users break capacity constraints manually?"
- Suggested answer: "Manual editing can create over-capacity tables. The UI detects and warns about those tables instead of blocking the move."

### 8. Firebase Sync Model

- Why interesting: It connects local app state with cloud persistence.
- Files/functions: `ui/lib/store.tsx`, Firestore load/save effects; `ui/lib/auth.tsx`; `ui/lib/firebase.ts`.
- Explain verbally: The app works locally without login, but when logged in it syncs the whole events array to the user document.
- Show in code: Firestore load and save effects in `StoreProvider`.
- Possible question: "What are the limitations?"
- Suggested answer: "The whole events array is stored in one document and there is no multi-device conflict resolution."

## 5. Files I Should Study Before the Presentation

| Importance | File | Suggested study time | What to understand | Functions to mark | Short explanation to say |
|---|---:|---|---|---|---|
| High | `ui/lib/store.tsx` | 60-90 min | State model, persistence, group tree operations, arrangements | `StoreProvider`, `addEvent`, `addGroup`, `moveGroup`, `getSubtreeGroups`, `addArrangement` | "This is the central state layer. All event, group, guest, and arrangement changes go through it." |
| High | `ui/app/seating.tsx` | 90-120 min | Solver request, polling, chunk conversion, saving, manual editing | `solverGroupsPayload`, `chunksToTables`, `handleGenerate`, `handleSaveCandidate`, `handleMoveGuest`, `handleUndo`, `handleRedo` | "This screen connects the UI to the optimizer and turns solver chunks back into real guest tables." |
| High | `solver/api.py` | 60 min | Flask endpoints, async jobs, UI-to-solver normalization | `_prepare_solver_groups`, `_clean_assignment`, `_run_solve`, `solve_endpoint`, `solve_status` | "The API starts background solve jobs and adapts flexible UI groups to the leaf-only solver format." |
| High | `solver/solve.py` | 30 min | Production solver entry point and Pareto candidate extraction | `solve` | "This creates the tree, runs optimization, and returns the best solution per table count." |
| High | `solver/optimizer.py` | 75-90 min | NSGA-II classes and termination | `SeatingProblem`, `SeatingSampling`, `SeatingMutation`, `SeatingCrossover`, `run_optimization` | "This wraps the seating problem for `pymoo` NSGA-II." |
| High | `solver/tree_distance.py` | 60 min | Weighted LCA distance | `GuestTree`, `lca_idx`, `dist`, `precompute_dist_matrix` | "This converts the group tree into weighted pairwise distances used by the fitness function." |
| High | `solver/fitness.py` | 45-60 min | Objectives, cohesion, loneliness | `_eval_one`, `evaluate_population` | "This defines what makes a seating assignment good or bad." |
| Medium | `solver/initializers.py` | 45 min | Initial population strategies | `generate_initial_population`, `nearest_neighbor`, `bottom_up_merge`, `compact_tables` | "These create strong starting candidates for the evolutionary algorithm." |
| Medium | `solver/operators.py` | 45 min | Mutation, crossover, repair | `mutate`, `crossover`, `repair` | "These are the domain-specific evolutionary operations." |
| Medium | `ui/app/event/[id].tsx` | 40 min | Event tree display and moving groups | `EventScreen`, `flatTree`, `searchResults` | "This is where users manage an event's guest tree." |
| Medium | `ui/app/group/[id].tsx` | 30 min | Group details, subgroups, guests, export | `GroupDetailScreen`, `handleDelete` | "This screen manages a single group and its direct guests/subgroups." |
| Medium | `ui/lib/metrics.ts` | 30 min | Frontend display metrics | `computeTableMetrics`, `treeDist` | "This recalculates cohesion and loneliness for display in saved arrangements." |
| Medium | `solver/gnn_model.py` | 45 min | GNN model and initializer role | `SeatingGNN`, `tree_to_pyg`, `gnn_initializer`, `train_gnn` | "The GNN is a learned initializer, not the main solver." |
| Low | `ui/app/_layout.tsx` | 15 min | Provider order | `Layout`, `AppStack` | "This wires theme, language, auth, and store into the app." |
| Low | `nginx.conf`, Dockerfiles, start scripts | 30 min | Deployment routing and services | nginx `location` blocks, Docker `CMD`s | "nginx routes UI and API traffic between containers." |

## 6. Expected Lecturer Questions and Prepared Answers

**Why did you choose NSGA-II?**  
Because seating quality has at least two competing goals: fewer tables and better social grouping. NSGA-II is multi-objective, so it returns tradeoff candidates instead of forcing everything into one score too early.

**How do you represent relationships between groups?**  
The frontend stores groups as a flat array with `parentId`. Each group has an `edgeWeight` to its parent. The backend converts that into a weighted tree in `GuestTree`.

**How does the algorithm know who is close to whom?**  
It computes weighted tree distance using LCA. Groups with a close common ancestor have small distance; groups separated near the root have larger distance.

**How do you avoid exceeding table capacity?**  
Initializers place groups while checking capacity, mutation checks capacity for swaps and moves, crossover calls `repair`, and `compact_tables` repairs or falls back to `random_valid`.

**What are cohesion and loneliness?**  
Cohesion rewards close groups sitting together using inverse tree distance. Loneliness penalizes a group if its nearest same-table neighbor is far away.

**What do `alpha` and `p` mean?**  
`alpha` controls how strongly loneliness affects the penalty. `p` is an exponent, so higher `p` punishes very lonely groups more strongly.

**How does the GNN fit in?**  
The GNN is used as an optional initializer if `gnn_model.pt` is available. It embeds the tree and helps create initial seating candidates. The main optimizer is still NSGA-II. Mid-run GNN injection exists but is not enabled in the current API flow.

**What happens if the solver fails?**  
The frontend catches the error in `handleGenerate`, shows an alert, and creates a random seating arrangement using `generateRandomSeating`.

**How is the data saved?**  
All events are stored in React state in `StoreProvider`. On web they are saved to localStorage. If the user is logged in, they are also written to Firestore under `users/{uid}`.

**How are generated solver chunks converted back to real guests?**  
The solver returns group IDs, table IDs, and sizes. `chunksToTables` uses `guestsByGroup` to take the next expected guests from each group and build `TableAssignment[]`.

**Can users manually change an optimized arrangement?**  
Yes. In `ArrangementView`, users select a guest and choose a target table. `handleMoveGuest` updates the saved arrangement and maintains undo/redo stacks.

**What was the hardest part?**  
A good answer: "Bridging the flexible UI data model with the optimizer. The UI allows nested groups, direct guests on internal groups, multiple roots, and oversized groups. The backend normalization makes that compatible with a leaf-only optimizer."

**What would you improve next?**  
Good answers: Firestore conflict handling, stronger validation around manual over-capacity moves, better progress reporting from the solver, and clearer separation between production GNN use and research-only scripts.

## 7. Recommended 3-5 Day Study Plan

### Day 1: Architecture and UI Flow

Files:

- `ui/app/_layout.tsx`
- `ui/lib/types.ts`
- `ui/lib/store.tsx`
- `ui/app/index.tsx`
- `ui/app/event/[id].tsx`
- `ui/app/group/[id].tsx`

Goal:

- Understand how the app starts, where state lives, and how events/groups/guests are managed.

By the end:

- You should be able to explain the data model and how a user creates an event, group tree, and guests.

### Day 2: Seating Generation Flow

Files:

- `ui/app/seating.tsx`
- `ui/lib/metrics.ts`
- `ui/components/TableCircleNative.tsx`
- `ui/components/ColoredTree.tsx`

Goal:

- Understand `handleGenerate`, `solverGroupsPayload`, polling, `chunksToTables`, saving candidates, and manual editing.

By the end:

- You should be able to draw the exact request/response flow from Generate button to saved arrangement.

### Day 3: Backend and Algorithm

Files:

- `solver/api.py`
- `solver/solve.py`
- `solver/optimizer.py`
- `solver/tree_distance.py`
- `solver/fitness.py`

Goal:

- Understand backend normalization, async jobs, NSGA-II, weighted distances, and fitness.

By the end:

- You should be able to explain the algorithm at presentation level and show the LCA/fitness code.

### Day 4: Initializers, Operators, GNN, Persistence, Deployment

Files:

- `solver/initializers.py`
- `solver/operators.py`
- `solver/gnn_model.py`
- `solver/train_and_evaluate_gnn.py`
- `ui/lib/auth.tsx`
- `ui/lib/firebase.ts`
- `nginx.conf`
- `ui/Dockerfile`
- `solver/Dockerfile`
- `start.bat` / `start.sh`

Goal:

- Understand the advanced and supporting parts.

By the end:

- You should be able to explain GNN honestly, describe capacity repair, and explain deployment routing.

### Day 5: Review and Q&A Preparation

Files:

- Re-read `ui/app/seating.tsx`
- Re-read `solver/api.py`
- Re-read `solver/tree_distance.py`
- Re-read `solver/fitness.py`
- Re-read `solver/optimizer.py`

Goal:

- Practice presentation answers and code walkthroughs.

By the end:

- You should be able to present 2-minute and 5-minute summaries, then show 2-3 interesting code areas confidently.

## 8. Two-Minute Oral Project Summary

"This project is an event seating arrangement optimizer. The user creates an event, builds a tree of guest groups such as families and subfamilies, adds guests, and marks who is expected to arrive. Each group has a weighted relationship to its parent, so the system can understand which groups are socially closer or farther apart.

On the frontend, the app is built with Expo and React Native. The central store manages events, groups, guests, seating configs, and saved arrangements, and it syncs to localStorage and Firestore when the user is logged in.

When the user generates seating, the frontend builds a compact solver payload: group IDs, parent IDs, expected guest counts, and edge weights. It sends this to a Flask backend. The backend normalizes the tree into a leaf-only format, starts an asynchronous solve job, and the frontend polls until the result is ready.

The solver uses NSGA-II to optimize two objectives: fewer tables and better seating quality. Quality is based on weighted tree distance. It rewards cohesive tables where close groups sit together and penalizes lonely groups whose closest table neighbor is far away. The result is returned as candidate arrangements, which the frontend converts back into real guest tables. Users can save arrangements, inspect cohesion/loneliness metrics, view colored tree visualizations, and manually move guests with undo and redo."

## 9. Five-Minute Technical Summary

"The frontend is an Expo React Native app using `expo-router`. Startup happens in `_layout.tsx`, which loads theme, i18n, Firebase Auth, and the central `StoreProvider`. The important data types are in `ui/lib/types.ts`: an `Event` contains a flat array of `GuestGroup` objects, a seating config, and saved arrangements. Each group stores `parentId`, direct `guests`, `edgeWeight`, and `createdAt`.

Event and guest management mostly happen through `ui/lib/store.tsx`. The store has functions for adding and cloning events, creating groups, moving groups, deleting subtrees, adding guests, toggling expected arrival, saving arrangements, and exporting subtrees to another event. The tree is not stored as nested objects; it is reconstructed from `parentId` whenever needed.

The most important frontend runtime flow is in `ui/app/seating.tsx`. When the user presses Generate, `handleGenerate` first saves the config, then builds `solverGroupsPayload`. This payload includes every group's `id`, `parentId`, expected guest count, and edge weight. Only guests with `expectedToArrive` are included. On web, the POST goes to relative `/solve`, which nginx routes to the Flask solver. The frontend receives a `jobId` and polls `/solve/<jobId>` every two seconds. When results come back, `chunksToTables` maps group chunks back to actual guest records using `guestsByGroup`, then candidate arrangements can be saved through `addArrangement`.

The backend is `solver/api.py`. `POST /solve` starts an asynchronous background thread and immediately returns a job ID. Job status is stored as JSON files in a temp directory so gunicorn workers can share status. `_prepare_solver_groups` is important because the UI model is flexible but the optimizer works on leaf nodes. It adds a synthetic root if there are multiple roots, converts direct guests on internal groups into `_direct_` leaves, and splits oversized leaf groups into `_chunk_` leaves. After optimization, `_clean_assignment` maps those artificial IDs back to real frontend group IDs and chunk sizes.

The algorithm starts in `solver/solve.py`. It creates a `GuestTree`, computes the minimum possible number of tables, and calls `run_optimization`. `GuestTree` in `solver/tree_distance.py` builds a weighted tree, Euler tour, and sparse table for LCA-based distance. Distance between groups is weighted path length through their lowest common ancestor.

`solver/optimizer.py` wraps the problem for `pymoo` NSGA-II. `SeatingProblem` evaluates assignments, `SeatingSampling` creates initial populations, and custom mutation/crossover classes call domain-specific operators. The assignment representation is an array where each leaf group is assigned a table ID. Fitness is in `solver/fitness.py`: objective one is number of tables, and objective two is `alpha * loneliness - cohesion`. Loneliness is based on each group's closest same-table neighbor distance; cohesion sums inverse distances for same-table pairs.

The initial population in `solver/initializers.py` uses random valid placement, nearest neighbor, top-down, bottom-up merge, largest-first, and optionally a GNN initializer. The operators in `solver/operators.py` include random moves, swaps, splits, merges, nearest-neighbor moves, subtree crossover, and repair for table capacity.

The GNN code is in `solver/gnn_model.py`. It builds graph embeddings from tree structure and can produce an initializer. It is best presented as a research-enhanced initializer, not as the main solver. Training/evaluation scripts exist separately.

For visualizations, `TableCircleNative` shows guests around a table, `computeTableMetrics` calculates display cohesion and loneliness, `ColoredTree` shows which groups are split across tables, and `VisualTree` shows the weighted group tree.

Persistence uses localStorage on web and Firestore when authenticated. Deployment uses three containers: UI, solver, and nginx. nginx routes `/` to the UI, `/solve` and `/health` to Flask, and static files from `static/`."

## 10. Limitations / Things Not to Overclaim

- Do not say the GNN is the main optimizer. The main production optimizer is NSGA-II. The GNN is optional as an initializer if `gnn_model.pt` is available.
- Do not claim mid-run GNN injection is active in production. `GNNInjectionCallback` exists, but `solve()` does not enable `gnn_inject=True`.
- Do not claim Firebase has robust real-time collaboration. The store writes the whole `events` array to one Firestore document and has no conflict resolution.
- Do not claim manual editing enforces table capacity. It detects and warns about over-capacity tables but does not block the move.
- Do not claim every guest field is fully used. `arrivedConfirmed` is displayed, but I did not find a normal UI action that sets it to true.
- Do not overclaim FCM notifications. Backend support exists, but the current frontend generation request does not send `fcmToken`.
- Do not claim native event persistence is implemented through localStorage. The localStorage functions only work on web.
- Do not overclaim perfect solver validation. The code has repair and capacity-aware operators, but the frontend also has fallback random seating if the solver fails.
- Do not spend much presentation time on styling-only components. Focus on store, seating flow, API normalization, NSGA-II, weighted distance, fitness, and manual editing.
