# Jira Manual Entry Backlog Plan

Use this file as a practical checklist when manually opening Jira issues. Create the Epics first, then create the child issues under the correct Epic, then add only the selected Sub-tasks where they help you track complex work. All statuses are `To Do` because the Jira issues themselves still need to be opened, even if the implementation already exists in the repository.

## Jira Creation Checklist

- [ ] Create all 7 Epics first.
- [ ] Create User Stories under the matching Epic.
- [ ] Create Technical Tasks under the matching Epic.
- [ ] Create QA Tasks under Deployment, Demo & QA.
- [ ] Add Bugs / Improvements / Technical Debt items.
- [ ] Add only the listed Sub-tasks that are useful for tracking.
- [ ] Copy labels, priorities, estimates, and relevant files into Jira.
- [ ] Review priorities before starting manual entry.

## Effort Summary by Issue Type

Parent issue estimates are broad project-work estimates. Sub-task estimates are included separately because Jira may roll them up into parent issues; avoid double-counting if your Jira board sums both parent and sub-task estimates.

| Issue Type | Number of Issues | Estimated Minimum Hours | Estimated Maximum Hours |
|---|---:|---:|---:|
| Epic | 7 | N/A | N/A |
| User Story | 18 | 188 | 319 |
| Technical Task | 9 | 170 | 303 |
| QA Task | 4 | 36 | 58 |
| Spike | 3 | 30 | 52 |
| Bug | 1 | 1 | 3 |
| Improvement / Technical Debt | 3 | 18 | 32 |
| Sub-task | 15 | 91 | 157 |
| **Total including Sub-tasks** | **60** | **534** | **924** |
| **Total excluding Sub-tasks** | **45** | **443** | **767** |

## Effort Summary by Epic

These totals include child issues but exclude Sub-tasks to avoid double-counting.

| Epic | Child Issues | Estimated Total Hours |
|---|---:|---:|
| Event Management | 1 | 10-16 |
| Guest Tree & Groups | 7 | 64-105 |
| Seating Arrangement UI | 9 | 94-164 |
| Solver API & Optimization | 5 | 101-176 |
| GNN & Research Flow | 4 | 65-117 |
| Authentication, Storage & Sync | 5 | 56-98 |
| Deployment, Demo & QA | 7 | 53-91 |

## Epics to Create First

#### EPIC-1
- **Issue Type:** Epic
- **Epic:** Event Management
- **Title:** Event Management
- **Description:** Create the event container flows: event list, create/edit/delete, open event, and clone event structure.
- **Acceptance Criteria:**
  - Event records can hold name, date, seating config, groups, and arrangements.
  - Event list supports the main event lifecycle actions.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** N/A
- **Estimated Part-Time Duration:** Jira setup only
- **Labels:** `epic`, `events`, `ui`
- **Relevant Files:** `ui/app/index.tsx`, `ui/lib/store.tsx`, `ui/lib/types.ts`
- **Notes:** Create this Epic before STORY-1.

#### EPIC-2
- **Issue Type:** Epic
- **Epic:** Guest Tree & Groups
- **Title:** Guest Tree & Groups
- **Description:** Manage the hierarchical guest tree, groups, edge weights, guests, visual tree navigation, and subtree reuse.
- **Acceptance Criteria:**
  - Groups and guests can be created, edited, moved, searched, and deleted.
  - Tree structure is available to the seating optimizer.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** N/A
- **Estimated Part-Time Duration:** Jira setup only
- **Labels:** `epic`, `groups`, `guests`, `tree`
- **Relevant Files:** `ui/lib/store.tsx`, `ui/app/event/[id].tsx`, `ui/app/group/[id].tsx`, `ui/app/tree-view.tsx`
- **Notes:** Create this Epic before STORY-2 through STORY-8.

#### EPIC-3
- **Issue Type:** Epic
- **Epic:** Seating Arrangement UI
- **Title:** Seating Arrangement UI
- **Description:** Build planner-facing seating generation, candidate review, saved arrangements, table/tree visualizations, search, export, and manual edit flows.
- **Acceptance Criteria:**
  - Planner can generate and save seating alternatives.
  - Planner can inspect and modify saved arrangements.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** N/A
- **Estimated Part-Time Duration:** Jira setup only
- **Labels:** `epic`, `seating`, `arrangements`, `ui`
- **Relevant Files:** `ui/app/seating.tsx`, `ui/components/TableCircleNative.tsx`, `ui/components/ColoredTree.tsx`
- **Notes:** Create this Epic before seating UI stories.

#### EPIC-4
- **Issue Type:** Epic
- **Epic:** Solver API & Optimization
- **Title:** Solver API & Optimization
- **Description:** Build the Flask/Gunicorn solver API and NSGA-II optimization backend used by seating generation.
- **Acceptance Criteria:**
  - Solver accepts UI tree data and returns seating candidates.
  - Optimization uses weighted tree distance and capacity constraints.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** N/A
- **Estimated Part-Time Duration:** Jira setup only
- **Labels:** `epic`, `solver`, `api`, `optimization`
- **Relevant Files:** `solver/api.py`, `solver/solve.py`, `solver/optimizer.py`, `solver/fitness.py`
- **Notes:** Create this Epic before backend solver tasks.

#### EPIC-5
- **Issue Type:** Epic
- **Epic:** GNN & Research Flow
- **Title:** GNN & Research Flow
- **Description:** Track GNN model work, training/evaluation scripts, research artifacts, and optimization experiments.
- **Acceptance Criteria:**
  - GNN initializer and research scripts are represented in Jira.
  - Validation and reproducibility work is tracked separately from product UI.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** N/A
- **Estimated Part-Time Duration:** Jira setup only
- **Labels:** `epic`, `gnn`, `research`, `ml`
- **Relevant Files:** `solver/gnn_model.py`, `solver/gnn_model.pt`, `solver/train_and_evaluate_gnn.py`, `solver/run_all.py`
- **Notes:** Keep research spikes under this Epic.

#### EPIC-6
- **Issue Type:** Epic
- **Epic:** Authentication, Storage & Sync
- **Title:** Authentication, Storage & Sync
- **Description:** Track Google sign-in, Firebase Auth, Firestore persistence, localStorage guest mode, and sync improvements.
- **Acceptance Criteria:**
  - Signed-in and guest-mode planning are represented.
  - Storage and sync risks are tracked.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** N/A
- **Estimated Part-Time Duration:** Jira setup only
- **Labels:** `epic`, `auth`, `firebase`, `sync`
- **Relevant Files:** `ui/lib/auth.tsx`, `ui/lib/store.tsx`, `ui/lib/firebase.ts`, `ui/components/LoginScreen.tsx`
- **Notes:** Create this Epic before auth/storage tickets.

#### EPIC-7
- **Issue Type:** Epic
- **Epic:** Deployment, Demo & QA
- **Title:** Deployment, Demo & QA
- **Description:** Track Docker/nginx packaging, demo mode, manual QA, smoke testing, and known cleanup issues.
- **Acceptance Criteria:**
  - Deployment scripts and routing are represented.
  - Manual QA tasks and known issues are easy to find.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** N/A
- **Estimated Part-Time Duration:** Jira setup only
- **Labels:** `epic`, `deployment`, `qa`, `docker`
- **Relevant Files:** `start.sh`, `start.bat`, `nginx.conf`, `ui/Dockerfile`, `solver/Dockerfile`
- **Notes:** Use this Epic for QA and cleanup tickets.

## Event Management

#### STORY-1
- **Issue Type:** User Story
- **Epic:** Event Management
- **Title:** Manage event records
- **Description:** As an event planner, I want to create, edit, clone, delete, and open events, so that each seating plan is managed in the correct event context.
- **Acceptance Criteria:**
  - User can create an event with name and optional date.
  - User can rename, delete, and open existing events.
  - User can clone an event's guest tree into a new event without copying arrangements.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 10-16 hours
- **Estimated Part-Time Duration:** 3-5 days
- **Labels:** `events`, `crud`, `ui`, `store`
- **Relevant Files:** `ui/app/index.tsx`, `ui/lib/store.tsx`, `ui/lib/types.ts`
- **Notes:** Covers the main landing screen and event lifecycle.

## Guest Tree & Groups

#### STORY-2
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** Organize guests into groups
- **Description:** As an event planner, I want to organize guests into groups, so that I can represent the real social structure of the event.
- **Acceptance Criteria:**
  - User can create top-level and child groups.
  - Group list renders the hierarchy with expandable rows.
  - Deleting a group also removes its descendant groups.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 14-22 hours
- **Estimated Part-Time Duration:** 4-7 days
- **Labels:** `mandatory-story`, `groups`, `tree`, `ui`
- **Relevant Files:** `ui/lib/store.tsx`, `ui/app/event/[id].tsx`, `ui/app/group/[id].tsx`, `ui/app/add-group.tsx`, `ui/components/TreeRow.tsx`
- **Notes:** Core social-structure story.

#### STORY-3
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** Configure relationship weights
- **Description:** As an event planner, I want to define relationship preferences between guest groups, so that the seating optimizer can prioritize which groups should sit in the same table.
- **Acceptance Criteria:**
  - User can set edge weight for a child group.
  - User can edit edge weight later.
  - Solver payload includes group edge weights.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 6-10 hours
- **Estimated Part-Time Duration:** 2-3 days
- **Labels:** `mandatory-story`, `edge-weight`, `solver-input`
- **Relevant Files:** `ui/app/add-group.tsx`, `ui/app/edit-group.tsx`, `ui/app/seating.tsx`, `solver/api.py`
- **Notes:** UI calls this value "Group Distance".

#### STORY-4
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** Manage guest registry
- **Description:** As an event planner, I want to add guests with relevant contact details to groups, so that I can manage all event guests from one centralized registry.
- **Acceptance Criteria:**
  - User can add guest name, phone, email, notes, and expected-arrival flag.
  - User can edit guest details and remove guests.
  - Guest records stay attached to their group.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 10-16 hours
- **Estimated Part-Time Duration:** 3-5 days
- **Labels:** `mandatory-story`, `guests`, `registry`, `forms`
- **Relevant Files:** `ui/app/add-guest.tsx`, `ui/app/edit-guest.tsx`, `ui/app/group/[id].tsx`, `ui/components/GuestCard.tsx`, `ui/lib/types.ts`
- **Notes:** `arrivedConfirmed` exists in the model, but a full check-in flow is not included.

#### STORY-5
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** Move groups in the hierarchy
- **Description:** As an event planner, I want to edit an existing guest-group hierarchy by dragging and dropping groups, so that I can quickly adjust the event's social structure without rebuilding it from scratch.
- **Acceptance Criteria:**
  - User can start moving a group from the event tree or visual tree.
  - User can select a valid destination group.
  - Moving a group into itself or its own subtree is blocked.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 12-20 hours
- **Estimated Part-Time Duration:** 4-6 days
- **Labels:** `mandatory-story`, `tree`, `move-group`, `drag-drop`
- **Relevant Files:** `ui/app/event/[id].tsx`, `ui/app/tree-view.tsx`, `ui/components/VisualTree.tsx`, `ui/lib/store.tsx`
- **Notes:** Implemented as tap-to-move behavior, not native gesture dragging.

#### STORY-6
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** Export subtree to another event
- **Description:** As an event planner, I want to export a guest tree or a selected sub-tree to another event, so that I can reuse existing guest structures instead of rebuilding them manually.
- **Acceptance Criteria:**
  - User can open export options from a group detail page.
  - User can select another event as the target.
  - Exported groups and guests receive new IDs while preserving hierarchy.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 6-10 hours
- **Estimated Part-Time Duration:** 2-3 days
- **Labels:** `mandatory-story`, `subtree-export`, `reuse`
- **Relevant Files:** `ui/app/group/[id].tsx`, `ui/lib/store.tsx`
- **Notes:** Export is between events in the same user data set.

#### STORY-7
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** Search guest registry
- **Description:** As an event planner, I want to search guests across the event tree, so that I can quickly locate and update guest records.
- **Acceptance Criteria:**
  - Search supports guest name, phone, and email.
  - Results show the containing group.
  - Tapping a result opens the guest edit flow.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 4-7 hours
- **Estimated Part-Time Duration:** 1-2 days
- **Labels:** `guests`, `search`, `ui`
- **Relevant Files:** `ui/app/event/[id].tsx`, `ui/components/GuestCard.tsx`
- **Notes:** Separate from seating-arrangement table search.

#### STORY-8
- **Issue Type:** User Story
- **Epic:** Guest Tree & Groups
- **Title:** Navigate visual guest tree
- **Description:** As an event planner, I want to inspect the guest hierarchy visually, so that large social structures are easier to understand.
- **Acceptance Criteria:**
  - Visual tree renders top-level roots and focused subtrees.
  - User can navigate by node selection and breadcrumbs.
  - Mobile view limits depth and supports parent navigation.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 12-20 hours
- **Estimated Part-Time Duration:** 4-6 days
- **Labels:** `tree-view`, `visualization`, `ui`
- **Relevant Files:** `ui/app/tree-view.tsx`, `ui/components/VisualTree.tsx`
- **Notes:** Visual tree is also reused in seating subtree flows.

## Seating Arrangement UI

#### STORY-9
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** Generate optimized seating alternatives
- **Description:** As an event planner, I want to generate several optimized seating arrangement alternatives, so that I can choose the arrangement that best satisfies the event constraints and social preferences.
- **Acceptance Criteria:**
  - User can configure max table size, family priority, strictness, and depth weighting.
  - UI calls the async solver and polls for completion.
  - Multiple candidate arrangements are listed with metrics and save actions.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 25-45 hours
- **Estimated Part-Time Duration:** 2-3 weeks
- **Labels:** `mandatory-story`, `generation`, `solver`, `seating-ui`
- **Relevant Files:** `ui/app/seating.tsx`, `solver/api.py`, `solver/solve.py`
- **Notes:** Includes UI complexity plus integration with backend polling.

#### SUBTASK-1
- **Issue Type:** Sub-task
- **Epic:** Seating Arrangement UI
- **Parent:** STORY-9
- **Title:** Build seating configuration form
- **Description:** Add controls for table size, family priority, strictness, arrangement name, and depth weighting.
- **Acceptance Criteria:**
  - Inputs update local seating configuration state.
  - Invalid empty seating generation is blocked with a clear message.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 5-8 hours
- **Estimated Part-Time Duration:** 1-2 days
- **Labels:** `subtask`, `seating-config`, `ui`
- **Relevant Files:** `ui/app/seating.tsx`
- **Notes:** Useful if you want detailed tracking under STORY-9.

#### SUBTASK-2
- **Issue Type:** Sub-task
- **Epic:** Seating Arrangement UI
- **Parent:** STORY-9
- **Title:** Implement solver polling flow
- **Description:** Start solver jobs, poll for completion, handle timeout/error, and load candidates into UI state.
- **Acceptance Criteria:**
  - POST `/solve` returns a job ID.
  - Polling stops on done, error, or timeout.
  - User sees a result or fallback path.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 8-14 hours
- **Estimated Part-Time Duration:** 2-4 days
- **Labels:** `subtask`, `solver`, `polling`
- **Relevant Files:** `ui/app/seating.tsx`, `solver/api.py`
- **Notes:** Complex integration point.

#### SUBTASK-3
- **Issue Type:** Sub-task
- **Epic:** Seating Arrangement UI
- **Parent:** STORY-9
- **Title:** Render candidate result list
- **Description:** Show generated candidates with table counts, penalty, metrics summary, save action, and discard behavior.
- **Acceptance Criteria:**
  - Candidate list supports open/save actions.
  - Unsaved candidates can be discarded safely.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 5-9 hours
- **Estimated Part-Time Duration:** 1-3 days
- **Labels:** `subtask`, `candidates`, `ui`
- **Relevant Files:** `ui/app/seating.tsx`, `ui/lib/metrics.ts`
- **Notes:** Parent estimate already includes this work.

#### STORY-10
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** Save and compare arrangements
- **Description:** As an event planner, I want to save and compare multiple seating arrangements for the same event, so that I can evaluate different options before choosing the final seating plan.
- **Acceptance Criteria:**
  - User can save generated candidates as arrangements.
  - Saved arrangements show table count and guest count.
  - User can open, rename, and delete saved arrangements.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 10-16 hours
- **Estimated Part-Time Duration:** 3-5 days
- **Labels:** `mandatory-story`, `arrangements`, `compare`, `store`
- **Relevant Files:** `ui/app/seating.tsx`, `ui/lib/store.tsx`, `ui/lib/types.ts`
- **Notes:** Comparison is through saved alternatives and metrics, not a side-by-side diff.

#### STORY-11
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** Review arrangement as table list
- **Description:** As an event planner, I want to view a seating arrangement as a table-based list, so that I can easily review which guests are assigned to each table.
- **Acceptance Criteria:**
  - Arrangement view lists every table and assigned guest.
  - User can sort by default order, cohesion, loneliness, or guest count.
  - Guest rows show group path context.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 8-14 hours
- **Estimated Part-Time Duration:** 2-4 days
- **Labels:** `mandatory-story`, `table-list`, `review`
- **Relevant Files:** `ui/app/seating.tsx`, `ui/lib/metrics.ts`, `ui/components/TableCircleNative.tsx`
- **Notes:** Table circles are part of this review experience.

#### STORY-12
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** Show color-coded seating tree
- **Description:** As an event planner, I want to view a seating arrangement as a color-coded guest-group tree, so that I can understand how table assignments relate to the event's social structure.
- **Acceptance Criteria:**
  - User can switch from table view to tree map view.
  - Tree nodes are colored by table assignments.
  - Split groups show multiple table color segments and a legend.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 12-20 hours
- **Estimated Part-Time Duration:** 4-6 days
- **Labels:** `mandatory-story`, `colored-tree`, `visualization`
- **Relevant Files:** `ui/app/seating.tsx`, `ui/components/ColoredTree.tsx`
- **Notes:** Mobile rendering limits depth for readability.

#### STORY-13
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** Manually edit seating arrangements
- **Description:** As an event planner, I want to manually modify a generated seating arrangement, so that I can handle personal preferences or special constraints that the optimizer did not fully capture.
- **Acceptance Criteria:**
  - User can select a guest and destination table.
  - Arrangement updates persist after a move.
  - Undo and redo are available for manual moves.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 18-30 hours
- **Estimated Part-Time Duration:** 1-2 weeks
- **Labels:** `mandatory-story`, `manual-edit`, `undo-redo`
- **Relevant Files:** `ui/app/seating.tsx`, `ui/lib/store.tsx`, `ui/components/TableCircleNative.tsx`
- **Notes:** Over-capacity tables are warned about but not blocked.

#### SUBTASK-4
- **Issue Type:** Sub-task
- **Epic:** Seating Arrangement UI
- **Parent:** STORY-13
- **Title:** Select and move guests between tables
- **Description:** Support selecting a guest, selecting a target table, and updating the saved arrangement.
- **Acceptance Criteria:**
  - Guest can be moved from source table to destination table.
  - Empty source tables are removed or handled cleanly.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 6-10 hours
- **Estimated Part-Time Duration:** 2-3 days
- **Labels:** `subtask`, `manual-edit`, `tables`
- **Relevant Files:** `ui/app/seating.tsx`, `ui/components/TableCircleNative.tsx`
- **Notes:** Parent estimate includes this behavior.

#### SUBTASK-5
- **Issue Type:** Sub-task
- **Epic:** Seating Arrangement UI
- **Parent:** STORY-13
- **Title:** Add undo and redo for guest moves
- **Description:** Track arrangement table snapshots so manual moves can be undone and redone.
- **Acceptance Criteria:**
  - Undo restores the previous table assignment.
  - Redo reapplies the next assignment after undo.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 5-9 hours
- **Estimated Part-Time Duration:** 1-3 days
- **Labels:** `subtask`, `undo-redo`, `manual-edit`
- **Relevant Files:** `ui/app/seating.tsx`
- **Notes:** Keep this as a sub-task because it is easy to verify separately.

#### SUBTASK-6
- **Issue Type:** Sub-task
- **Epic:** Seating Arrangement UI
- **Parent:** STORY-13
- **Title:** Show over-capacity warnings
- **Description:** Detect tables exceeding the configured maximum and warn the planner during manual edits.
- **Acceptance Criteria:**
  - Over-capacity tables are clearly highlighted.
  - Warning includes table numbers and configured maximum size.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 3-5 hours
- **Estimated Part-Time Duration:** 1-2 days
- **Labels:** `subtask`, `capacity`, `validation`
- **Relevant Files:** `ui/app/seating.tsx`
- **Notes:** Warning-only behavior is acceptable for the current product.

#### STORY-14
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** Search guest table assignment
- **Description:** As an event planner, I want to search for a specific guest's assigned table in a seating arrangement, so that I can quickly answer seating-location questions during planning or at the event.
- **Acceptance Criteria:**
  - User can search by guest name inside an active arrangement.
  - Matching results show guest name and table number.
  - Empty results are handled clearly.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 4-7 hours
- **Estimated Part-Time Duration:** 1-2 days
- **Labels:** `mandatory-story`, `search`, `day-of`
- **Relevant Files:** `ui/app/seating.tsx`
- **Notes:** Search is name-based within the active arrangement.

#### STORY-15
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** Export arrangement as text
- **Description:** As an event planner, I want to export a seating arrangement, so that I can share or print the table assignment.
- **Acceptance Criteria:**
  - Web user can download a text file from an active arrangement.
  - Export includes arrangement name, table count, guest count, and guests per table.
  - Export includes group path context for each guest.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 3-6 hours
- **Estimated Part-Time Duration:** 1-2 days
- **Labels:** `export`, `arrangements`, `web`
- **Relevant Files:** `ui/app/seating.tsx`
- **Notes:** Native share/export was not found.

#### STORY-16
- **Issue Type:** User Story
- **Epic:** Seating Arrangement UI
- **Title:** Inspect seating by subtree
- **Description:** As an event planner, I want to view seating impact for one branch of the guest tree, so that I can review how a family or group is distributed.
- **Acceptance Criteria:**
  - User can choose a subtree and a saved arrangement.
  - View filters to tables containing guests from that subtree.
  - Guests outside the selected subtree are visually marked.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 10-18 hours
- **Estimated Part-Time Duration:** 3-6 days
- **Labels:** `subtree`, `arrangements`, `review`
- **Relevant Files:** `ui/app/seating.tsx`, `ui/components/ColoredTree.tsx`, `ui/components/VisualTree.tsx`
- **Notes:** Useful implemented feature beyond the mandatory architecture stories.

#### TASK-6
- **Issue Type:** Technical Task
- **Epic:** Seating Arrangement UI
- **Title:** Add random seating fallback
- **Description:** Keep the seating flow usable if the solver request fails, returns no candidates, or times out.
- **Acceptance Criteria:**
  - UI catches solver errors and timeout cases.
  - User receives a clear fallback alert.
  - Random fallback seats all expected guests within configured table size.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 4-8 hours
- **Estimated Part-Time Duration:** 1-2 days
- **Labels:** `fallback`, `resilience`, `seating`
- **Relevant Files:** `ui/app/seating.tsx`
- **Notes:** Fallback is intentionally not optimized and mainly belongs to the frontend seating flow.

## Solver API & Optimization

#### TASK-1
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Implement async solver API
- **Description:** Build Flask endpoints for starting solver jobs and polling job status.
- **Acceptance Criteria:**
  - POST `/solve` returns a job ID.
  - GET `/solve/{jobId}` returns pending, done, or error.
  - Completed jobs return solution chunks and are cleaned up.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 16-28 hours
- **Estimated Part-Time Duration:** 1-2 weeks
- **Labels:** `api`, `async`, `flask`, `gunicorn`
- **Relevant Files:** `solver/api.py`
- **Notes:** Uses temp-directory job files for cross-worker access.

#### TASK-2
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Transform UI tree for solver
- **Description:** Normalize UI guest groups into solver-compatible leaf groups, synthetic roots, direct-guest leaves, and capacity chunks.
- **Acceptance Criteria:**
  - Multiple root groups are wrapped under a synthetic root.
  - Groups with both children and guests are split correctly.
  - Oversized leaf groups are chunked to table capacity.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 10-18 hours
- **Estimated Part-Time Duration:** 3-6 days
- **Labels:** `api-transform`, `tree`, `solver`
- **Relevant Files:** `solver/api.py`, `ui/app/seating.tsx`
- **Notes:** Important bridge between UI model and optimization model.

#### TASK-3
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Implement weighted tree distance and metrics
- **Description:** Calculate social distance, cohesion, loneliness, and table-count objectives for the solver and UI metrics.
- **Acceptance Criteria:**
  - Solver precomputes tree distances for leaf groups.
  - Fitness evaluates table count and penalty objectives.
  - UI computes table-level cohesion and loneliness summaries.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 18-30 hours
- **Estimated Part-Time Duration:** 1-2 weeks
- **Labels:** `fitness`, `metrics`, `tree-distance`
- **Relevant Files:** `solver/tree_distance.py`, `solver/fitness.py`, `ui/lib/metrics.ts`
- **Notes:** Core algorithmic foundation for optimization quality.

#### TASK-4
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Implement NSGA-II optimizer
- **Description:** Build the NSGA-II seating optimization pipeline using pymoo with custom sampling, mutation, crossover, repair, and convergence logic.
- **Acceptance Criteria:**
  - Solver creates valid capacity-respecting assignments.
  - Optimization returns Pareto-style candidates by table count and penalty.
  - Custom initializers/operators are integrated.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 45-80 hours
- **Estimated Part-Time Duration:** 3-5 weeks
- **Labels:** `nsga-ii`, `pymoo`, `optimization`, `algorithm`
- **Relevant Files:** `solver/optimizer.py`, `solver/initializers.py`, `solver/operators.py`, `solver/solve.py`
- **Notes:** Very large first-time algorithmic work.

#### SUBTASK-7
- **Issue Type:** Sub-task
- **Epic:** Solver API & Optimization
- **Parent:** TASK-4
- **Title:** Define seating optimization problem
- **Description:** Model table assignment variables, objectives, capacity behavior, and termination rules for pymoo.
- **Acceptance Criteria:**
  - Problem accepts guest-tree leaf assignments.
  - Objectives include table count and penalty.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 8-14 hours
- **Estimated Part-Time Duration:** 2-4 days
- **Labels:** `subtask`, `nsga-ii`, `problem-model`
- **Relevant Files:** `solver/optimizer.py`, `solver/fitness.py`
- **Notes:** Foundation sub-task under the solver optimizer.

#### SUBTASK-8
- **Issue Type:** Sub-task
- **Epic:** Solver API & Optimization
- **Parent:** TASK-4
- **Title:** Implement initial population strategies
- **Description:** Add random, nearest-neighbor, top-down, bottom-up merge, largest-first, and GNN-initialized seating seeds.
- **Acceptance Criteria:**
  - Initial population contains diverse valid assignments.
  - Strategy proportions can be configured.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 10-18 hours
- **Estimated Part-Time Duration:** 3-6 days
- **Labels:** `subtask`, `initializers`, `optimization`
- **Relevant Files:** `solver/initializers.py`, `solver/gnn_model.py`
- **Notes:** Helps explain why this backend task was large.

#### SUBTASK-9
- **Issue Type:** Sub-task
- **Epic:** Solver API & Optimization
- **Parent:** TASK-4
- **Title:** Implement mutation, crossover, and repair
- **Description:** Add seating-specific mutation and crossover operators that keep assignments valid.
- **Acceptance Criteria:**
  - Operators preserve or repair table-capacity validity.
  - Mutations support meaningful table/group movements.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 12-20 hours
- **Estimated Part-Time Duration:** 4-7 days
- **Labels:** `subtask`, `operators`, `repair`, `optimization`
- **Relevant Files:** `solver/operators.py`, `solver/optimizer.py`
- **Notes:** One of the most complex backend implementation pieces.

#### TASK-5
- **Issue Type:** Technical Task
- **Epic:** Solver API & Optimization
- **Title:** Manage solver concurrency
- **Description:** Control CPU thread usage when multiple solver requests run under Gunicorn workers.
- **Acceptance Criteria:**
  - Active solve count changes thread budget.
  - Fitness worker count is updated per solve.
  - Health endpoint exposes CPU and solver-thread information.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 12-20 hours
- **Estimated Part-Time Duration:** 4-6 days
- **Labels:** `performance`, `concurrency`, `solver`
- **Relevant Files:** `solver/api.py`, `solver/fitness.py`
- **Notes:** Important for avoiding CPU oversubscription.

## GNN & Research Flow

#### TASK-7
- **Issue Type:** Technical Task
- **Epic:** GNN & Research Flow
- **Title:** Integrate GNN initializer
- **Description:** Implement the GCN model, embedding-based clustering, pretrained model loading, and use of GNN as a solver initializer.
- **Acceptance Criteria:**
  - GNN converts guest trees into PyTorch Geometric data.
  - Embeddings can be converted into capacity-respecting assignments.
  - Initializer loads pretrained weights when available.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 35-65 hours
- **Estimated Part-Time Duration:** 2-4 weeks
- **Labels:** `gnn`, `initializer`, `ml`, `research`
- **Relevant Files:** `solver/gnn_model.py`, `solver/initializers.py`, `solver/optimizer.py`, `solver/gnn_model.pt`
- **Notes:** Large research/engineering task.

#### SPIKE-1
- **Issue Type:** Spike
- **Epic:** GNN & Research Flow
- **Title:** Validate GNN contribution
- **Description:** Research whether the pretrained GNN materially improves seating quality or convergence for realistic event structures.
- **Acceptance Criteria:**
  - Compare solver runs with and without GNN initialization.
  - Measure runtime, table count, penalty, and stability.
  - Document whether GNN should stay enabled by default.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 12-20 hours
- **Estimated Part-Time Duration:** 4-7 days
- **Labels:** `spike`, `gnn`, `benchmark`
- **Relevant Files:** `solver/train_and_evaluate_gnn.py`, `solver/run_all.py`, `solver/tuning_results.json`, `solver/report.pdf`
- **Notes:** Treat as research validation rather than a product feature.

#### SPIKE-2
- **Issue Type:** Spike
- **Epic:** GNN & Research Flow
- **Title:** Tune NSGA-II runtime parameters
- **Description:** Research whether population size, mutation mix, generation cap, convergence tolerance, and timeout still match acceptable UX latency.
- **Acceptance Criteria:**
  - Benchmark small, medium, and large events.
  - Compare quality/runtime tradeoffs.
  - Recommend production defaults.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 10-18 hours
- **Estimated Part-Time Duration:** 3-6 days
- **Labels:** `spike`, `nsga-ii`, `performance`
- **Relevant Files:** `solver/solve.py`, `solver/optimizer.py`, `solver/tuning_results.json`, `solver/figures/*.png`
- **Notes:** UI currently allows polling for up to 10 minutes.

#### SPIKE-3
- **Issue Type:** Spike
- **Epic:** GNN & Research Flow
- **Title:** Define model artifact lifecycle
- **Description:** Research how to version, regenerate, verify, and document `gnn_model.pt` and experiment artifacts.
- **Acceptance Criteria:**
  - Define reproducible training commands.
  - Decide whether model artifacts stay in source control.
  - Document checks for regenerated models.
- **Priority:** Low
- **Suggested Status:** To Do
- **Estimated Work Hours:** 8-14 hours
- **Estimated Part-Time Duration:** 2-5 days
- **Labels:** `spike`, `mlops`, `research`
- **Relevant Files:** `solver/gnn_model.pt`, `solver/gnn_model.py`, `solver/train_and_evaluate_gnn.py`, `solver/README.md`
- **Notes:** No artifact registry was found.

## Authentication, Storage & Sync

#### STORY-17
- **Issue Type:** User Story
- **Epic:** Authentication, Storage & Sync
- **Title:** Sign in with Google and sync data
- **Description:** As an event planner, I want to sign in with Google and sync my event data across devices, so that I can continue planning from any device.
- **Acceptance Criteria:**
  - Web uses Google popup sign-in.
  - Native flow uses Google Sign-In token and Firebase credential.
  - Firestore loads events on login and writes subsequent changes.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 18-32 hours
- **Estimated Part-Time Duration:** 1-3 weeks
- **Labels:** `mandatory-story`, `auth`, `firebase`, `firestore`
- **Relevant Files:** `ui/lib/auth.tsx`, `ui/lib/store.tsx`, `ui/lib/firebase.ts`, `ui/components/LoginScreen.tsx`
- **Notes:** Requires Firebase and Google OAuth configuration.

#### SUBTASK-10
- **Issue Type:** Sub-task
- **Epic:** Authentication, Storage & Sync
- **Parent:** STORY-17
- **Title:** Build Google sign-in UI
- **Description:** Create login screen behavior and entry points for sign-in, logout, and skip-login flow.
- **Acceptance Criteria:**
  - User can start Google sign-in from the login screen.
  - User can log out from the event list screen.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 5-8 hours
- **Estimated Part-Time Duration:** 1-2 days
- **Labels:** `subtask`, `auth`, `login-ui`
- **Relevant Files:** `ui/components/LoginScreen.tsx`, `ui/app/index.tsx`
- **Notes:** Parent estimate includes this work.

#### SUBTASK-11
- **Issue Type:** Sub-task
- **Epic:** Authentication, Storage & Sync
- **Parent:** STORY-17
- **Title:** Configure Firebase Auth flows
- **Description:** Wire Firebase Auth for web popup sign-in and native Google token sign-in.
- **Acceptance Criteria:**
  - Web auth state updates after popup sign-in.
  - Native auth uses Google credential token.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 8-14 hours
- **Estimated Part-Time Duration:** 2-4 days
- **Labels:** `subtask`, `firebase-auth`, `google-signin`
- **Relevant Files:** `ui/lib/auth.tsx`, `ui/lib/firebase.ts`, `ui/GOOGLE_SIGNIN_SETUP.md`
- **Notes:** Larger than it looks because OAuth setup can be slow.

#### STORY-18
- **Issue Type:** User Story
- **Epic:** Authentication, Storage & Sync
- **Title:** Support guest mode with local storage
- **Description:** As an event planner, I want to use the app without signing in, so that I can start planning immediately and sign in later if needed.
- **Acceptance Criteria:**
  - Unauthenticated users can skip login.
  - Events are saved to localStorage in web guest mode.
  - Sign-in remains available later.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 6-10 hours
- **Estimated Part-Time Duration:** 2-3 days
- **Labels:** `guest-mode`, `local-storage`, `auth`
- **Relevant Files:** `ui/app/index.tsx`, `ui/lib/store.tsx`, `ui/components/LoginScreen.tsx`
- **Notes:** Native local persistence appears limited compared with web localStorage.

#### TASK-8
- **Issue Type:** Technical Task
- **Epic:** Authentication, Storage & Sync
- **Title:** Persist events to Firestore
- **Description:** Save the complete event array into a Firestore user document and mirror it to browser localStorage.
- **Acceptance Criteria:**
  - Firestore document path is `users/{uid}`.
  - Event data is JSON-serialized before save to remove unsupported `undefined` values.
  - Local browser storage updates on event changes.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 18-32 hours
- **Estimated Part-Time Duration:** 1-3 weeks
- **Labels:** `firestore`, `storage`, `sync`
- **Relevant Files:** `ui/lib/store.tsx`, `ui/lib/firebase.ts`
- **Notes:** Single-document storage may become a scaling concern.

#### SUBTASK-12
- **Issue Type:** Sub-task
- **Epic:** Authentication, Storage & Sync
- **Parent:** TASK-8
- **Title:** Load Firestore events after login
- **Description:** Fetch existing event state for the authenticated user and initialize the local store.
- **Acceptance Criteria:**
  - Firestore data loads after auth state is available.
  - Missing or empty cloud state does not break local state.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 5-9 hours
- **Estimated Part-Time Duration:** 1-3 days
- **Labels:** `subtask`, `firestore`, `load`
- **Relevant Files:** `ui/lib/store.tsx`
- **Notes:** Keep merge behavior improvement separate as IMP-2.

#### SUBTASK-13
- **Issue Type:** Sub-task
- **Epic:** Authentication, Storage & Sync
- **Parent:** TASK-8
- **Title:** Save event changes to Firestore and localStorage
- **Description:** Persist updates after event, group, guest, or arrangement changes.
- **Acceptance Criteria:**
  - LocalStorage is updated for web users.
  - Firestore writes occur after cloud state is loaded.
  - Undefined values are stripped before Firestore write.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 6-10 hours
- **Estimated Part-Time Duration:** 2-3 days
- **Labels:** `subtask`, `firestore`, `persistence`
- **Relevant Files:** `ui/lib/store.tsx`
- **Notes:** Core storage implementation detail.

#### IMP-1
- **Issue Type:** Improvement / Technical Debt
- **Epic:** Authentication, Storage & Sync
- **Title:** Move config to environment variables
- **Description:** Replace hard-coded Firebase and server settings with environment/build configuration.
- **Acceptance Criteria:**
  - Firebase and server settings are read from environment or build config.
  - Local, demo, and production values can differ without source edits.
  - Setup documentation lists required variables.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 6-10 hours
- **Estimated Part-Time Duration:** 2-3 days
- **Labels:** `configuration`, `firebase`, `technical-debt`
- **Relevant Files:** `ui/lib/firebase.ts`, `ui/lib/config.ts`, `ui/google-services.json`, `ui/GOOGLE_SIGNIN_SETUP.md`
- **Notes:** Treat as security/configuration hardening.

#### IMP-2
- **Issue Type:** Improvement / Technical Debt
- **Epic:** Authentication, Storage & Sync
- **Title:** Improve sync conflict handling
- **Description:** Define safer merge behavior when a guest-mode user signs in and cloud data already exists.
- **Acceptance Criteria:**
  - Local and cloud merge rules are documented.
  - Unsynced local events are not silently lost.
  - Sync failures or conflicts are surfaced to the user.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 8-14 hours
- **Estimated Part-Time Duration:** 3-5 days
- **Labels:** `sync`, `data-loss-risk`, `technical-debt`
- **Relevant Files:** `ui/lib/store.tsx`
- **Notes:** Current behavior can replace local events with cloud events.

## Deployment, Demo & QA

#### TASK-9
- **Issue Type:** Technical Task
- **Epic:** Deployment, Demo & QA
- **Title:** Implement Docker and nginx deployment setup
- **Description:** Build the deployment setup for the UI, solver, nginx reverse proxy, routing, demo/static files, and start/stop scripts.
- **Acceptance Criteria:**
  - UI and solver have Dockerfiles.
  - nginx routes `/` to the UI and `/solve` and `/health` to the solver.
  - start/stop scripts support local demo startup and cleanup.
  - static about/demo files are routed correctly.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 12-22 hours
- **Estimated Part-Time Duration:** 4-7 days
- **Labels:** `deployment`, `docker`, `nginx`, `demo`
- **Relevant Files:** `nginx.conf`, `start.sh`, `stop.sh`, `start.bat`, `stop.bat`, `ui/Dockerfile`, `solver/Dockerfile`, `static/about.html`
- **Notes:** Create this before QA-4 if you want implementation and validation tracked separately.

#### QA-1
- **Issue Type:** QA Task
- **Epic:** Deployment, Demo & QA
- **Title:** Smoke test event and guest tree flows
- **Description:** Manually validate event, group, guest, search, move, and subtree export workflows.
- **Acceptance Criteria:**
  - Create, edit, clone, and delete events.
  - Add/edit/delete groups and guests, including edge weights.
  - Move groups and export a subtree to another event.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 8-12 hours
- **Estimated Part-Time Duration:** 2-4 days
- **Labels:** `qa`, `manual-test`, `guest-tree`
- **Relevant Files:** `ui/app/index.tsx`, `ui/app/event/[id].tsx`, `ui/app/group/[id].tsx`, `ui/app/add-group.tsx`, `ui/app/edit-group.tsx`, `ui/app/add-guest.tsx`, `ui/app/edit-guest.tsx`
- **Notes:** No automated UI test suite was found.

#### QA-2
- **Issue Type:** QA Task
- **Epic:** Deployment, Demo & QA
- **Title:** Smoke test seating generation flow
- **Description:** Validate solver generation, candidate selection, save, open, rename, delete, and fallback behavior.
- **Acceptance Criteria:**
  - Solver returns candidates for a representative event.
  - Saved arrangements persist and reopen correctly.
  - Solver-down scenario produces random fallback with a clear message.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 10-16 hours
- **Estimated Part-Time Duration:** 3-5 days
- **Labels:** `qa`, `solver`, `arrangements`
- **Relevant Files:** `ui/app/seating.tsx`, `solver/api.py`, `solver/solve.py`
- **Notes:** Run with both small and large events.

#### SUBTASK-14
- **Issue Type:** Sub-task
- **Epic:** Deployment, Demo & QA
- **Parent:** QA-2
- **Title:** Test successful solver candidate generation
- **Description:** Verify that the solver produces multiple candidates and the UI displays them correctly.
- **Acceptance Criteria:**
  - Candidate list appears after polling completes.
  - Candidate save action creates saved arrangements.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 4-6 hours
- **Estimated Part-Time Duration:** 1-2 days
- **Labels:** `subtask`, `qa`, `solver`
- **Relevant Files:** `ui/app/seating.tsx`, `solver/api.py`
- **Notes:** Use a known sample event.

#### SUBTASK-15
- **Issue Type:** Sub-task
- **Epic:** Deployment, Demo & QA
- **Parent:** QA-2
- **Title:** Test solver failure fallback
- **Description:** Verify behavior when the solver is unavailable, errors, or times out.
- **Acceptance Criteria:**
  - User sees a clear fallback message.
  - Random seating fallback contains all expected guests.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 3-5 hours
- **Estimated Part-Time Duration:** 1-2 days
- **Labels:** `subtask`, `qa`, `fallback`
- **Relevant Files:** `ui/app/seating.tsx`
- **Notes:** Useful because backend failures are realistic during demos.

#### QA-3
- **Issue Type:** QA Task
- **Epic:** Deployment, Demo & QA
- **Title:** Test arrangement review and manual edits
- **Description:** Validate table list, circular table view, colored tree view, search, guest moves, undo/redo, over-capacity warnings, and export.
- **Acceptance Criteria:**
  - Arrangement search returns correct table numbers.
  - Guest moves persist and undo/redo restores states.
  - Table export downloads expected content on web.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 10-16 hours
- **Estimated Part-Time Duration:** 3-5 days
- **Labels:** `qa`, `manual-edit`, `visualization`
- **Relevant Files:** `ui/app/seating.tsx`, `ui/components/TableCircleNative.tsx`, `ui/components/ColoredTree.tsx`, `ui/lib/metrics.ts`
- **Notes:** Include mobile-width checks if possible.

#### QA-4
- **Issue Type:** QA Task
- **Epic:** Deployment, Demo & QA
- **Title:** Test Docker and nginx deployment
- **Description:** Validate local Docker startup, nginx routing, health endpoint, demo mode, and shutdown scripts.
- **Acceptance Criteria:**
  - `start.sh` / `start.bat` starts UI, solver, and nginx containers.
  - `/`, `/solve`, `/health`, `/about.html`, and optional `/demo-event.json` route correctly.
  - `stop.sh` / `stop.bat` cleans up containers.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 8-14 hours
- **Estimated Part-Time Duration:** 2-4 days
- **Labels:** `qa`, `docker`, `deployment`
- **Relevant Files:** `start.sh`, `start.bat`, `stop.sh`, `stop.bat`, `nginx.conf`, `ui/Dockerfile`, `solver/Dockerfile`
- **Notes:** Also useful as demo readiness testing.

#### BUG-1
- **Issue Type:** Bug
- **Epic:** Deployment, Demo & QA
- **Title:** Fix missing alertOk imports
- **Description:** Some form screens call `alertOk` without importing it, which can break validation paths or TypeScript compilation.
- **Acceptance Criteria:**
  - `alertOk` is imported everywhere it is used.
  - Empty-name validation works on add/edit group and edit guest screens.
  - TypeScript build has no unresolved identifier errors.
- **Priority:** High
- **Suggested Status:** To Do
- **Estimated Work Hours:** 1-3 hours
- **Estimated Part-Time Duration:** 1 session
- **Labels:** `bug`, `typescript`, `forms`
- **Relevant Files:** `ui/app/add-group.tsx`, `ui/app/edit-group.tsx`, `ui/app/edit-guest.tsx`, `ui/lib/alert.ts`
- **Notes:** Small but high-priority cleanup.

#### IMP-3
- **Issue Type:** Improvement / Technical Debt
- **Epic:** Deployment, Demo & QA
- **Title:** Clean encoding artifacts
- **Description:** Clean mojibake/encoding artifacts in Hebrew strings, arrows, icons, and documentation diagrams.
- **Acceptance Criteria:**
  - User-facing English and Hebrew text renders correctly.
  - README and architecture diagrams are readable.
  - Source files use consistent UTF-8 encoding.
- **Priority:** Medium
- **Suggested Status:** To Do
- **Estimated Work Hours:** 4-8 hours
- **Estimated Part-Time Duration:** 1-3 days
- **Labels:** `i18n`, `docs`, `encoding`, `technical-debt`
- **Relevant Files:** `README.md`, `ProjectArchitectureDocument.md`, `ui/lib/i18n.tsx`, `ui/app/index.tsx`, `ui/app/seating.tsx`, `ui/app/tree-view.tsx`
- **Notes:** Keep this separate from feature work.

## Traceability for Mandatory Architecture User Stories

| # | Mandatory User Story | Jira Ticket | Epic |
|---:|---|---|---|
| 1 | As an event planner, I want to organize guests into groups, so that I can represent the real social structure of the event. | STORY-2 | Guest Tree & Groups |
| 2 | As an event planner, I want to define relationship preferences between guest groups, so that the seating optimizer can prioritize which groups should sit in the same table. | STORY-3 | Guest Tree & Groups |
| 3 | As an event planner, I want to add guests with relevant contact details to groups, so that I can manage all event guests from one centralized registry. | STORY-4 | Guest Tree & Groups |
| 4 | As an event planner, I want to generate several optimized seating arrangement alternatives, so that I can choose the arrangement that best satisfies the event constraints and social preferences. | STORY-9 | Seating Arrangement UI |
| 5 | As an event planner, I want to save and compare multiple seating arrangements for the same event, so that I can evaluate different options before choosing the final seating plan. | STORY-10 | Seating Arrangement UI |
| 6 | As an event planner, I want to sign in with Google and sync my event data across devices, so that I can continue planning from any device. | STORY-17 | Authentication, Storage & Sync |
| 7 | As an event planner, I want to edit an existing guest-group hierarchy by dragging and dropping groups, so that I can quickly adjust the event's social structure without rebuilding it from scratch. | STORY-5 | Guest Tree & Groups |
| 8 | As an event planner, I want to view a seating arrangement as a table-based list, so that I can easily review which guests are assigned to each table. | STORY-11 | Seating Arrangement UI |
| 9 | As an event planner, I want to view a seating arrangement as a color-coded guest-group tree, so that I can understand how table assignments relate to the event's social structure. | STORY-12 | Seating Arrangement UI |
| 10 | As an event planner, I want to manually modify a generated seating arrangement, so that I can handle personal preferences or special constraints that the optimizer did not fully capture. | STORY-13 | Seating Arrangement UI |
| 11 | As an event planner, I want to export a guest tree or a selected sub-tree to another event, so that I can reuse existing guest structures instead of rebuilding them manually. | STORY-6 | Guest Tree & Groups |
| 12 | As an event planner, I want to search for a specific guest's assigned table in a seating arrangement, so that I can quickly answer seating-location questions during planning or at the event. | STORY-14 | Seating Arrangement UI |

## Quick Manual Entry Order

1. Create `EPIC-1` through `EPIC-7`.
2. Create stories in this order: `STORY-1` through `STORY-18`.
3. Create technical tasks: `TASK-1` through `TASK-9`.
4. Create research spikes: `SPIKE-1` through `SPIKE-3`.
5. Create QA tasks: `QA-1` through `QA-4`.
6. Create cleanup items: `BUG-1`, `IMP-1`, `IMP-2`, `IMP-3`.
7. Add Sub-tasks only where useful: `SUBTASK-1` through `SUBTASK-15`.
