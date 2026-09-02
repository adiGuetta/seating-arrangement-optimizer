# Project Presentation / Video Guide

This guide is based on inspection of the implementation in this repository. The goal is a short academic presentation or narrated video, approximately 3-5 minutes, focused on the central ideas rather than exhaustive code documentation.

## A. Project Explanation - 5-8 Sentences

This project is a full-stack event-management and seating-arrangement system for events such as weddings, parties, or organizational gatherings. Users create events, organize guests into hierarchical social or family groups, mark which guests are expected to arrive, and request optimized seating arrangements. The key modeling idea is that guests are not treated as a flat list: each guest belongs to a group, groups can have parent/child relationships, and weighted tree distance is used as a proxy for social closeness. The backend converts the UI group tree into a solver tree, handles edge cases such as multiple roots, direct guests on internal groups, and groups larger than table capacity, then runs a multi-objective evolutionary optimizer. The optimizer uses NSGA-II to search over assignments of leaf groups to tables, optimizing table count separately from a social penalty based on loneliness and cohesion. Several heuristic initializers seed the population, and a trained GNN can contribute some initial candidates when `gnn_model.pt` is available; the GNN is not the main solver. The frontend returns multiple candidate arrangements, lets the user save one, inspect table-level metrics, view colored tree/table visualizations, and manually move guests afterward.

## B. What The Presentation Should Communicate

1. Seating is not just bin packing: capacity matters, but social relationships also determine whether an arrangement is good.
2. The project's central representation is a hierarchical guest tree, where tree distance and edge weights estimate social closeness between groups.
3. The solver is multi-objective: it searches for trade-offs between fewer tables and better social grouping, rather than producing one universal "best" answer.
4. NSGA-II is useful because the search space is combinatorial; heuristic and GNN-based initializers help start the search from plausible arrangements.
5. The app is an end-to-end system: users manage real event data, generate candidates, compare results, save arrangements, and manually adjust tables.

## C. What Should NOT Be Included

- Do not present Firebase Authentication, Firestore, localStorage, localization, theming, Docker, nginx, or polling as main academic contributions. They support the application but are secondary for a short presentation.
- Do not describe `arrivedConfirmed` as part of optimization. It exists in the data model and UI display, but the solver uses `expectedToArrive`.
- Do not present the random fallback arrangement as an optimized result. The UI falls back to random seating only if the solver is unavailable or returns no solutions.
- Do not present mid-run GNN injection as normal runtime behavior. The code supports `gnn_inject=True`, but the production call from `solve.py` does not enable it.
- Do not present transfer learning or full tuning pipelines as part of ordinary app execution. They are research/evaluation code.
- Do not include line-by-line details of NSGA-II, Euler tours, sparse tables, React state management, or Docker container setup unless asked in a technical Q&A.
- Do not overstate the GNN. In normal runtime it is only one initializer in the initial population if the model file exists.

## D. Presentation / Video Structure

### 0:00-0:25 - The Problem

Objective: Establish why the problem is non-trivial.

Voice-over:
"Planning seating is not only about filling tables. Two arrangements can use the same number of tables and respect the same capacity, but one may separate related groups while the other keeps families, friends, or teams together. This project models seating as both a capacity problem and a social-structure optimization problem."

Visual:
Two simple seating plans with the same table count. One mixes unrelated colors randomly; the other keeps similar colors together.

On-screen text:
`Same capacity. Different social quality.`

### 0:25-0:55 - The Guest Tree

Objective: Explain the core data representation.

Voice-over:
"Instead of storing guests only as a flat list, the system organizes them in a hierarchy. A top-level group might be Family, with subgroups such as Parents, Cousins, or Siblings. Leaves are the groups that actually contain guests. The distance between two leaves in the tree becomes a measure of how socially close those groups are, and edge weights allow some relationships to count more strongly than others."

Visual:
A small tree: Event -> Family/Friends/Work -> subgroups. Highlight two nearby leaves and two distant leaves.

On-screen text:
`Tree distance = social distance`

### 0:55-1:25 - User Workflow

Objective: Show that this is a usable full-stack application, not only an algorithm script.

Voice-over:
"In the application, the user creates an event, adds groups, adds guests, and marks who is expected to arrive. The seating screen exposes the key optimization parameters: table capacity, how strongly to keep families together, and how strongly to avoid isolated guests. Only expected guests are sent to the solver."

Visual:
Real app footage: event list, group tree, guest creation or edit screen, seating configuration screen.

On-screen text:
`Event -> Groups -> Guests -> Generate`

### 1:25-1:55 - Backend Preprocessing

Objective: Explain how UI data is translated into solver input.

Voice-over:
"Before optimization, the backend normalizes the tree. If the event has multiple root groups, it adds a synthetic root. If a group has both child groups and direct guests, the direct guests become a synthetic leaf. If a leaf group is larger than the table capacity, it is split into capacity-sized chunks. This gives the solver a clean tree where leaf nodes are the units assigned to tables."

Visual:
Before/after diagram: UI tree with multiple roots/direct guests -> normalized solver tree with `_root`, `_direct`, and chunks.

On-screen text:
`UI groups -> Solver leaves`

### 1:55-2:35 - Optimization Objectives

Objective: Explain what the solver measures.

Voice-over:
"The solver has two objectives. The first is the number of tables. The second is a social penalty: alpha times total loneliness minus total cohesion. Loneliness measures how far each group is from its closest tablemate in the tree, so isolated or socially distant groups are penalized. Cohesion rewards close groups sitting together by adding inverse tree distance between groups at the same table. Lower penalty is better, but fewer tables and better social comfort can conflict."

Visual:
Toy table with three groups. Show a nearby pair getting high cohesion and a far-away group creating loneliness.

On-screen text:
`Penalty = alpha * loneliness - cohesion`

### 2:35-3:15 - NSGA-II Search

Objective: Explain the algorithm conceptually.

Voice-over:
"The optimizer uses NSGA-II, an evolutionary multi-objective algorithm. Each candidate is an assignment from leaf groups to table IDs. A population of candidates is evaluated, selected, crossed over, mutated, repaired when capacity is violated, and evolved across generations. The result is not a single answer, but a Pareto front: for example, one arrangement may use the minimum number of tables, while another uses one extra table but produces a lower social penalty."

Visual:
Animated population of seating candidates -> evaluation -> crossover/mutation -> Pareto front with table count on x-axis and penalty on y-axis.

On-screen text:
`Pareto front = trade-off choices`

### 3:15-3:45 - Initializers And GNN

Objective: Explain the technically interesting enhancement without overstating it.

Voice-over:
"The search does not start from scratch. The initial population mixes several strategies, including random valid seating, nearest-neighbor grouping, top-down subtree grouping, bottom-up merging, largest-first packing, and, when the trained model is available, a GNN-based initializer. The GNN reads structural features of the tree and produces embeddings that help create additional candidate arrangements. It helps seed the evolutionary search; it does not replace NSGA-II."

Visual:
Six small seed cards feeding into an NSGA-II population. The GNN card is labeled "initializer, not final solver."

On-screen text:
`Heuristics + GNN seeds -> Evolutionary search`

### 3:45-4:25 - Results In The Application

Objective: Connect solver output back to user-visible functionality.

Voice-over:
"When the solver finishes, the UI shows candidate arrangements with table counts, penalty, cohesion, and loneliness indicators. The user can inspect tables, save an arrangement, view a colored tree map showing which parts of the hierarchy were assigned to which tables, search for guests, and manually move guests afterward. This is important because the algorithm provides strong candidates, while the final seating plan may still need human judgment."

Visual:
Real app footage: generation results, candidate details, saved arrangement, table circles, colored tree map, manual move.

On-screen text:
`Optimize -> Compare -> Save -> Adjust`

### 4:25-4:45 - Closing

Objective: Summarize the academic contribution.

Voice-over:
"The project combines a practical event-management interface with a tree-based social model and a multi-objective evolutionary solver. Its main contribution is translating an informal human problem - who should sit near whom - into a structured optimization problem that still leaves room for user control."

Visual:
Final architecture summary: UI -> API preprocessing -> NSGA-II solver -> candidate arrangements.

On-screen text:
`Human social structure + optimization`

## E. Full Narration Script

### Scene 1 - Why Seating Is Hard

**Duration:** 25 seconds

**Voice-over:**
"Planning seating is not only about filling tables. Two plans can use the same number of tables and respect the same table capacity, but one may separate related people while the other keeps families, friends, or work groups together. This project treats seating as both a capacity problem and a social-structure optimization problem."

**Visual:**
Show two toy plans with 3 tables and 12 guests. Use colors for Family, Friends, and Work. The first plan is mixed randomly; the second plan keeps colors mostly together.

**On-screen text:**
`Same capacity. Different social quality.`

**Demo action, when relevant:**
No app footage required.

**Transition:**
Fade from tables into a tree diagram.

### Scene 2 - The Guest Hierarchy

**Duration:** 30 seconds

**Voice-over:**
"The core representation is a guest tree. Users create groups and subgroups, such as Family, Friends, Work, and smaller subgroups inside them. The leaves of this tree are the units the optimizer assigns to tables. Tree distance acts as a proxy for social distance: groups that share a nearby ancestor are closer than groups from separate branches. Edge weights can make some parent-child relationships more important."

**Visual:**
Small hierarchy: Event at the root, then Family/Friends/Work, then Parents/Cousins/College/Team. Highlight a short path and a long path.

**On-screen text:**
`Tree distance = social distance`

**Demo action, when relevant:**
Show the application's tree view or event group list for 5-7 seconds if footage is available.

**Transition:**
Slide from the tree into the app workflow.

### Scene 3 - Application Workflow

**Duration:** 35 seconds

**Voice-over:**
"The user starts by creating an event. Inside the event, they add groups, choose parent groups, optionally set edge weights, and then add guests. Each guest has an expected-to-arrive flag. That flag matters because the optimizer seats expected guests only; attendance confirmation is separate event-day status and is not part of the optimization."

**Visual:**
Real app screen recording: create/open event, open group, add guest, toggle expected-to-arrive.

**On-screen text:**
`Event -> Groups -> Guests`

**Demo action, when relevant:**
Record: event list -> open event -> tap add group -> show parent picker -> open group -> add guest.

**Transition:**
Cut to the seating-generation screen.

### Scene 4 - From UI Data To Solver Data

**Duration:** 30 seconds

**Voice-over:**
"The frontend does not send every guest record to the solver. It sends each group with its parent ID, edge weight, and the count of expected guests. The backend then normalizes the tree. It adds a synthetic root for multiple top-level groups, creates synthetic leaves for direct guests on internal groups, and splits oversized leaf groups into capacity-sized chunks. The result is a clean solver tree where leaf nodes are assigned to tables."

**Visual:**
Diagram showing UI group tree on the left and normalized solver tree on the right. Mark synthetic root, direct-guest leaf, and chunked oversized group.

**On-screen text:**
`Expected guests only`
`Normalized solver leaves`

**Demo action, when relevant:**
Show the seating form with table capacity and parameters, then press Generate.

**Transition:**
Zoom from solver leaves into objective formula.

### Scene 5 - What The Solver Optimizes

**Duration:** 40 seconds

**Voice-over:**
"The optimization has two objectives. First, minimize the number of tables. Second, minimize a social penalty. The penalty is alpha times total loneliness minus total cohesion. Loneliness asks, for each leaf group, how far is the closest other group at the same table? Cohesion rewards groups that are close in the tree and seated together. The parameter alpha controls how strongly loneliness is weighted, and the exponent p makes large social distances more expensive."

**Visual:**
Toy table with three colored leaf groups. A close pair gets a green cohesion label. A far group gets a red loneliness label. Show the formula briefly.

**On-screen text:**
`Penalty = alpha * loneliness - cohesion`
`Lower is better`

**Demo action, when relevant:**
No app footage required, or briefly show candidate metrics in the UI.

**Transition:**
Formula turns into a scatter plot of candidate solutions.

### Scene 6 - Why NSGA-II

**Duration:** 40 seconds

**Voice-over:**
"Because the number of possible assignments grows very quickly, the project uses NSGA-II, a multi-objective evolutionary algorithm. A candidate solution is simply a vector: each leaf group points to a table ID. The algorithm creates a population of candidates, evaluates each one, selects stronger candidates, combines parts of two parents, mutates assignments, and repairs capacity violations. Instead of returning only one solution, it returns a Pareto front: choices where improving one objective, such as table count, may worsen another, such as social penalty."

**Visual:**
Animated flow: population -> evaluate -> select -> crossover/mutation -> repair -> next generation. Then show a Pareto chart with one minimum-table point and one lower-penalty extra-table point.

**On-screen text:**
`Population of seating plans`
`Pareto front: no single universal best`

**Demo action, when relevant:**
No app footage required.

**Transition:**
The population animation receives seed candidates.

### Scene 7 - Starting The Search Better

**Duration:** 30 seconds

**Voice-over:**
"The initial population is not purely random. In the production solver, it mixes random valid seating, nearest-neighbor grouping, top-down subtree grouping, bottom-up merge, largest-first packing, and a GNN initializer if the trained model file is present. The GNN uses structural node features to generate embeddings, then helps build additional initial candidates. Its role is to seed the evolutionary search, not to solve the full optimization problem alone."

**Visual:**
Six initializer cards feeding into one NSGA-II population. Use a small neural-network icon for GNN with label "seed only."

**On-screen text:**
`Better seeds -> better search`
`GNN initializer, not final solver`

**Demo action, when relevant:**
No app footage required.

**Transition:**
Cut back to generated candidates in the application.

### Scene 8 - Results And Human Control

**Duration:** 40 seconds

**Voice-over:**
"When the backend finishes, the frontend receives candidate solutions and expands group chunks back into concrete guest assignments. The user can compare candidates by table count and penalty, save an arrangement, inspect each table, search for a guest, view table cohesion and loneliness indicators, and use a colored tree map to see how the hierarchy was distributed across tables. The saved arrangement can also be manually adjusted by moving guests between tables, with warnings when capacity is exceeded."

**Visual:**
Real app footage: candidate list, candidate detail, save button, saved table view, colored tree map, manual guest move.

**On-screen text:**
`Compare -> Save -> Inspect -> Adjust`

**Demo action, when relevant:**
Record pressing Generate, opening a candidate, saving it, switching to tree map, and moving one guest.

**Transition:**
Fade to architecture summary.

### Scene 9 - Closing

**Duration:** 20 seconds

**Voice-over:**
"This project combines a practical event-management interface with a tree-based social model and a multi-objective evolutionary solver. The main idea is to translate an informal human question - who should sit near whom - into a structured optimization problem, while still letting the user compare and refine the final plan."

**Visual:**
Simple architecture diagram: User/UI -> Flask API preprocessing -> NSGA-II solver -> candidate seating arrangements -> user adjustment.

**On-screen text:**
`Social structure + optimization + user control`

**Demo action, when relevant:**
No app footage required.

**Transition:**
End.

## F. Visualization Ideas

- Guest hierarchy/tree: Use a tiny example with 3 root branches: Family, Friends, Work. Under Family add Parents and Cousins; under Friends add College and Neighbors. Use leaves as colored group blocks with guest counts.
- Distance between groups: Highlight two leaves under Family with a short path labeled "close", and one Family leaf to one Work leaf with a longer path labeled "far".
- Table capacity: Show table capacity 5 with group sizes 2, 3, and 4. Demonstrate that 2+3 fits, but adding 4 overflows.
- Comparison between two seating arrangements: Show two plans with the same number of tables. Plan A mixes colors; Plan B keeps colors clustered. Label both as capacity-valid but socially different.
- Cohesion and loneliness: For one table, draw two close groups with green arrows marked "cohesion" and one distant group with a red marker labeled "lonely group".
- Pareto trade-offs: Use a scatter plot with x-axis `Number of tables` and y-axis `Social penalty`. Highlight one minimum-table option and one extra-table option with lower penalty.
- Evolutionary optimization: Animate 6-8 candidate cards. Some are selected, two combine through crossover, one mutates by moving a group, and repair fixes an over-capacity table.
- GNN initializer: Show tree nodes passing through a small neural-network block into embedding dots, then those dots form a seed seating candidate. Label it "creates initial candidate, does not replace NSGA-II".

## G. Application Footage Checklist

1. **Screen:** Login/event list
   **Action:** Continue without account or show existing event list.
   **Idea:** The project is an interactive app, not just a solver script.
   **Duration:** 4-6 seconds.

2. **Screen:** New event form
   **Action:** Create or show an event.
   **Idea:** User starts with an event entity.
   **Duration:** 4-6 seconds.

3. **Screen:** Event group tree/list
   **Action:** Open an event and show groups with nested indentation.
   **Idea:** Guests are organized hierarchically.
   **Duration:** 6-8 seconds.

4. **Screen:** Add group or edit group
   **Action:** Show parent selector and edge weight field.
   **Idea:** Parent/child relationships and weighted edges are user-defined.
   **Duration:** 6-8 seconds.

5. **Screen:** Add guest or edit guest
   **Action:** Show guest fields and expected-to-arrive toggle.
   **Idea:** Only expected guests are used for seating.
   **Duration:** 5-7 seconds.

6. **Screen:** Tree view
   **Action:** Pan or show a visible hierarchy.
   **Idea:** The tree is a first-class visual model.
   **Duration:** 6-8 seconds.

7. **Screen:** Seating configuration
   **Action:** Show table size, family priority, avoid lonely guests, optional depth weighting, then press Generate.
   **Idea:** User controls the optimization parameters.
   **Duration:** 8-10 seconds.

8. **Screen:** Generation loading/results
   **Action:** Wait until candidates appear; show candidate cards with table count, penalty, cohesion, loneliness.
   **Idea:** Solver returns multiple trade-off candidates.
   **Duration:** 8-12 seconds.

9. **Screen:** Candidate detail
   **Action:** Open one candidate and show circular table visualization.
   **Idea:** Results are interpretable table assignments.
   **Duration:** 6-8 seconds.

10. **Screen:** Save candidate / saved arrangements
    **Action:** Save a candidate and return to saved arrangements list.
    **Idea:** Generated solutions become persistent arrangements.
    **Duration:** 5-7 seconds.

11. **Screen:** Saved arrangement table view
    **Action:** Search for a guest, sort by cohesion/loneliness/count, and show metrics.
    **Idea:** The user can inspect solution quality and locate people.
    **Duration:** 8-10 seconds.

12. **Screen:** Tree Map view inside arrangement
    **Action:** Toggle from Tables to Tree Map.
    **Idea:** Shows how the hierarchy was distributed across tables.
    **Duration:** 6-8 seconds.

13. **Screen:** Manual move
    **Action:** Select a guest and move to another table; show capacity warning if possible.
    **Idea:** Optimization supports human override after generation.
    **Duration:** 8-10 seconds.

## MASTER PROMPT

Create a clean academic computer-science project presentation that can also serve as the visual foundation for a narrated video.

Purpose:
Explain a full-stack event-management and intelligent seating-arrangement system. The presentation should help a university lecturer or computer-science evaluator understand the real project: what problem it solves, why the problem is non-trivial, how the system models guest relationships, how optimization works, how the user interacts with it, and what is technically interesting.

Target audience:
University lecturer, evaluator, or computer-science students. They understand basic algorithms and software systems but do not know this project.

Desired duration:
Approximately 3-5 minutes. Keep it concise and academic, not promotional.

Visual style:
Use a clean, modern, technical academic aesthetic. Use minimal text per slide, diagrams instead of paragraphs, restrained animation, consistent colors and iconography, and the guest hierarchy/tree as a recurring visual motif. Use small toy examples with approximately 8-15 guests. Do not fabricate application screenshots. Wherever real product footage is needed, insert explicit placeholders exactly like `[INSERT APP SCREEN RECORDING: ...]`.

Correct project terminology:
- Event
- Guest
- Guest group
- Parent group / child group
- Leaf group
- Edge weight
- Expected to arrive
- Table capacity
- Seating arrangement
- Cohesion
- Loneliness
- Social penalty
- Pareto front
- NSGA-II
- Heuristic initializer
- GNN initializer

Facts verified from the implementation:
- The project is a full-stack app with an Expo/React Native Web frontend, Flask solver API, and Python optimization solver.
- Users can create events, create hierarchical groups, add guests to groups, toggle whether guests are expected to arrive, generate seating arrangements, view candidate results, save arrangements, inspect tables, view a colored tree map, search for guests, and manually move guests between tables.
- Data is stored in browser localStorage under `seating_data`; when signed in, it is also saved to Firestore under `users/{uid}` with an `events` array.
- The optimizer uses only guests marked `expectedToArrive`; `arrivedConfirmed` is event-day status and is not used by the solver.
- The frontend sends the solver a compact group payload: group id, parent id, expected guest count, and edge weight.
- The backend preprocesses the group tree before solving:
  - Multiple top-level groups are wrapped under a synthetic `_root`.
  - A group with both child groups and direct guests gets a synthetic `_direct_...` leaf for the direct guests.
  - A leaf group larger than table capacity is split into `_chunk_...` leaves so each chunk fits.
- The solver assigns leaf groups to table IDs, not individual guests directly. Small leaf groups remain together. The frontend later expands returned chunks back into concrete guest assignments.
- The solver builds a `GuestTree`, computes weighted tree distances using LCA via Euler tour and sparse table, and precomputes a distance matrix.
- The optimization has two objectives: number of tables, and social penalty.
- The social penalty is `alpha * total_loneliness - total_cohesion`.
- Loneliness measures, for each leaf group, the distance to the closest other leaf group at the same table; isolated groups receive a high loneliness penalty.
- Cohesion rewards close groups sitting together by summing inverse tree distances between groups at the same table.
- The solver uses NSGA-II from `pymoo`.
- A candidate solution is a vector where each leaf group maps to a table ID.
- The production solver uses population size 100, up to 250 generations, a 10-minute max time, and convergence stopping when improvement is below 0.5% over a 20-generation window after reaching the minimum table count.
- The production initialization mix is: 10% random, 40% nearest-neighbor, 10% top-down, 20% bottom-up merge, 10% GNN if the model file exists, and 10% largest-first.
- Mutation probabilities in production are: 5% random swap, 5% random move, 15% split table, 15% merge, and 60% nearest-neighbor move.
- Crossover swaps a random subtree assignment from one parent into another, then repairs fragmented or over-capacity tables.
- The GNN is a 3-layer graph convolutional network. It uses structural features: depth, size, is_leaf, and subtree people fraction. It produces embeddings used by a GNN initializer. It does not replace the NSGA-II optimizer.
- Mid-run GNN injection and transfer learning exist in the repository but are not enabled in the normal production call. They should be described only as research/experimental code, or omitted.
- Research scripts include `run_all.py`, `train_and_evaluate_gnn.py`, `generate_examples.py`, `validate_examples.py`, `tuning_results.json`, and a report. These are not normal app runtime.
- The report claims, in research context, that adding 10% GNN to the initialization mix improved penalty at minimum table count by 5.3% with p=0.004 on a synthetic benchmark. If used, clearly label it as a research result from the repository report, not live application behavior.

Do not invent:
- Do not invent performance statistics, user studies, deployment scale, commercial users, or accuracy claims.
- Do not claim the GNN is the main solver.
- Do not claim `arrivedConfirmed` affects optimization.
- Do not describe the random fallback as an optimized result.
- Do not fabricate app screenshots.
- Do not describe experimental GNN injection or transfer learning as normal production flow.
- Do not imply individual guests are directly optimized by the backend; the backend optimizes leaf group assignments and the frontend expands them to guests.

Storyline:
Problem -> why naive capacity seating is insufficient -> hierarchical guest representation -> backend preprocessing -> multi-objective optimization -> NSGA-II search -> heuristic and GNN initialization -> app results and user control.

Scene / slide sequence:

1. Title / problem, 0:00-0:25
   Main message: Seating is not just filling tables.
   Voice-over: "Planning seating is not only about filling tables. Two plans can use the same number of tables and respect the same table capacity, but one may separate related people while the other keeps families, friends, or work groups together. This project treats seating as both a capacity problem and a social-structure optimization problem."
   Visual: Two toy seating plans with the same 3 tables and 12 guests. Use colors for Family, Friends, and Work. Plan A mixes colors randomly; Plan B clusters related colors.
   On-screen text: `Same capacity. Different social quality.`
   Animation: Fade in Plan A, then Plan B, then highlight the difference.

2. Guest hierarchy, 0:25-0:55
   Main message: The project models relationships with a tree.
   Voice-over: "The core representation is a guest tree. Users create groups and subgroups, such as Family, Friends, Work, and smaller subgroups inside them. The leaves of this tree are the units the optimizer assigns to tables. Tree distance acts as a proxy for social distance: groups that share a nearby ancestor are closer than groups from separate branches. Edge weights can make some parent-child relationships more important."
   Visual: Event root with branches Family, Friends, Work; subgroups Parents, Cousins, College, Team. Highlight short and long paths.
   On-screen text: `Tree distance = social distance`
   Animation: Draw tree edges progressively.

3. Application workflow, 0:55-1:25
   Main message: This is an end-to-end application.
   Voice-over: "The user starts by creating an event. Inside the event, they add groups, choose parent groups, optionally set edge weights, and then add guests. Each guest has an expected-to-arrive flag. That flag matters because the optimizer seats expected guests only; attendance confirmation is separate event-day status and is not part of the optimization."
   Visual: `[INSERT APP SCREEN RECORDING: event creation, nested groups, add guest form, expected-to-arrive toggle]`
   On-screen text: `Event -> Groups -> Guests`
   Animation: Minimal app footage cuts.

4. Preprocessing for the solver, 1:25-1:55
   Main message: UI data is normalized before optimization.
   Voice-over: "The frontend does not send every guest record to the solver. It sends each group with its parent ID, edge weight, and the count of expected guests. The backend then normalizes the tree. It adds a synthetic root for multiple top-level groups, creates synthetic leaves for direct guests on internal groups, and splits oversized leaf groups into capacity-sized chunks. The result is a clean solver tree where leaf nodes are assigned to tables."
   Visual: Diagram: UI tree on left, solver tree on right. Mark `_root`, `_direct`, and `_chunk` nodes.
   On-screen text: `UI groups -> Solver leaves`
   Animation: Morph problematic UI tree into normalized solver tree.

5. Objective functions, 1:55-2:35
   Main message: The solver balances table count and social penalty.
   Voice-over: "The optimization has two objectives. First, minimize the number of tables. Second, minimize a social penalty. The penalty is alpha times total loneliness minus total cohesion. Loneliness asks, for each leaf group, how far is the closest other group at the same table? Cohesion rewards groups that are close in the tree and seated together. The parameter alpha controls how strongly loneliness is weighted, and the exponent p makes large social distances more expensive."
   Visual: Toy table with three colored groups; show green cohesion between nearby groups and red loneliness for far group.
   On-screen text: `Penalty = alpha * loneliness - cohesion`
   Animation: Bring formula in after visual intuition.

6. NSGA-II search, 2:35-3:15
   Main message: Evolutionary optimization searches a large combinatorial space and returns trade-offs.
   Voice-over: "Because the number of possible assignments grows very quickly, the project uses NSGA-II, a multi-objective evolutionary algorithm. A candidate solution is simply a vector: each leaf group points to a table ID. The algorithm creates a population of candidates, evaluates each one, selects stronger candidates, combines parts of two parents, mutates assignments, and repairs capacity violations. Instead of returning only one solution, it returns a Pareto front: choices where improving one objective, such as table count, may worsen another, such as social penalty."
   Visual: Population cards -> evaluation -> selection -> crossover/mutation -> repair -> Pareto chart.
   On-screen text: `Population of seating plans` and `Pareto front = trade-off choices`
   Animation: Simple loop arrows, then scatter plot.

7. Initializers and GNN, 3:15-3:45
   Main message: Better starting candidates help the search.
   Voice-over: "The initial population is not purely random. In the production solver, it mixes random valid seating, nearest-neighbor grouping, top-down subtree grouping, bottom-up merge, largest-first packing, and a GNN initializer if the trained model file is present. The GNN uses structural node features to generate embeddings, then helps build additional initial candidates. Its role is to seed the evolutionary search, not to solve the full optimization problem alone."
   Visual: Cards labeled Random, Nearest Neighbor, Top Down, Bottom Up, Largest First, GNN. All feed into NSGA-II.
   On-screen text: `GNN initializer, not final solver`
   Animation: Cards flow into population.

8. User-visible results, 3:45-4:25
   Main message: The app gives candidates that users can compare, save, inspect, and adjust.
   Voice-over: "When the backend finishes, the frontend receives candidate solutions and expands group chunks back into concrete guest assignments. The user can compare candidates by table count and penalty, save an arrangement, inspect each table, search for a guest, view table cohesion and loneliness indicators, and use a colored tree map to see how the hierarchy was distributed across tables. The saved arrangement can also be manually adjusted by moving guests between tables, with warnings when capacity is exceeded."
   Visual: `[INSERT APP SCREEN RECORDING: generating seating arrangements]`, `[INSERT APP SCREEN RECORDING: candidate result list]`, `[INSERT APP SCREEN RECORDING: table circles and tree map]`, `[INSERT APP SCREEN RECORDING: manual guest move]`
   On-screen text: `Optimize -> Compare -> Save -> Adjust`
   Animation: Fast cuts between app clips.

9. Closing, 4:25-4:45
   Main message: The contribution is modeling informal social seating as structured optimization with user control.
   Voice-over: "This project combines a practical event-management interface with a tree-based social model and a multi-objective evolutionary solver. The main idea is to translate an informal human question - who should sit near whom - into a structured optimization problem, while still letting the user compare and refine the final plan."
   Visual: Architecture summary: UI -> Flask API preprocessing -> NSGA-II solver -> candidate arrangements -> user adjustment.
   On-screen text: `Social structure + optimization + user control`
   Animation: Fade out.

## Code Evidence

- Full-stack app structure: `ui/package.json`, `ui/app/*.tsx`, `solver/api.py`, `solver/solve.py`, `start.bat`, `nginx.conf`.
- Event, guest, group, seating arrangement data model: `ui/lib/types.ts`.
- Local and Firestore persistence: `ui/lib/store.tsx`, especially `STORAGE_KEY = 'seating_data'`, `loadFromStorage`, `saveToStorage`, Firestore `getDoc` and `setDoc`.
- Google sign-in and user identity: `ui/lib/auth.tsx`, `ui/lib/firebase.ts`.
- Event creation and event list: `ui/app/index.tsx`.
- Group creation, parent selection, and edge weights: `ui/app/add-group.tsx`, `ui/app/edit-group.tsx`.
- Guest creation and `expectedToArrive`: `ui/app/add-guest.tsx`, `ui/app/edit-guest.tsx`, `ui/components/GuestCard.tsx`.
- Event group tree workflow and moving groups: `ui/app/event/[id].tsx`, `ui/components/TreeRow.tsx`, `ui/components/VisualTree.tsx`.
- Seating generation frontend flow: `ui/app/seating.tsx`, especially `solverGroupsPayload`, `handleGenerate`, polling `/solve/{jobId}`, `chunksToTables`, candidate display, saving, and manual move logic.
- Frontend display metrics: `ui/lib/metrics.ts`. Note: these are UI metrics for visualization and are similar in spirit to solver metrics but not always identical in aggregation or special-case display behavior.
- Backend async job API and polling: `solver/api.py`, especially `/solve`, `/solve/<job_id>`, `_run_solve`, job file storage, and background thread.
- Backend preprocessing: `solver/api.py`, especially `_prepare_solver_groups`, `_add_leaf`, and `_clean_assignment`.
- Solver entrypoint and production configuration: `solver/solve.py`, especially `solve`, initializer proportions, mutation probabilities, `run_optimization`, and Pareto-front output.
- Guest tree and weighted LCA distance: `solver/tree_distance.py`.
- NSGA-II integration and leaf-only optimization variables: `solver/optimizer.py`, especially `SeatingProblem`, `SeatingSampling`, `SeatingMutation`, `SeatingCrossover`, and `run_optimization`.
- Objective functions: `solver/fitness.py`, especially `_eval_one`, `evaluate_population`, `total_loneliness`, `total_cohesion`, and `alpha * total_loneliness - total_cohesion`.
- Heuristic initializers: `solver/initializers.py`, including `random_valid`, `nearest_neighbor`, `greedy_top_down`, `bottom_up_merge`, `largest_first_nn`, `compact_tables`, and `generate_initial_population`.
- Mutation, crossover, and repair: `solver/operators.py`, especially `mutate`, `crossover`, and `repair`.
- GNN model and initializer: `solver/gnn_model.py`, especially `SeatingGNN`, `tree_to_pyg`, `gnn_initializer`, `contrastive_loss`, and `train_gnn`.
- Research and evaluation code: `solver/run_all.py`, `solver/train_and_evaluate_gnn.py`, `solver/generate_examples.py`, `solver/validate_examples.py`, `solver/tuning_results.json`, `solver/report.tex`, and generated figures under `solver/figures/`.
- Demo import path: `solver/generate_demo.py`, `static/demo-event.json`, and the demo-loading effect in `ui/lib/store.tsx`.
