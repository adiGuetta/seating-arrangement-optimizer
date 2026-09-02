# Jira Backlog Plan

## 1. Project Overview

This backlog is a retrospective Jira structure for the Seating Arrangement Optimizer repository as currently implemented. The project contains an Expo / React Native Web client for event, guest-tree, seating-plan, authentication, and visualization flows, plus a Python Flask solver service using NSGA-II, weighted tree distance, heuristic initializers, and GNN research artifacts. Data is stored locally in browser storage for guest mode and synced to Firestore for signed-in users.

This file is only a manual planning summary. No Jira tickets were created, no Jira API was used, and no source files were modified.

## 2. Summary Table

| Issue Type | Count |
|---|---:|
| Epic | 7 |
| User Story | 18 |
| Technical Task | 8 |
| QA Task | 4 |
| Spike | 3 |
| Bug / Improvement | 4 |
| Sub-task | 0 |
| **Total** | **44** |

## 3. Epics

| Epic | Description | Suggested Status | Priority |
|---|---|---|---|
| Event Management | Create, edit, clone, delete, and navigate events as planning containers. | Done | High |
| Guest Tree & Groups | Build and maintain hierarchical guest groups, edge weights, guests, and reusable subtrees. | Done | High |
| Seating Arrangement UI | Generate, save, inspect, search, compare, export, and manually adjust seating arrangements. | Done | High |
| Solver API & Optimization | Expose and operate the async solver API and NSGA-II optimization pipeline. | Done | High |
| GNN & Research Flow | Maintain GNN model, training scripts, tuning artifacts, and research reproducibility. | In Progress | Medium |
| Authentication, Storage & Sync | Support Google sign-in, local guest mode, Firestore persistence, and cross-device sync. | Done | High |
| Deployment, Demo & QA | Package, route, demo, and validate the app with Docker, nginx, static assets, and QA checks. | In Progress | Medium |

## 4. Tickets Grouped by Epic

### Event Management

#### EPIC-1
- **Issue Type:** Epic
- **Epic:** Event Management
- **Title:** Event Management
- **Description:** Manage the event lifecycle and provide the main entry point for the planner.
- **Acceptance Criteria:**
  - Event list supports create, edit, delete, open, and clone flows.
  - Each event stores seating configuration, groups, arrangements, and metadata.
- **Relevant Code Files:** `ui/app/index.tsx`, `ui/lib/store.tsx`, `ui/lib/types.ts`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `events`, `ui`, `retrospective`
- **Notes:** Implemented in the landing screen and store context.

#### STORY-1
- **Issue Type:** User Story
- **Epic:** Event Management
- **Title:** Create and manage event records
- **Description:** As an event planner, I want to create, edit, clone, delete, and open events, so that each seating plan is managed in the correct planning context.
- **Acceptance Criteria:**
  - User can create an event with name and optional date.
  - User can rename, delete, and open existing events.
  - User can clone an event's guest tree into a new event without copying arrangements.
- **Relevant Code Files:** `ui/app/index.tsx`, `ui/lib/store.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `events`, `crud`, `ui`
- **Notes:** Clone flow deep-copies groups and guests with new IDs.

### Guest Tree & Groups

#### EPIC-2
- **Issue Type:** Epic
- **Epic:** Guest Tree & Groups
- **Title:** Guest Tree & Groups
- **Description:** Represent event social structure through nested groups, relationship weights, guest records, and reusable subtrees.
- **Acceptance Criteria:**
  - Groups can be created, edited, moved, reordered, deleted, and displayed as a hierarchy.
  - Guests can be added and edited with contact and attendance information.
- **Relevant Code Files:** `ui/lib/store.tsx`, `ui/app/event/[id].tsx`, `ui/app/group/[id].tsx`, `ui/app/add-group.tsx`, `ui/app/edit-group.tsx`, `ui/app/add-guest.tsx`, `ui/app/edit-guest.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `groups`, `guests`, `tree`
- **Notes:** Some validation/import issues are listed under known issues.

#### STORY-2
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** As an event planner, I want to organize guests into groups, so that I can represent the real social structure of the event.
- **Description:** Build the hierarchical group tree used by the planner and solver.
- **Acceptance Criteria:**
  - User can create top-level and child groups.
  - Group list renders hierarchy with expandable rows.
  - Group deletion removes the selected group and descendants.
- **Relevant Code Files:** `ui/lib/store.tsx`, `ui/app/event/[id].tsx`, `ui/app/group/[id].tsx`, `ui/app/add-group.tsx`, `ui/components/TreeRow.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `groups`, `tree`
- **Notes:** Exact architecture story included.

#### STORY-3
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** As an event planner, I want to define relationship preferences between guest groups, so that the seating optimizer can prioritize which groups should sit in the same table.
- **Description:** Configure relationship strength through edge weights on parent-child group relationships.
- **Acceptance Criteria:**
  - User can enter an edge weight when creating a child group.
  - User can edit edge weight on an existing group.
  - Solver payload includes edge weights for optimization.
- **Relevant Code Files:** `ui/app/add-group.tsx`, `ui/app/edit-group.tsx`, `ui/app/seating.tsx`, `solver/api.py`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `edge-weight`, `solver-input`
- **Notes:** The UI labels this as "Group Distance".

#### STORY-4
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** As an event planner, I want to add guests with relevant contact details to groups, so that I can manage all event guests from one centralized registry.
- **Description:** Maintain guest records inside groups, including contact details, notes, gift description, and expected attendance.
- **Acceptance Criteria:**
  - User can add guest name, phone, email, notes, and expected-arrival flag.
  - User can edit guest details and remove a guest.
  - Event screen search finds guests by name, phone, or email.
- **Relevant Code Files:** `ui/app/add-guest.tsx`, `ui/app/edit-guest.tsx`, `ui/app/event/[id].tsx`, `ui/components/GuestCard.tsx`, `ui/lib/types.ts`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `guests`, `registry`
- **Notes:** `arrivedConfirmed` exists in the model but no full check-in flow was found.

#### STORY-5
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** As an event planner, I want to edit an existing guest-group hierarchy by dragging and dropping groups, so that I can quickly adjust the event’s social structure without rebuilding it from scratch.
- **Description:** Move groups within the hierarchy through tap-to-move interactions in list and visual tree views.
- **Acceptance Criteria:**
  - User can start moving a group from the event tree.
  - User can select a valid destination group.
  - Moving into the group's own subtree is prevented.
- **Relevant Code Files:** `ui/app/event/[id].tsx`, `ui/app/tree-view.tsx`, `ui/components/VisualTree.tsx`, `ui/lib/store.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `tree`, `drag-drop`
- **Notes:** Implemented as tap-to-move rather than native drag gestures.

#### STORY-6
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** As an event planner, I want to export a guest tree or a selected sub-tree to another event, so that I can reuse existing guest structures instead of rebuilding them manually.
- **Description:** Reuse a group subtree by cloning it into another event.
- **Acceptance Criteria:**
  - User can open export options from a group detail page.
  - User can choose another event as the target.
  - Exported groups and guests receive new IDs and preserve hierarchy.
- **Relevant Code Files:** `ui/app/group/[id].tsx`, `ui/lib/store.tsx`
- **Suggested Status:** Done
- **Priority:** Medium
- **Labels:** `mandatory-story`, `subtree-export`, `reuse`
- **Notes:** Export is within the same user data set.

#### STORY-7
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** Search and filter the guest registry
- **Description:** As an event planner, I want to search guests across the event tree, so that I can quickly locate and update guest records.
- **Acceptance Criteria:**
  - Search supports guest name, phone, and email.
  - Results show the containing group.
  - Tapping a result opens the guest edit flow.
- **Relevant Code Files:** `ui/app/event/[id].tsx`, `ui/components/GuestCard.tsx`
- **Suggested Status:** Done
- **Priority:** Medium
- **Labels:** `guests`, `search`, `ui`
- **Notes:** This is separate from seating-arrangement table search.

#### STORY-8
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** View and navigate a visual guest tree
- **Description:** As an event planner, I want to inspect the guest hierarchy visually, so that large social structures are easier to understand.
- **Acceptance Criteria:**
  - Visual tree renders top-level roots and focused subtrees.
  - User can navigate by node selection and breadcrumbs.
  - Mobile view limits depth and allows parent navigation.
- **Relevant Code Files:** `ui/app/tree-view.tsx`, `ui/components/VisualTree.tsx`
- **Suggested Status:** Done
- **Priority:** Medium
- **Labels:** `tree-view`, `visualization`, `ui`
- **Notes:** Visual tree also supports move operations.

### Seating Arrangement UI

#### EPIC-3
- **Issue Type:** Epic
- **Epic:** Seating Arrangement UI
- **Title:** Seating Arrangement UI
- **Description:** Provide planner-facing seating generation, comparison, arrangement inspection, manual adjustment, and export tools.
- **Acceptance Criteria:**
  - User can generate candidates, save arrangements, and open saved plans.
  - User can review plans in table and color-coded tree views.
  - User can search, rename, delete, export, and manually adjust arrangements.
- **Relevant Code Files:** `ui/app/seating.tsx`, `ui/components/TableCircleNative.tsx`, `ui/components/ColoredTree.tsx`, `ui/lib/metrics.ts`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `seating`, `ui`, `arrangements`
- **Notes:** This is the broadest implemented UI area.

#### STORY-9
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** As an event planner, I want to generate several optimized seating arrangement alternatives, so that I can choose the arrangement that best satisfies the event constraints and social preferences.
- **Description:** Request optimized arrangements from the solver and present multiple candidate solutions.
- **Acceptance Criteria:**
  - User can configure max table size, family priority, and strictness.
  - UI calls the async solver and polls for completion.
  - Multiple candidate arrangements are listed with metrics and save actions.
- **Relevant Code Files:** `ui/app/seating.tsx`, `solver/api.py`, `solver/solve.py`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `generation`, `solver`
- **Notes:** UI falls back to a random candidate if the solver is unavailable.

#### STORY-10
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** As an event planner, I want to save and compare multiple seating arrangements for the same event, so that I can evaluate different options before choosing the final seating plan.
- **Description:** Save selected candidates and keep multiple arrangements under one event.
- **Acceptance Criteria:**
  - User can save generated candidates as arrangements.
  - Saved arrangements list displays table and guest counts.
  - User can open, rename, and delete saved arrangements.
- **Relevant Code Files:** `ui/app/seating.tsx`, `ui/lib/store.tsx`, `ui/lib/types.ts`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `arrangements`, `compare`
- **Notes:** Comparison is implemented through a saved list and candidate metrics, not a side-by-side diff.

#### STORY-11
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** As an event planner, I want to view a seating arrangement as a table-based list, so that I can easily review which guests are assigned to each table.
- **Description:** Display table assignments with guests, group paths, cohesion, and loneliness details.
- **Acceptance Criteria:**
  - Arrangement view lists every table and assigned guest.
  - User can sort tables by default order, cohesion, loneliness, or guest count.
  - Table entries show guest group context.
- **Relevant Code Files:** `ui/app/seating.tsx`, `ui/lib/metrics.ts`, `ui/components/TableCircleNative.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `table-list`, `review`
- **Notes:** Circular table visualization is also displayed.

#### STORY-12
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** As an event planner, I want to view a seating arrangement as a color-coded guest-group tree, so that I can understand how table assignments relate to the event’s social structure.
- **Description:** Show table assignment distribution over the group hierarchy using table colors.
- **Acceptance Criteria:**
  - User can switch from table view to tree map view.
  - Tree nodes are colored by table assignments.
  - Split groups display multiple table color segments and a legend.
- **Relevant Code Files:** `ui/app/seating.tsx`, `ui/components/ColoredTree.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `colored-tree`, `visualization`
- **Notes:** Mobile tree depth is limited for readability.

#### STORY-13
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** As an event planner, I want to manually modify a generated seating arrangement, so that I can handle personal preferences or special constraints that the optimizer did not fully capture.
- **Description:** Move guests between saved arrangement tables after generation.
- **Acceptance Criteria:**
  - User can select a guest and destination table.
  - Arrangement updates persist in store after a move.
  - Undo and redo are available for manual moves.
- **Relevant Code Files:** `ui/app/seating.tsx`, `ui/lib/store.tsx`, `ui/components/TableCircleNative.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `manual-edit`, `undo-redo`
- **Notes:** Over-capacity tables are warned about but not blocked.

#### STORY-14
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** As an event planner, I want to search for a specific guest’s assigned table in a seating arrangement, so that I can quickly answer seating-location questions during planning or at the event.
- **Description:** Search within an active seating arrangement and show the guest's assigned table.
- **Acceptance Criteria:**
  - User can enter a guest name in the arrangement search field.
  - Matching results show guest name and table number.
  - Empty results are handled clearly.
- **Relevant Code Files:** `ui/app/seating.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `search`, `day-of`
- **Notes:** Search is name-based within the active arrangement.

#### STORY-15
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** Export a saved seating arrangement as text
- **Description:** As an event planner, I want to export a seating arrangement, so that I can share or print the table assignment.
- **Acceptance Criteria:**
  - User can download a text file from an active arrangement on web.
  - Export includes arrangement name, table count, guest count, and guests per table.
  - Export includes group path context for each guest.
- **Relevant Code Files:** `ui/app/seating.tsx`
- **Suggested Status:** Done
- **Priority:** Medium
- **Labels:** `export`, `arrangements`, `web`
- **Notes:** Native sharing/export was not found.

#### STORY-16
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** Inspect seating for a selected subtree
- **Description:** As an event planner, I want to view the seating impact for one branch of the guest tree, so that I can review how a family or group is distributed.
- **Acceptance Criteria:**
  - User can choose a subtree and a saved arrangement.
  - View filters to tables containing guests from that subtree.
  - Outside-subtree guests are visually marked in context.
- **Relevant Code Files:** `ui/app/seating.tsx`, `ui/components/ColoredTree.tsx`, `ui/components/VisualTree.tsx`
- **Suggested Status:** Done
- **Priority:** Medium
- **Labels:** `subtree`, `arrangements`, `review`
- **Notes:** This is an implemented extension beyond the original story list.

### Solver API & Optimization

#### EPIC-4
- **Issue Type:** Epic
- **Epic:** Solver API & Optimization
- **Title:** Solver API & Optimization
- **Description:** Provide the backend solver service, API transformations, async job execution, and optimization algorithm.
- **Acceptance Criteria:**
  - `/solve` starts an async job and `/solve/{jobId}` returns status/results.
  - Solver handles UI tree edge cases before optimization.
  - NSGA-II returns Pareto-style solutions by table count and penalty.
- **Relevant Code Files:** `solver/api.py`, `solver/solve.py`, `solver/optimizer.py`, `solver/fitness.py`, `solver/tree_distance.py`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `solver`, `api`, `optimization`
- **Notes:** Persistence of job files is temporary and cleaned after polling.

#### TASK-1
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Implement async solver API and polling lifecycle
- **Description:** Start solver jobs asynchronously and expose pollable completion status.
- **Acceptance Criteria:**
  - POST `/solve` returns a job ID without waiting for optimization.
  - GET `/solve/{jobId}` returns pending, done, or error states.
  - Completed jobs return solution chunks and are removed from temporary storage.
- **Relevant Code Files:** `solver/api.py`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `api`, `async`, `flask`
- **Notes:** Uses temp-directory job files for cross-worker visibility.

#### TASK-2
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Transform UI guest groups into solver-compatible trees
- **Description:** Normalize UI group input into solver leaves, including synthetic roots, direct-guest leaves, and capacity chunks.
- **Acceptance Criteria:**
  - Multiple root groups are wrapped under a synthetic root.
  - Groups with both children and guests are split into internal and direct leaf nodes.
  - Oversized leaf groups are chunked to respect table capacity.
- **Relevant Code Files:** `solver/api.py`, `ui/app/seating.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `api-transform`, `tree`, `solver`
- **Notes:** `_clean_assignment` maps solver chunks back to real group IDs.

#### TASK-3
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Implement weighted tree distance and seating fitness metrics
- **Description:** Calculate social distance, cohesion, loneliness, and table-count objectives for optimization and display.
- **Acceptance Criteria:**
  - Solver precomputes tree distances for leaf groups.
  - Optimization evaluates table count and penalty objectives.
  - UI computes table-level cohesion and loneliness metrics.
- **Relevant Code Files:** `solver/tree_distance.py`, `solver/fitness.py`, `ui/lib/metrics.ts`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `fitness`, `metrics`, `tree-distance`
- **Notes:** UI and solver metrics are related but independently implemented.

#### TASK-4
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Implement NSGA-II optimization pipeline
- **Description:** Use pymoo NSGA-II with custom sampling, mutation, crossover, and convergence controls.
- **Acceptance Criteria:**
  - Solver runs NSGA-II with custom seating problem definitions.
  - Initial population combines heuristic and GNN-based strategies.
  - Optimization stops on generation, time, or convergence limits.
- **Relevant Code Files:** `solver/optimizer.py`, `solver/initializers.py`, `solver/operators.py`, `solver/solve.py`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `nsga-ii`, `pymoo`, `optimization`
- **Notes:** Production path sets `gnn_inject` off but uses GNN as an initializer proportion when available.

#### TASK-5
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Manage solver CPU thread budget under concurrent requests
- **Description:** Avoid CPU oversubscription when multiple solver jobs run at once.
- **Acceptance Criteria:**
  - Active solve count changes thread budget.
  - Fitness worker count is updated for each solve.
  - Health endpoint exposes CPU and solver-thread information.
- **Relevant Code Files:** `solver/api.py`, `solver/fitness.py`
- **Suggested Status:** Done
- **Priority:** Medium
- **Labels:** `performance`, `concurrency`, `solver`
- **Notes:** Active counter is process-shared through `multiprocessing.Value`.

#### TASK-6
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Provide random seating fallback when solver is unavailable
- **Description:** Keep the user flow usable if the solver request fails or times out.
- **Acceptance Criteria:**
  - UI catches solver errors and timeout cases.
  - User receives a clear fallback alert.
  - Random candidate seats all expected guests within configured table size.
- **Relevant Code Files:** `ui/app/seating.tsx`
- **Suggested Status:** Done
- **Priority:** Medium
- **Labels:** `fallback`, `resilience`, `seating`
- **Notes:** Fallback candidates are not optimized and should be visually distinguishable in future improvements.

### GNN & Research Flow

#### EPIC-5
- **Issue Type:** Epic
- **Epic:** GNN & Research Flow
- **Title:** GNN & Research Flow
- **Description:** Support research, training, tuning, and evaluation of GNN-assisted seating initialization.
- **Acceptance Criteria:**
  - GNN model architecture and pretrained weights are present.
  - Training and evaluation scripts are available.
  - Report and figures document the research results.
- **Relevant Code Files:** `solver/gnn_model.py`, `solver/gnn_model.pt`, `solver/train_and_evaluate_gnn.py`, `solver/run_all.py`, `solver/report.pdf`
- **Suggested Status:** In Progress
- **Priority:** Medium
- **Labels:** `gnn`, `research`, `ml`
- **Notes:** Research artifacts exist, but production validation and operational model management are not fully visible.

#### TASK-7
- **Issue Type:** Technical Task
- **Epic:** GNN & Research Flow
- **Title:** Implement GNN model and initializer integration
- **Description:** Maintain the GCN model, embedding-based clustering, and initializer used by optimization.
- **Acceptance Criteria:**
  - GNN converts guest trees into PyTorch Geometric data.
  - Embeddings can be converted into capacity-respecting assignments.
  - Initializer loads pretrained weights when available.
- **Relevant Code Files:** `solver/gnn_model.py`, `solver/initializers.py`, `solver/optimizer.py`, `solver/gnn_model.pt`
- **Suggested Status:** Done
- **Priority:** Medium
- **Labels:** `gnn`, `initializer`, `ml`
- **Notes:** GNN load is best-effort and silently disabled if unavailable.

#### SPIKE-1
- **Issue Type:** Spike
- **Epic:** GNN & Research Flow
- **Title:** Validate GNN contribution in production-sized events
- **Description:** Research whether the pretrained GNN materially improves arrangement quality and convergence for realistic event structures.
- **Acceptance Criteria:**
  - Compare solver runs with and without GNN initialization.
  - Measure runtime, table count, penalty, and stability across seeds.
  - Document whether GNN should remain enabled by default.
- **Relevant Code Files:** `solver/train_and_evaluate_gnn.py`, `solver/run_all.py`, `solver/tuning_results.json`, `solver/report.pdf`
- **Suggested Status:** Backlog
- **Priority:** Medium
- **Labels:** `spike`, `gnn`, `benchmark`
- **Notes:** Existing report claims improvement, but this backlog item is for project-specific acceptance evidence.

#### SPIKE-2
- **Issue Type:** Spike
- **Epic:** GNN & Research Flow
- **Title:** Review NSGA-II parameter tuning for current UX latency targets
- **Description:** Research whether population size, mutation mix, generation cap, and convergence tolerance still match desired user wait times.
- **Acceptance Criteria:**
  - Run representative small, medium, and large event benchmarks.
  - Compare quality/runtime tradeoffs for configured parameters.
  - Recommend production defaults and timeout behavior.
- **Relevant Code Files:** `solver/solve.py`, `solver/optimizer.py`, `solver/tuning_results.json`, `solver/figures/*.png`
- **Suggested Status:** Backlog
- **Priority:** Medium
- **Labels:** `spike`, `nsga-ii`, `performance`
- **Notes:** Current UI waits up to 10 minutes.

#### SPIKE-3
- **Issue Type:** Spike
- **Epic:** GNN & Research Flow
- **Title:** Define model artifact lifecycle and reproducibility approach
- **Description:** Research how to version, regenerate, and verify `gnn_model.pt` and experiment artifacts.
- **Acceptance Criteria:**
  - Define expected training inputs and reproducible commands.
  - Decide whether model artifacts remain in source control.
  - Document acceptance checks for regenerated models.
- **Relevant Code Files:** `solver/gnn_model.pt`, `solver/gnn_model.py`, `solver/train_and_evaluate_gnn.py`, `solver/README.md`
- **Suggested Status:** Backlog
- **Priority:** Low
- **Labels:** `spike`, `mlops`, `research`
- **Notes:** No external artifact registry or model metadata was found.

### Authentication, Storage & Sync

#### EPIC-6
- **Issue Type:** Epic
- **Epic:** Authentication, Storage & Sync
- **Title:** Authentication, Storage & Sync
- **Description:** Support guest-mode local planning and signed-in cloud sync through Firebase.
- **Acceptance Criteria:**
  - User can sign in with Google or continue without account.
  - Events persist locally in browser storage.
  - Signed-in users load and save event data through Firestore.
- **Relevant Code Files:** `ui/lib/auth.tsx`, `ui/lib/store.tsx`, `ui/lib/firebase.ts`, `ui/components/LoginScreen.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `auth`, `firebase`, `sync`
- **Notes:** Conflict resolution is basic last-write style.

#### STORY-17
- **Issue Type:** User Story
- **Epic:** Authentication, Storage & Sync
- **Title:** As an event planner, I want to sign in with Google and sync my event data across devices, so that I can continue planning from any device.
- **Description:** Authenticate with Google and persist events to Firestore for the current Firebase user.
- **Acceptance Criteria:**
  - Web uses Google popup sign-in.
  - Native flow uses Google Sign-In token and Firebase credential.
  - Firestore loads events on login and writes subsequent changes.
- **Relevant Code Files:** `ui/lib/auth.tsx`, `ui/lib/store.tsx`, `ui/lib/firebase.ts`, `ui/components/LoginScreen.tsx`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `mandatory-story`, `auth`, `firestore`
- **Notes:** Requires Firebase and Google client configuration outside the repo.

#### STORY-18
- **Issue Type:** User Story
- **Epic:** Authentication, Storage & Sync
- **Title:** Continue planning without an account
- **Description:** As an event planner, I want to use the app without signing in, so that I can start planning immediately and sign in later if needed.
- **Acceptance Criteria:**
  - Unauthenticated users can skip login.
  - Events are saved to localStorage in web guest mode.
  - Sign-in entry remains available from the event list screen.
- **Relevant Code Files:** `ui/app/index.tsx`, `ui/lib/store.tsx`, `ui/components/LoginScreen.tsx`
- **Suggested Status:** Done
- **Priority:** Medium
- **Labels:** `guest-mode`, `local-storage`, `auth`
- **Notes:** Native local persistence appears limited because `loadFromStorage` returns empty outside web.

#### TASK-8
- **Issue Type:** Technical Task
- **Epic:** Authentication, Storage & Sync
- **Title:** Implement serialized Firestore persistence for event state
- **Description:** Persist the entire event array into a single Firestore user document and mirror it to localStorage.
- **Acceptance Criteria:**
  - Firestore document path is `users/{uid}`.
  - Event data is JSON-serialized before saving to strip unsupported `undefined` values.
  - Local browser storage is updated on event changes.
- **Relevant Code Files:** `ui/lib/store.tsx`, `ui/lib/firebase.ts`
- **Suggested Status:** Done
- **Priority:** High
- **Labels:** `firestore`, `storage`, `sync`
- **Notes:** Single-document storage may become a scaling concern for large event datasets.

#### BUG-1
- **Issue Type:** Improvement
- **Epic:** Authentication, Storage & Sync
- **Title:** Replace hard-coded Firebase and server configuration with environment-based configuration
- **Description:** Configuration values are committed directly in TypeScript files and point to a specific Firebase project and LAN server.
- **Acceptance Criteria:**
  - App reads Firebase and server settings from environment/build configuration.
  - Local, demo, and production values can be changed without source edits.
  - Documentation explains required variables.
- **Relevant Code Files:** `ui/lib/firebase.ts`, `ui/lib/config.ts`, `ui/google-services.json`, `ui/GOOGLE_SIGNIN_SETUP.md`
- **Suggested Status:** Backlog
- **Priority:** Medium
- **Labels:** `configuration`, `firebase`, `security-hardening`
- **Notes:** Treat as an improvement unless these credentials are not intended to be public.

#### BUG-2
- **Issue Type:** Improvement
- **Epic:** Authentication, Storage & Sync
- **Title:** Improve sync merge and conflict behavior after login
- **Description:** Firestore load replaces local data when cloud data exists, which can lose local guest-mode changes made before login.
- **Acceptance Criteria:**
  - Define merge rules for local and cloud events on login.
  - Preserve unsynced guest-mode events unless the user confirms replacement.
  - Surface sync failures or conflicts to the user.
- **Relevant Code Files:** `ui/lib/store.tsx`
- **Suggested Status:** Backlog
- **Priority:** Medium
- **Labels:** `sync`, `data-loss-risk`, `improvement`
- **Notes:** Current implementation logs Firestore failures to console.

### Deployment, Demo & QA

#### EPIC-7
- **Issue Type:** Epic
- **Epic:** Deployment, Demo & QA
- **Title:** Deployment, Demo & QA
- **Description:** Package the UI and solver, route traffic through nginx, provide demo mode, and validate main user flows.
- **Acceptance Criteria:**
  - Dockerfiles exist for UI and solver services.
  - nginx proxies UI, solver, health, static about page, and demo event.
  - Start/stop scripts support local demo operation.
- **Relevant Code Files:** `ui/Dockerfile`, `solver/Dockerfile`, `nginx.conf`, `start.sh`, `stop.sh`, `start.bat`, `stop.bat`
- **Suggested Status:** In Progress
- **Priority:** Medium
- **Labels:** `deployment`, `demo`, `qa`
- **Notes:** Scripts are present but not executed during this scan.

#### QA-1
- **Issue Type:** QA Task
- **Epic:** Deployment, Demo & QA
- **Title:** Smoke test event and guest-tree management flows
- **Description:** Manually validate the core event, group, guest, search, move, and subtree export workflows.
- **Acceptance Criteria:**
  - Create, edit, clone, and delete events.
  - Add/edit/delete groups and guests, including edge weights.
  - Move groups and export a subtree to another event.
- **Relevant Code Files:** `ui/app/index.tsx`, `ui/app/event/[id].tsx`, `ui/app/group/[id].tsx`, `ui/app/add-group.tsx`, `ui/app/edit-group.tsx`, `ui/app/add-guest.tsx`, `ui/app/edit-guest.tsx`
- **Suggested Status:** Backlog
- **Priority:** High
- **Labels:** `qa`, `manual-test`, `guest-tree`
- **Notes:** No automated UI test suite was found.

#### QA-2
- **Issue Type:** QA Task
- **Epic:** Deployment, Demo & QA
- **Title:** Smoke test solver generation and saved arrangement flows
- **Description:** Validate generation, candidate selection, save, open, rename, delete, and fallback behavior.
- **Acceptance Criteria:**
  - Solver returns multiple candidates for a representative event.
  - Saved arrangements persist and can be reopened.
  - Solver-down scenario produces a random fallback with a clear message.
- **Relevant Code Files:** `ui/app/seating.tsx`, `solver/api.py`, `solver/solve.py`
- **Suggested Status:** Backlog
- **Priority:** High
- **Labels:** `qa`, `solver`, `arrangements`
- **Notes:** Should be run against both a small and large event.

#### QA-3
- **Issue Type:** QA Task
- **Epic:** Deployment, Demo & QA
- **Title:** Validate arrangement review and manual editing UX
- **Description:** Test table list, circular table view, colored tree view, search, guest moves, undo/redo, and exports.
- **Acceptance Criteria:**
  - Arrangement search returns correct table numbers.
  - Guest moves persist and undo/redo restores prior states.
  - Table export downloads expected content on web.
- **Relevant Code Files:** `ui/app/seating.tsx`, `ui/components/TableCircleNative.tsx`, `ui/components/ColoredTree.tsx`, `ui/lib/metrics.ts`
- **Suggested Status:** Backlog
- **Priority:** High
- **Labels:** `qa`, `manual-edit`, `visualization`
- **Notes:** Include over-capacity warning behavior.

#### QA-4
- **Issue Type:** QA Task
- **Epic:** Deployment, Demo & QA
- **Title:** Validate deployment scripts and container routing
- **Description:** Check local Docker startup, nginx routing, health endpoint, demo mode, and shutdown scripts.
- **Acceptance Criteria:**
  - `start.sh` / `start.bat` starts UI, solver, and nginx containers.
  - `/`, `/solve`, `/health`, `/about.html`, and optional `/demo-event.json` route correctly.
  - `stop.sh` / `stop.bat` cleans up containers.
- **Relevant Code Files:** `start.sh`, `start.bat`, `stop.sh`, `stop.bat`, `nginx.conf`, `ui/Dockerfile`, `solver/Dockerfile`
- **Suggested Status:** Backlog
- **Priority:** Medium
- **Labels:** `qa`, `docker`, `deployment`
- **Notes:** Not executed during this read-only scan.

#### BUG-3
- **Issue Type:** Bug
- **Epic:** Deployment, Demo & QA
- **Title:** Fix missing `alertOk` imports in form screens
- **Description:** Several screens call `alertOk` without importing it, which can break validation paths at runtime or compile time.
- **Acceptance Criteria:**
  - `alertOk` is imported where used.
  - Empty-name validation works on add/edit group and edit guest screens.
  - TypeScript compile catches no unresolved identifiers.
- **Relevant Code Files:** `ui/app/add-group.tsx`, `ui/app/edit-group.tsx`, `ui/app/edit-guest.tsx`, `ui/lib/alert.ts`
- **Suggested Status:** Backlog
- **Priority:** High
- **Labels:** `bug`, `typescript`, `forms`
- **Notes:** Observed by code inspection only; no build was run.

#### BUG-4
- **Issue Type:** Improvement
- **Epic:** Deployment, Demo & QA
- **Title:** Clean encoding artifacts in user-facing text and documentation
- **Description:** Several files show mojibake/encoding artifacts in Hebrew strings, arrows, icons, and README diagrams.
- **Acceptance Criteria:**
  - User-facing strings render correctly in English and Hebrew.
  - README architecture diagram and text are readable.
  - Source files are consistently encoded as UTF-8.
- **Relevant Code Files:** `README.md`, `ProjectArchitectureDocument.md`, `ui/lib/i18n.tsx`, `ui/app/index.tsx`, `ui/app/seating.tsx`, `ui/app/tree-view.tsx`
- **Suggested Status:** Backlog
- **Priority:** Medium
- **Labels:** `i18n`, `docs`, `encoding`
- **Notes:** This scan did not modify any source files.

## 5. Traceability Table for Mandatory Architecture Stories

| # | Mandatory User Story | Included As | Epic | Suggested Status |
|---:|---|---|---|---|
| 1 | As an event planner, I want to organize guests into groups, so that I can represent the real social structure of the event. | STORY-2 | Guest Tree & Groups | Done |
| 2 | As an event planner, I want to define relationship preferences between guest groups, so that the seating optimizer can prioritize which groups should sit in the same table. | STORY-3 | Guest Tree & Groups | Done |
| 3 | As an event planner, I want to add guests with relevant contact details to groups, so that I can manage all event guests from one centralized registry. | STORY-4 | Guest Tree & Groups | Done |
| 4 | As an event planner, I want to generate several optimized seating arrangement alternatives, so that I can choose the arrangement that best satisfies the event constraints and social preferences. | STORY-9 | Seating Arrangement UI | Done |
| 5 | As an event planner, I want to save and compare multiple seating arrangements for the same event, so that I can evaluate different options before choosing the final seating plan. | STORY-10 | Seating Arrangement UI | Done |
| 6 | As an event planner, I want to sign in with Google and sync my event data across devices, so that I can continue planning from any device. | STORY-17 | Authentication, Storage & Sync | Done |
| 7 | As an event planner, I want to edit an existing guest-group hierarchy by dragging and dropping groups, so that I can quickly adjust the event’s social structure without rebuilding it from scratch. | STORY-5 | Guest Tree & Groups | Done |
| 8 | As an event planner, I want to view a seating arrangement as a table-based list, so that I can easily review which guests are assigned to each table. | STORY-11 | Seating Arrangement UI | Done |
| 9 | As an event planner, I want to view a seating arrangement as a color-coded guest-group tree, so that I can understand how table assignments relate to the event’s social structure. | STORY-12 | Seating Arrangement UI | Done |
| 10 | As an event planner, I want to manually modify a generated seating arrangement, so that I can handle personal preferences or special constraints that the optimizer did not fully capture. | STORY-13 | Seating Arrangement UI | Done |
| 11 | As an event planner, I want to export a guest tree or a selected sub-tree to another event, so that I can reuse existing guest structures instead of rebuilding them manually. | STORY-6 | Guest Tree & Groups | Done |
| 12 | As an event planner, I want to search for a specific guest’s assigned table in a seating arrangement, so that I can quickly answer seating-location questions during planning or at the event. | STORY-14 | Seating Arrangement UI | Done |

## 6. Notes / Assumptions

### What Appears Fully Implemented

- Event CRUD and clone flow are implemented in `ui/app/index.tsx` and `ui/lib/store.tsx`.
- Guest group hierarchy, edge weights, group move/reorder, guest CRUD, expected-attendance flag, and subtree export are implemented in the UI/store.
- Seating generation flow calls the solver asynchronously, polls for results, shows multiple candidates, and saves arrangements.
- Saved arrangement review includes table list, circular table visualization, metrics, search by guest name, colored tree map, rename/delete, manual guest moves, undo/redo, and web text export.
- Google sign-in, guest mode, localStorage persistence on web, and Firestore load/save are implemented.
- Solver API, tree transformation, NSGA-II pipeline, fitness evaluation, custom operators, initializers, health endpoint, and Docker/nginx deployment files are present.

### What Appears Partially Implemented

- Drag-and-drop is implemented as tap-to-move interactions rather than native drag gestures.
- Arrangement comparison exists as saved alternatives and candidate metrics, not a side-by-side comparison screen.
- Native/offline storage appears weaker than web localStorage because local storage helpers return empty outside web.
- FCM notification support exists server-side, but the UI request does not appear to send an FCM token.
- GNN research and model files exist, but production acceptance evidence and artifact lifecycle are not fully documented in code.
- Deployment scripts exist but were not run during this scan.

### What Was Not Included Because It Was Not Found in the Code

- No sub-tasks were created.
- No REST CRUD API for events/groups/guests was found; those flows are client-side store/Firebase flows.
- No automated end-to-end UI test suite was found.
- No formal CI/CD pipeline configuration was found.
- No explicit role-based access control, sharing between users, or multi-user collaboration feature was found.
- No complete day-of check-in workflow was found, although `arrivedConfirmed` exists in the data model.

### Key Files Scanned

- Documentation: `README.md`, `ProjectArchitectureDocument.md`, `solver/README.md`
- UI app routes: `ui/app/index.tsx`, `ui/app/event/[id].tsx`, `ui/app/group/[id].tsx`, `ui/app/seating.tsx`, `ui/app/tree-view.tsx`, `ui/app/add-group.tsx`, `ui/app/edit-group.tsx`, `ui/app/add-guest.tsx`, `ui/app/edit-guest.tsx`
- UI libraries/components: `ui/lib/store.tsx`, `ui/lib/types.ts`, `ui/lib/auth.tsx`, `ui/lib/firebase.ts`, `ui/lib/config.ts`, `ui/lib/i18n.tsx`, `ui/lib/metrics.ts`, `ui/components/VisualTree.tsx`, `ui/components/ColoredTree.tsx`, `ui/components/TableCircleNative.tsx`, `ui/components/GuestCard.tsx`, `ui/components/TreeRow.tsx`, `ui/components/LoginScreen.tsx`
- Solver: `solver/api.py`, `solver/solve.py`, `solver/optimizer.py`, `solver/fitness.py`, `solver/tree_distance.py`, `solver/initializers.py`, `solver/operators.py`, `solver/gnn_model.py`, `solver/train_and_evaluate_gnn.py`, `solver/run_all.py`, `solver/synthetic.py`
- Deployment/demo: `nginx.conf`, `start.sh`, `stop.sh`, `start.bat`, `stop.bat`, `ui/Dockerfile`, `solver/Dockerfile`, `static/about.html`
