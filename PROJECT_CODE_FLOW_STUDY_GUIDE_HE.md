# מדריך לימוד זרימת קוד לפרויקט

המטרה של המסמך הזה היא לעזור לך להתכונן להצגה בעל פה מול מרצים. הוא לא מסביר כל שורת קוד, אלא מתמקד בזרימה, בקבצים החשובים, ובקטעי הקוד שהכי כדאי להציג אם מבקשים ממך "תראה לנו משהו מעניין בקוד".

שמות קבצים, פונקציות ומחלקות נשארים באנגלית כדי שתוכל למצוא אותם מהר בפרויקט.

## 1. סקירת פרויקט ברמה גבוהה

המערכת היא אפליקציה לניהול אירועים וליצירת סידורי הושבה אופטימליים. המשתמש יוצר אירוע, בונה עץ קבוצות של אורחים, מוסיף אורחים לקבוצות, מסמן מי צפוי להגיע, ואז מפעיל אלגוריתם שמייצר סידורי הושבה לפי קרבה בין קבוצות, קיבולת שולחן, ומדדי איכות כמו cohesion ו-loneliness.

הרכיבים המרכזיים:

- Frontend: תיקיית `ui/`. אפליקציית Expo / React Native / Web עם `expo-router`.
- State management: הקובץ `ui/lib/store.tsx`. זה המקום המרכזי שבו נשמרים events, groups, guests, seating config ו-arrangements.
- Backend API: הקובץ `solver/api.py`. שרת Flask שמקבל בקשת `/solve`, מפעיל פתרון אסינכרוני, ומחזיר סטטוס לפי `jobId`.
- Solver / Algorithm: הקבצים `solver/solve.py`, `solver/optimizer.py`, `solver/fitness.py`, `solver/tree_distance.py`, `solver/initializers.py`, `solver/operators.py`.
- GNN: הקבצים `solver/gnn_model.py`, `solver/train_and_evaluate_gnn.py`, והמודל `solver/gnn_model.pt`. חשוב להציג את זה בזהירות: זה בעיקר initializer מחקרי/מסייע, לא האלגוריתם הראשי.
- Persistence: Firebase Auth ו-Firestore דרך `ui/lib/auth.tsx`, `ui/lib/firebase.ts`, וגם שמירה מקומית ב-localStorage דרך `ui/lib/store.tsx`.
- Deployment: Dockerfiles, `nginx.conf`, ו-start/stop scripts.

הזרימה הכללית:

1. המשתמש נכנס לאפליקציה ורואה רשימת אירועים ב-`ui/app/index.tsx`.
2. הוא יוצר event חדש. הנתונים נשמרים דרך `StoreProvider` ב-`ui/lib/store.tsx`.
3. בתוך event הוא בונה עץ קבוצות: משפחות, צדדים, תתי-קבוצות וכו'.
4. לכל קבוצה אפשר להוסיף guests ולסמן `expectedToArrive`.
5. במסך seating, הקובץ `ui/app/seating.tsx` בונה payload ל-solver.
6. ה-frontend שולח POST ל-`/solve`.
7. Flask ב-`solver/api.py` מנרמל את הקלט ומריץ `solve()`.
8. `solve()` מפעיל NSGA-II ומחזיר candidate solutions.
9. ה-frontend ממיר chunks של solver לשולחנות עם אורחים אמיתיים.
10. המשתמש שומר arrangement, צופה בטבלאות, רואה visualizations, ויכול להזיז אורחים ידנית עם undo/redo.

## 2. מפת קבצים לפי עדיפות לימוד

### חובה להכיר לעומק

| קובץ | מטרה | פונקציות / מחלקות מרכזיות | למה זה חשוב | מתחבר ל |
|---|---|---|---|---|
| `ui/lib/store.tsx` | state מרכזי ושמירה | `StoreProvider`, `addEvent`, `cloneEvent`, `addGroup`, `updateGroup`, `deleteGroup`, `moveGroup`, `reorderGroup`, `addGuest`, `updateGuest`, `removeGuest`, `getChildren`, `getSubtreeGroups`, `addArrangement`, `updateArrangement`, `deleteArrangement`, `exportSubtreeToEvent` | זה הלב של ה-frontend. כל events, groups, guests ו-arrangements עוברים דרכו. | כל מסכי UI, localStorage, Firestore |
| `ui/lib/types.ts` | מודל הנתונים | `Guest`, `GuestGroup`, `SeatingConfig`, `TableAssignment`, `SeatingArrangement`, `Event` | מגדיר בדיוק איך הנתונים נראים. | store, UI, seating |
| `ui/app/seating.tsx` | יצירת seating, polling, הצגת תוצאות ועריכה ידנית | `SeatingScreen`, `solverGroupsPayload`, `chunksToTables`, `handleGenerate`, `handleSaveCandidate`, `handleMoveGuest`, `handleUndo`, `handleRedo`, `ArrangementView`, `generateRandomSeating` | הקובץ הכי חשוב בצד ה-frontend. מחבר בין UI לבין ה-solver. | store, Flask API, metrics, visualizations |
| `solver/api.py` | Flask API ונרמול קלט | `_prepare_solver_groups`, `_add_leaf`, `_clean_assignment`, `_run_solve`, `solve_endpoint`, `solve_status`, `health` | מסביר איך בקשת `/solve` הופכת לבעיה שהאלגוריתם יודע לפתור. | frontend, `solver/solve.py` |
| `solver/solve.py` | נקודת כניסה ל-solver | `solve` | בונה `GuestTree`, מריץ optimization, ומחזיר פתרונות Pareto לפי מספר שולחנות. | API, optimizer |
| `solver/optimizer.py` | שילוב NSGA-II עם `pymoo` | `SeatingProblem`, `SeatingSampling`, `SeatingMutation`, `SeatingCrossover`, `GNNInjectionCallback`, `run_optimization` | זה orchestration של האלגוריתם. | fitness, initializers, operators |
| `solver/tree_distance.py` | מרחק משוקלל בעץ | `GuestTree`, `_build_euler_tour`, `_build_sparse_table`, `lca_idx`, `dist`, `precompute_dist_matrix` | אחד האזורים הכי חזקים להצגה: LCA + weighted distance. | fitness, operators, initializers |
| `solver/fitness.py` | חישוב objectives | `_eval_one`, `evaluate_population`, `evaluate_phase2`, `is_valid`, `weighted_pareto_score`, `set_max_workers` | מגדיר מהו סידור טוב: מספר שולחנות + penalty של loneliness/cohesion. | optimizer |
| `solver/initializers.py` | יצירת population התחלתי | `generate_initial_population`, `random_valid`, `nearest_neighbor`, `greedy_top_down`, `bottom_up_merge`, `largest_first_nn`, `compact_tables` | מראה שהאלגוריתם מתחיל ממועמדים חכמים, לא רק אקראיים. | NSGA-II sampling |
| `solver/operators.py` | mutation, crossover, repair | `mutate`, `crossover`, `repair`, `_do_merge`, `_renumber` | מראה איך משנים פתרונות תוך שמירה על קיבולת. | NSGA-II mutation/crossover |

### חשוב להבין

| קובץ | מטרה | פונקציות / מחלקות | למה זה חשוב |
|---|---|---|---|
| `ui/app/_layout.tsx` | provider root וניווט | `Layout`, `AppStack` | מראה את סדר הטעינה: theme, i18n, auth, store. |
| `ui/app/index.tsx` | מסך רשימת אירועים | `LandingScreen`, `handleCreate`, `handleClone`, `handleDelete`, `openEvent` | כאן מתחיל שימוש רגיל באפליקציה. |
| `ui/app/event/[id].tsx` | ניהול עץ קבוצות באירוע | `EventScreen`, `flatTree`, `searchResults`, `toggle` | מציג את עץ האורחים ומאפשר move לקבוצות. |
| `ui/app/group/[id].tsx` | פרטי קבוצה | `GroupDetailScreen`, `handleDelete` | מציג subgroups, guests, subtree stats, export. |
| `ui/app/add-group.tsx` | יצירת group/subgroup | `AddGroupScreen`, `handleSave` | כאן נקבע `parentId` ו-`edgeWeight`. |
| `ui/app/edit-group.tsx` | עריכת קבוצה | `EditGroupScreen`, `handleSave` | שינוי שם, edgeWeight, parent וסדר. |
| `ui/app/add-guest.tsx` | הוספת אורח | `AddGuestScreen`, `handleSave` | מוסיף guest לקבוצה ומגדיר `expectedToArrive`. |
| `ui/app/edit-guest.tsx` | עריכת אורח | `EditGuestScreen`, `handleSave`, `handleDelete` | שינוי פרטי אורח והאם הוא צפוי להגיע. |
| `ui/lib/metrics.ts` | מדדי תצוגה בצד frontend | `computeTableMetrics`, `findLoneliestGlobal`, `treeDist`, `buildDistMatrix` | מחשב cohesion/loneliness להצגה במסך arrangement. |
| `ui/components/TableCircle.tsx` | תצוגת שולחן עגול | `TableCircle` | מציג guests סביב שולחן, צבעים ומדדים. |
| `ui/components/ColoredTree.tsx` | עץ צבעוני לפי שולחנות | `ColoredTree` | מראה איך groups מתפצלים בין tables. |
| `ui/components/VisualTree.tsx` | visualization של עץ הקבוצות | `VisualTree`, `subtreeWidth`, `layoutTree`, `collectEdges` | מראה מבנה עץ ו-edge weights. |
| `ui/lib/auth.tsx` | Firebase Auth | `AuthProvider`, `signInWithGoogle`, `logout` | login עם Google. |
| `ui/lib/firebase.ts` | Firebase setup | `auth`, `db` | חיבור ל-Firebase Auth ו-Firestore. |
| `solver/gnn_model.py` | GNN initializer ומחקר | `SeatingGNN`, `tree_to_pyg`, `gnn_initializer`, `train_gnn`, `finetune_gnn` | חשוב אם שואלים על ML/GNN. |

### רקע / פחות קריטי

| קובץ | למה להכיר |
|---|---|
| `ui/lib/i18n.tsx` | תרגומים EN/HE. לא ליבת האלגוריתם. |
| `ui/lib/theme.tsx` | צבעים, dark/light mode. בעיקר UI. |
| `ui/lib/config.ts` | כתובת server ו-Google client ID. |
| `ui/components/TreeRow.tsx` | שורת group במסך event. |
| `ui/components/GuestCard.tsx` | כרטיס guest עם toggle. |
| `solver/synthetic.py`, `solver/generate_demo.py`, `solver/run_all.py`, `solver/validate_examples.py` | scripts לדמו/מחקר/בדיקות. לא ה-flow הראשי של המשתמש. |
| `nginx.conf`, `ui/Dockerfile`, `solver/Dockerfile`, `start.bat`, `start.sh`, `stop.bat`, `stop.sh` | deployment והרצה מקומית. |

## 3. זרימת מערכת מקצה לקצה

### 3.1 Application Startup

1. `ui/package.json` מגדיר `"main": "expo-router/entry"`.
2. Expo Router טוען את `ui/app/_layout.tsx`.
3. `Layout` עוטף את האפליקציה בסדר הזה:
   - `SafeAreaProvider`
   - `ThemeProvider`
   - `I18nProvider`
   - `AuthProvider`
   - `StoreProvider`
   - `AppStack`
4. `ThemeProvider` ב-`ui/lib/theme.tsx` טוען light mode כברירת מחדל.
5. `I18nProvider` ב-`ui/lib/i18n.tsx` טוען אנגלית כברירת מחדל ומספק `t`, `lang`, `setLang`, `isRTL`.
6. `AuthProvider` ב-`ui/lib/auth.tsx` מאזין ל-Firebase Auth עם `onAuthStateChanged`.
7. `StoreProvider` ב-`ui/lib/store.tsx` טוען events מ-localStorage דרך `loadFromStorage()`, רק ב-web.
8. אם המשתמש מחובר, `StoreProvider` טוען Firestore מהמסמך `users/{uid}`.
9. כל שינוי ב-events נשמר ל-localStorage. אם המשתמש מחובר ו-Firestore נטען, הנתונים נשמרים גם ל-Firestore.

מה לומר בעל פה:

"בעליית האפליקציה יש שכבות providers. ה-store נטען אחרי auth, כי אם המשתמש מחובר הוא יכול לסנכרן את האירועים שלו מ-Firestore. כל המסכים משתמשים ב-`useStore`, ולכן אין state מפוזר בהרבה מקומות."

### 3.2 Event Creation and Event Management

מסך: `ui/app/index.tsx`, קומפוננטה `LandingScreen`.

פונקציות חשובות:

- `handleCreate`: יוצר event חדש עם `addEvent`, מגדיר אותו כ-current, ומנווט אליו.
- `handleClone`: משכפל event קיים עם `cloneEvent`.
- `handleDelete`: מוחק event אחרי confirm.
- `openEvent`: מגדיר current event ופותח `/event/${id}`.

ב-store:

- `addEvent` יוצר event עם:
  - `groups: []`
  - `seatingConfig: { maxTableSize: 10, alpha: 2.0, p: 2.0 }`
  - `arrangements: []`
- `cloneEvent` עושה deep clone לקבוצות ולאורחים, יוצר IDs חדשים, ומתקן `parentId`.
- `deleteEvent` מוחק event.
- `updateEvent` מעדכן name/date.

### 3.3 Building the Guest Group Tree

מודל העץ:

- העץ לא נשמר כאובייקט nested.
- כל הקבוצות נשמרות במערך שטוח `groups`.
- לכל `GuestGroup` יש `parentId`.
- `parentId: null` אומר top-level group.
- `edgeWeight` נמצא על הילד ומייצג את המרחק/עלות מה-parent.

יצירת קבוצה:

- קובץ: `ui/app/add-group.tsx`.
- `handleSave` קורא ל-`addGroup(name.trim(), parentId)`.
- אם הוזן edge weight, הוא קורא `updateGroup(g.id, { edgeWeight: Math.max(0.1, w) })`.

יצירת subgroup:

- מתוך `ui/app/group/[id].tsx` יש ניווט ל-`/add-group?parentId=${id}`.
- `AddGroupScreen` מקבל `parentId` ויוצר קבוצה מתחתיו.

הוספת guest:

- קובץ: `ui/app/add-guest.tsx`.
- `handleSave` קורא `addGuest(groupId, guestData)`.
- guest נשמר בתוך `guests` של אותה group.
- אין אוסף guests גלובלי נפרד.

פעולות עץ:

- `getChildren(parentId)`: מחזיר ילדים ישירים.
- `getSubtreeGroups(rootId)`: מחזיר group וכל הצאצאים שלה.
- `deleteGroup(id)`: מוחק group ותת-עץ שלם.
- `moveGroup(id, newParentId)`: משנה parent, אבל מונע העברה לתוך subtree של עצמו.
- `reorderGroup(id, direction)`: מחליף `createdAt` עם sibling כדי לשנות סדר.
- `exportSubtreeToEvent(rootGroupId, targetEventId)`: משכפל subtree לאירוע אחר עם IDs חדשים.

### 3.4 Seating Arrangement Generation

זה flow מרכזי להצגה.

קובץ: `ui/app/seating.tsx`.

המשתמש לוחץ Generate:

1. הכפתור קורא `handleGenerate`.
2. `handleGenerate` שומר config דרך `updateSeatingConfig`.
3. הוא בודק `totalExpected`. אם אין guests צפויים, הוא מפסיק.
4. הוא בונה בקשה עם `solverGroupsPayload`.
5. הוא שולח POST ל-`/solve`.
6. מקבל `{ jobId }`.
7. עושה polling ל-`/solve/${jobId}` כל 2 שניות, עד 300 פעמים.
8. כשחוזר `status: 'done'`, הוא מקבל `solutions`.
9. כל solution מומר ל-`Candidate` דרך `chunksToTables`.
10. המשתמש יכול לשמור candidate דרך `handleSaveCandidate`.

איך נבחרים רק expected guests:

- `guestsByGroup` מסנן:
  - `g.guests.filter(gu => gu.expectedToArrive)`
- `solverGroupsPayload` מחשב:
  - `guestCount: g.guests.filter(gu => gu.expectedToArrive).length`

מה נשלח ל-backend:

- לא נשלחים שמות אורחים.
- נשלחים רק:
  - group id
  - parent id
  - number of expected guests
  - edge weight
  - table capacity
  - alpha
  - p

למה זה טוב:

- ה-solver לא צריך לדעת שמות או פרטים אישיים.
- ה-solver פותר בעיה של group chunks.
- ה-frontend מחזיר את הזהויות האמיתיות אחרי הפתרון.

### 3.5 Backend Solver Flow

קובץ: `solver/api.py`.

Endpoints:

- `POST /solve` -> `solve_endpoint`
- `GET /solve/<job_id>` -> `solve_status`
- `GET /health` -> `health`

זרימה:

1. `solve_endpoint` מקבל JSON.
2. הוא יוצר `job_id`.
3. הוא שומר status `pending` בקובץ temp.
4. הוא מפעיל thread שמריץ `_run_solve`.
5. הוא מחזיר מיד `{ jobId }`.
6. ה-frontend עושה polling.

נרמול חשוב:

- `_prepare_solver_groups` הופך את מודל ה-UI למודל solver.
- אם יש כמה roots, הוא מוסיף `_root`.
- אם group פנימי מכיל גם guests, הוא יוצר leaf מלאכותי `_direct_<groupId>`.
- אם group leaf גדול מדי לשולחן, הוא מפצל ל-`_chunk_<groupId>_0`, `_chunk_<groupId>_1`, וכו'.

חזרה ל-frontend:

- `_clean_assignment` מסיר prefixes כמו `_direct_` ו-`_chunk_`.
- הוא מחזיר chunks עם:
  - `groupId`
  - `tableId`
  - `size`

### 3.6 Algorithm Flow

הבעיה האלגוריתמית:

צריך לשבץ leaf groups לשולחנות כך ש:

- מספר השולחנות יהיה קטן.
- אנשים קרובים בעץ ישבו יחד.
- אף קבוצה לא תהיה "בודדה" בשולחן עם קבוצות רחוקות מדי.
- לא חורגים מקיבולת שולחן.

ייצוג פתרון:

- פתרון הוא NumPy array.
- האורך שלו הוא מספר ה-leaves.
- כל תא במערך הוא table id עבור leaf group.

מרחק בין קבוצות:

- `GuestTree` ב-`solver/tree_distance.py` בונה עץ משוקלל.
- המרחק בין שני nodes מחושב דרך LCA:
  - `weighted_depth[i] + weighted_depth[j] - 2 * weighted_depth[lca]`
- `precompute_dist_matrix` מחשב מטריצת מרחקים לכל הזוגות.

Fitness:

- `evaluate_population` מחזיר לכל assignment שני objectives:
  - מספר שולחנות.
  - penalty.
- `_eval_one` מחשב:
  - מי יושב באותו שולחן.
  - לכל leaf, מה המרחק ל-leaf הכי קרוב אליו באותו שולחן.
  - loneliness = סכום של `min_dist ** p`.
  - cohesion = סכום של `1 / distance` לזוגות שיושבים יחד.
  - penalty = `alpha * total_loneliness - total_cohesion`.

NSGA-II:

- `run_optimization` ב-`solver/optimizer.py` מריץ NSGA-II.
- `SeatingProblem` מגדיר איך להעריך פתרון.
- `SeatingSampling` מייצר population התחלתי.
- `SeatingMutation` מפעיל mutation.
- `SeatingCrossover` מפעיל crossover.
- התוצאה היא Pareto front של פתרונות.

### 3.7 GNN / Research Flow

מה קיים:

- `solver/gnn_model.py` מגדיר `SeatingGNN`.
- `gnn_initializer` יכול לייצר assignment התחלתי לפי embeddings של העץ.
- `train_gnn` יכול לאמן מודל על עצים סינתטיים.
- `solver/train_and_evaluate_gnn.py` מכיל flow של אימון והערכה.

מה production עושה בפועל:

- `solver/solve.py` כולל proportion של `'gnn': 0.10`.
- `solver/initializers.py` מנסה לטעון `gnn_model.pt`.
- אם הטעינה מצליחה, GNN נכנס כאחד מה-initializers.
- אם לא, זה לא שובר את ה-solver.

מה לא להגיד:

- לא להגיד שה-GNN הוא האלגוריתם הראשי.
- לא להגיד שה-GNN מחליף את NSGA-II.
- לא להגיד ש-mid-run GNN injection פעיל, כי `gnn_inject=False` כברירת מחדל ו-`solve()` לא מפעיל אותו.

משפט טוב להגיד:

"ה-GNN הוא שכבת מחקר שמשמשת כ-initializer. הוא עוזר להכניס population התחלתי טוב יותר ל-NSGA-II, אבל הפתרון הסופי עדיין מגיע מהאלגוריתם האבולוציוני."

### 3.8 Viewing, Searching, and Manual Editing

קובץ: `ui/app/seating.tsx`.

Viewing:

- saved arrangements מגיעים מ-`currentEvent.arrangements`.
- בחירה של arrangement מגדירה `activeArrId`.
- `ArrangementView` מציג את הסידור.
- `TableCircle` מתוך `ui/components/TableCircle.tsx` מציג שולחנות עגולים.

Searching:

- `ArrangementView` משתמש ב-`search`.
- `searchResults` מחפש `guestName` בתוך כל tables.
- התוצאה מציגה באיזה table האורח נמצא.

Manual move:

- לחיצה על guest מגדירה `movingGuest`.
- לחיצה על table יעד קוראת `handleMoveGuest`.
- `handleMoveGuest`:
  1. שומר את המצב הנוכחי ב-`undoStack`.
  2. מנקה `redoStack`.
  3. מוציא guest מה-source table.
  4. מוסיף guest ל-target table.
  5. מוחק tables ריקים.
  6. קורא `updateArrangement`.

Undo/redo:

- `handleUndo`: מחזיר מצב קודם ומעביר את המצב הנוכחי ל-`redoStack`.
- `handleRedo`: מחזיר מצב מ-`redoStack` ומעביר את הנוכחי ל-`undoStack`.

Over-capacity:

- `overCapacityTables` מחושב לפי מספר guests מול `maxTableSize`.
- המערכת מזהירה ומדגישה tables בעייתיים.
- היא לא חוסמת manual move שגורם לחריגה.

Visualizations:

- `TableCircle`: שולחנות עגולים, guests, צבעים ומדדים.
- `ColoredTree`: מראה באילו tables כל group יושב, ואם group מתפצל.
- `VisualTree`: מציג את עץ הקבוצות ו-edge weights.
- `ui/lib/metrics.ts`: מחשב display metrics כמו cohesion ו-loneliness.

### 3.9 Firebase / Persistence / Sync

Login:

- `ui/lib/firebase.ts` מגדיר Firebase.
- `ui/lib/auth.tsx` מספק `AuthProvider`.
- web משתמש ב-`signInWithPopup`.
- native משתמש ב-Google Sign-In ואז `signInWithCredential`.

Firestore:

- `StoreProvider` קורא `getDoc(doc(db, 'users', user.uid))`.
- אם יש `data.events`, הוא טוען אותם.
- בשמירה הוא כותב:
  - `{ events: JSON.parse(JSON.stringify(events)) }`
  - עם `{ merge: true }`.

localStorage:

- ב-web נשמר key בשם `seating_data`.
- native לא משתמש ב-localStorage הזה.

מגבלות:

- כל events נשמרים במסמך Firestore אחד.
- אין conflict resolution בין מכשירים.
- אם Firestore מכיל events, הוא יכול להחליף את state המקומי אחרי login.

### 3.10 Deployment

קבצים:

- `ui/Dockerfile`
- `solver/Dockerfile`
- `nginx.conf`
- `start.bat`
- `start.sh`
- `stop.bat`
- `stop.sh`

שירותים:

- `seating-ui`: Expo web על port 8081.
- `seating-solver`: Flask/gunicorn על port 5050.
- `seating-nginx`: reverse proxy על port 80.

Routing ב-`nginx.conf`:

- `/` -> `http://seating-ui:8081`
- `/solve` -> `http://seating-solver:5050/solve`
- `/health` -> `http://seating-solver:5050/health`
- `/about.html` -> static file
- `/demo-event.json` -> static debug data

משפט קצר להצגה:

"ב-production המקומי יש שלושה containers: UI, solver ו-nginx. ה-frontend שולח `/solve` ל-nginx, ו-nginx מעביר את זה ל-Flask solver."

## 4. Top 3 Recommended Code Walkthroughs for the Presentation

אלה שלושת האזורים שהכי כדאי לפתוח מול המרצים אם מבקשים לראות קוד מעניין.

### Walkthrough 1: Frontend generation flow

קובץ לפתוח:

- `ui/app/seating.tsx`

פונקציות להראות:

- `solverGroupsPayload`
- `handleGenerate`
- `chunksToTables`

מה הפונקציות מקבלות:

- `solverGroupsPayload` משתמש ב-`groups`, `depthWeighting`, ו-guests בתוך כל group.
- `handleGenerate` משתמש ב-state של המסך: `maxTableSize`, `familyPriority`, `strictness`, `solverGroupsPayload`.
- `chunksToTables` מקבל `chunks` מה-backend: `{ groupId, tableId, size }[]`.

מה זה עושה ב-3-6 צעדים:

1. מסנן רק guests עם `expectedToArrive`.
2. בונה payload של groups עם `id`, `parentId`, `guestCount`, `edgeWeight`.
3. שולח POST ל-`/solve`.
4. מקבל `jobId`.
5. עושה polling עד שהתוצאה מוכנה.
6. ממיר chunks בחזרה ל-`TableAssignment[]` עם שמות אורחים אמיתיים.

מה זה מחזיר / משנה:

- `handleGenerate` מעדכן את `candidates`.
- `chunksToTables` מחזיר מערך tables לתצוגה ושמירה.
- `handleSaveCandidate` אחר כך שומר arrangement דרך `addArrangement`.

למה זה מעניין:

- זה הגשר בין UI ידידותי למשתמש לבין בעיית optimization מתמטית.
- זה מראה הפרדה טובה: ה-solver לא צריך לדעת פרטי אורחים, רק counts ומבנה עץ.

תסריט עברי קצר להגיד:

"כאן מתחיל כל תהליך ההושבה. אני לא שולח לשרת את כל פרטי האורחים, אלא רק את מבנה הקבוצות, מספר האורחים הצפויים בכל קבוצה, והמשקל בין קבוצות. אחרי שה-solver מחזיר chunks, הפונקציה `chunksToTables` מחברת אותם בחזרה לאורחים האמיתיים לפי הסדר בקבוצה. ככה ה-algorithm נשאר כללי, וה-UI שומר את המידע האישי."

### Walkthrough 2: Backend normalization before solving

קובץ לפתוח:

- `solver/api.py`

פונקציות להראות:

- `_prepare_solver_groups`
- `_add_leaf`
- `_clean_assignment`
- בקצרה: `solve_endpoint`, `solve_status`

מה הפונקציות מקבלות:

- `_prepare_solver_groups(ui_groups, table_capacity)` מקבל groups מה-frontend וקיבולת שולחן.
- `_add_leaf(...)` מקבל guest count ומייצר leaf או chunks.
- `_clean_assignment(assignment, solver_groups)` מקבל assignment פנימי מה-solver ומחזיר chunks שה-frontend מבין.

מה זה עושה ב-3-6 צעדים:

1. בודק אם יש root אחד או כמה roots.
2. אם צריך, מוסיף synthetic root בשם `_root`.
3. הופך groups פנימיים עם guests ל-leaf מלאכותי `_direct_...`.
4. מפצל groups גדולים מדי ל-`_chunk_...`.
5. מריץ את `solve`.
6. מנקה את IDs המלאכותיים לפני החזרה ל-frontend.

מה זה מחזיר / משנה:

- `_prepare_solver_groups` מחזיר groups בפורמט solver: `id`, `size`, `parent_id`, `edge_weight`.
- `_clean_assignment` מחזיר chunks: `groupId`, `tableId`, `size`.

למה זה מעניין:

- זה מטפל בפער בין מודל UI גמיש לבין solver שעובד רק על leaves.
- זה מראה robustness למקרים כמו כמה roots, guests בקבוצה פנימית, וקבוצה גדולה מדי.

תסריט עברי קצר להגיד:

"ה-UI מאפשר מבנה מאוד גמיש: כמה roots, guests ישירות על קבוצה שיש לה ילדים, וקבוצות שיכולות להיות גדולות מקיבולת שולחן. ה-solver לעומת זאת עובד על leaves בלבד. לכן לפני ה-optimization יש שלב normalization. הוא מוסיף root מלאכותי אם צריך, יוצר leaves מלאכותיים ל-guests ישירים, ומפצל קבוצות גדולות ל-chunks. אחרי הפתרון אנחנו מנקים את השמות המלאכותיים ומחזירים ל-frontend group IDs אמיתיים."

### Walkthrough 3: Weighted tree distance and fitness

קבצים לפתוח:

- `solver/tree_distance.py`
- `solver/fitness.py`

פונקציות להראות:

- `GuestTree.dist`
- `GuestTree.precompute_dist_matrix`
- `_eval_one`
- `evaluate_population`

מה הפונקציות מקבלות:

- `GuestTree.dist(i, j)` מקבל שני indices של groups/nodes.
- `precompute_dist_matrix()` משתמש בכל nodes בעץ.
- `_eval_one(args)` מקבל assignment יחיד, distance matrix, `alpha`, `p`.
- `evaluate_population(assignments, tree, max_table_size, alpha, p, dist_matrix)` מקבל population של assignments.

מה זה עושה ב-3-6 צעדים:

1. `GuestTree` מחשב weighted depth לכל node.
2. `dist` מוצא LCA ומחשב weighted path distance.
3. `precompute_dist_matrix` מחשב מרחקים לכל הזוגות מראש.
4. `_eval_one` בודק מי יושב באותו שולחן.
5. הוא מחשב loneliness לפי המרחק ל-neighbor הכי קרוב באותו שולחן.
6. הוא מחשב cohesion לפי inverse distance ומחזיר `[num_tables, penalty]`.

מה זה מחזיר / משנה:

- `dist` מחזיר מספר: מרחק משוקלל.
- `precompute_dist_matrix` מחזיר matrix של מרחקים.
- `_eval_one` מחזיר `(number_of_tables, penalty)`.
- `evaluate_population` מחזיר מטריצה של objectives לכל population.

למה זה מעניין:

- כאן מוגדר בפועל מה זה "קרובים" ומה זה "סידור טוב".
- זה משלב מבנה עץ, LCA, ו-fitness optimization.

תסריט עברי קצר להגיד:

"האלגוריתם לא יודע לבד מי משפחה קרובה ומי רחוק. בשביל זה אנחנו מתרגמים את עץ הקבוצות למרחקים משוקללים. אם שתי קבוצות נפגשות באב משותף קרוב, המרחק קטן. אם הן נמצאות בענפים רחוקים, המרחק גדול. אחר כך ה-fitness משתמש במרחקים האלה: הוא מעניש בדידות, כלומר קבוצה שיושבת רחוק מכל מי שאיתה בשולחן, ומתגמל cohesion, כלומר קבוצות קרובות שיושבות יחד."

### Walkthrough 4 אופציונלי: NSGA-II, initializers, operators, repair

קבצים לפתוח:

- `solver/optimizer.py`
- `solver/initializers.py`
- `solver/operators.py`

פונקציות להראות:

- `run_optimization`
- `generate_initial_population`
- `mutate`
- `crossover`
- `repair`

למה להראות אם יש זמן:

- זה מראה שהפרויקט לא רק קורא ל-library, אלא מגדיר sampling, mutation, crossover ו-repair מותאמים לבעיה.

תסריט קצר:

"NSGA-II נותן את המסגרת, אבל אנחנו מגדירים איך seating solution נראה, איך מייצרים population התחלתי, ואיך משנים פתרונות בלי לשבור capacity. לכן יש initializers חכמים, mutation שמבין tables, crossover לפי subtree, ו-repair שמתקן שולחנות שחורגים."

## 5. Concrete Example Data

### 5.1 Example frontend solver payload JSON

דוגמה למה ש-`ui/app/seating.tsx` שולח ל-`POST /solve`:

```json
{
  "groups": [
    {
      "id": "g_bride",
      "parentId": null,
      "guestCount": 0,
      "edgeWeight": 1
    },
    {
      "id": "g_bride_mom",
      "parentId": "g_bride",
      "guestCount": 6,
      "edgeWeight": 2
    },
    {
      "id": "g_bride_dad",
      "parentId": "g_bride",
      "guestCount": 5,
      "edgeWeight": 2
    },
    {
      "id": "g_friends",
      "parentId": null,
      "guestCount": 12,
      "edgeWeight": 1
    }
  ],
  "tableCapacity": 10,
  "alpha": 2,
  "p": 2
}
```

הסבר:

- `g_bride` הוא internal group ללא guests ישירים.
- `g_bride_mom` ו-`g_bride_dad` הם leaves עם guests.
- `g_friends` הוא root נוסף עם 12 guests, יותר מקיבולת שולחן 10.
- בגלל שיש יותר מ-root אחד, backend יוסיף `_root`.
- בגלל ש-`g_friends` גדול מקיבולת שולחן, backend יפצל אותו ל-chunks.

### 5.2 Example backend normalized groups

אחרי `_prepare_solver_groups`, backend יכול לייצר:

```json
[
  {
    "id": "_root",
    "size": 0,
    "parent_id": 0,
    "edge_weight": 1.0
  },
  {
    "id": "g_bride",
    "size": 0,
    "parent_id": "_root",
    "edge_weight": 1
  },
  {
    "id": "g_bride_mom",
    "size": 6,
    "parent_id": "g_bride",
    "edge_weight": 2
  },
  {
    "id": "g_bride_dad",
    "size": 5,
    "parent_id": "g_bride",
    "edge_weight": 2
  },
  {
    "id": "g_friends",
    "size": 0,
    "parent_id": "_root",
    "edge_weight": 1
  },
  {
    "id": "_chunk_g_friends_0",
    "size": 10,
    "parent_id": "g_friends",
    "edge_weight": 0.0
  },
  {
    "id": "_chunk_g_friends_1",
    "size": 2,
    "parent_id": "g_friends",
    "edge_weight": 0.0
  }
]
```

הסבר:

- `_root` הוא root מלאכותי.
- `g_friends` הפך ל-internal node בגודל 0.
- האורחים שלו חולקו לשני leaves כדי לא לעבור קיבולת.

### 5.3 Example solver chunks response

אחרי optimization ו-`_clean_assignment`, Flask מחזיר ל-frontend משהו כזה:

```json
{
  "status": "done",
  "solutions": [
    {
      "tables": 3,
      "penalty": 42.7,
      "chunks": [
        {
          "groupId": "g_bride_mom",
          "tableId": 0,
          "size": 6
        },
        {
          "groupId": "g_bride_dad",
          "tableId": 1,
          "size": 5
        },
        {
          "groupId": "g_friends",
          "tableId": 2,
          "size": 10
        },
        {
          "groupId": "g_friends",
          "tableId": 1,
          "size": 2
        }
      ]
    }
  ]
}
```

שימו לב:

- ה-solver לא מחזיר שמות אורחים.
- הוא מחזיר groupId + tableId + size.
- אותו group יכול להופיע בכמה chunks אם הוא פוצל.

### 5.4 How chunks become real guests in frontend tables

ב-`ui/app/seating.tsx`, הפונקציה `chunksToTables` עושה:

1. בונה `guestsByGroup`: map של groupId לרשימת expected guests אמיתיים.
2. מחזיקה `consumed`: כמה guests כבר נלקחו מכל group.
3. לכל chunk:
   - מוצאת את רשימת guests של `chunk.groupId`.
   - לוקחת slice בגודל `chunk.size`.
   - מוסיפה אותם ל-`tableMap` לפי `chunk.tableId`.
4. בסוף ממירה את `tableMap` ל-`TableAssignment[]`.
5. עושה remap ל-table IDs כדי שיוצגו מ-1 ולא מ-0.

דוגמה:

אם `g_friends` מכיל 12 guests:

```text
["Noa", "Dan", "Roni", "Tal", "Adi", "Yael", "Omer", "Lior", "Shir", "Eli", "Maya", "Gil"]
```

וה-backend מחזיר:

```json
[
  { "groupId": "g_friends", "tableId": 2, "size": 10 },
  { "groupId": "g_friends", "tableId": 1, "size": 2 }
]
```

אז `chunksToTables` ישים את 10 הראשונים בשולחן אחד, ואת 2 הבאים בשולחן אחר. לכן ה-solver עובד עם counts, וה-frontend מחבר חזרה guests אמיתיים.

## 6. Demo Presentation Flow

זה סדר מומלץ להצגה באפליקציה רצה.

1. Event list  
   פתח את המסך הראשי. הסבר: "כאן המשתמש מנהל אירועים, יכול ליצור אירוע חדש או לשכפל אירוע קיים."

2. Guest tree  
   פתח event והראה את רשימת הקבוצות. הסבר: "הקבוצות נשמרות כעץ לפי `parentId`, אבל בפועל ב-store זה מערך שטוח."

3. Group weights  
   פתח group או tree view והראה edge weight. הסבר: "המשקל מייצג כמה חזק ההפרדה בין קבוצה לאב שלה. משקל גבוה אומר שהאלגוריתם ינסה פחות לערבב את הענף הזה עם אחרים."

4. Expected guests  
   הצג guest עם toggle של coming/not coming. הסבר: "רק guests שמסומנים expected נכנסים ל-solver payload."

5. Generate seating  
   עבור למסך seating. הצג max table size, family priority, avoid lonely guests, depth weighting. לחץ generate.

6. Candidate results  
   הצג candidates. הסבר: "ה-solver מחזיר כמה אפשרויות, בדרך כלל tradeoffs לפי מספר שולחנות ו-penalty."

7. Save arrangement  
   שמור candidate. הסבר: "שמירה מוסיפה `SeatingArrangement` לתוך current event דרך `addArrangement`."

8. Table view  
   פתח arrangement שמור. הצג tables. הסבר cohesion/loneliness בקצרה.

9. Colored tree view  
   עבור ל-Tree Map / ColoredTree. הסבר: "כאן רואים איך groups מתפצלים בין tables. אם group מופיע בכמה צבעים, הוא split."

10. Manual guest move  
   בחר guest והעבר לשולחן אחר. הסבר: "המערכת מאפשרת תיקון ידני אחרי optimization."

11. Undo/redo  
   לחץ undo ואז redo. הסבר: "כל move שומר snapshot של tables ב-undoStack."

12. Backend solver briefly  
   פתח קוד או הסבר בעל פה: "ה-frontend שולח `/solve`, Flask יוצר job, מנרמל groups, מריץ NSGA-II, ואז ה-frontend עושה polling ומציג תוצאה."

משפט פתיחה לדמו:

"אני אראה את זה כמו משתמש אמיתי: מתחילים מאירוע ועץ קבוצות, מסמנים מי מגיע, מריצים seating optimization, ואז רואים איך התוצאה ניתנת לבדיקה ולעריכה ידנית."

## 7. Interesting Code Areas to Present

אם יש זמן מעבר לשלושת ה-walkthroughs, אלה אזורים טובים:

### Building solver payload

- קובץ: `ui/app/seating.tsx`
- פונקציות: `solverGroupsPayload`, `handleGenerate`
- מה להדגיש: expected guests בלבד, edge weights, depth weighting, POST ל-`/solve`.

### Backend normalization

- קובץ: `solver/api.py`
- פונקציות: `_prepare_solver_groups`, `_clean_assignment`
- מה להדגיש: synthetic root, direct guests, chunks, החזרה ל-group IDs אמיתיים.

### Weighted tree distance

- קובץ: `solver/tree_distance.py`
- פונקציות: `GuestTree`, `dist`, `precompute_dist_matrix`
- מה להדגיש: LCA, weighted depth, distance matrix.

### Fitness

- קובץ: `solver/fitness.py`
- פונקציות: `_eval_one`, `evaluate_population`
- מה להדגיש: objectives, loneliness, cohesion.

### Initializers and operators

- קבצים: `solver/initializers.py`, `solver/operators.py`
- פונקציות: `generate_initial_population`, `mutate`, `crossover`, `repair`
- מה להדגיש: פתרונות התחלתיים חכמים ו-capacity repair.

### Manual editing

- קובץ: `ui/app/seating.tsx`
- פונקציות: `handleMoveGuest`, `handleUndo`, `handleRedo`
- מה להדגיש: השילוב בין algorithmic result לבין שליטה ידנית של המשתמש.

### Firebase sync

- קבצים: `ui/lib/store.tsx`, `ui/lib/auth.tsx`, `ui/lib/firebase.ts`
- מה להדגיש: localStorage תמיד ב-web, Firestore רק כשמחוברים.

## 8. Files I Should Study Before the Presentation

| עדיפות | קובץ | זמן מומלץ | מה להבין | פונקציות לסמן | משפט שאתה צריך לדעת להגיד |
|---|---:|---|---|---|---|
| High | `ui/lib/store.tsx` | 60-90 דקות | state, persistence, group tree, arrangements | `StoreProvider`, `addEvent`, `addGroup`, `moveGroup`, `getSubtreeGroups`, `addArrangement` | "זה המקום המרכזי שבו נשמרים ומעודכנים כל נתוני האפליקציה." |
| High | `ui/app/seating.tsx` | 90-120 דקות | generation, polling, chunk conversion, save, manual edit | `solverGroupsPayload`, `handleGenerate`, `chunksToTables`, `handleMoveGuest` | "זה הקובץ שמחבר בין המשתמש לבין ה-solver." |
| High | `solver/api.py` | 60 דקות | endpoints, async jobs, normalization | `_prepare_solver_groups`, `_clean_assignment`, `_run_solve`, `solve_endpoint` | "זה מתרגם את מודל ה-UI למודל שה-solver יודע לפתור." |
| High | `solver/tree_distance.py` | 45-60 דקות | weighted LCA distance | `GuestTree`, `dist`, `precompute_dist_matrix` | "כאן המערכת מחשבת מי קרוב למי לפי העץ." |
| High | `solver/fitness.py` | 45-60 דקות | objectives, cohesion/loneliness | `_eval_one`, `evaluate_population` | "כאן מוגדר מה הופך seating arrangement לטוב." |
| High | `solver/optimizer.py` | 60-90 דקות | NSGA-II integration | `SeatingProblem`, `run_optimization` | "כאן מריצים את האלגוריתם הרב-מטרתי." |
| Medium | `solver/initializers.py` | 45 דקות | starting population | `generate_initial_population`, `nearest_neighbor`, `bottom_up_merge` | "אלה שיטות להתחיל מחלופות סבירות." |
| Medium | `solver/operators.py` | 45 דקות | mutation/crossover/repair | `mutate`, `crossover`, `repair` | "אלה פעולות השינוי של הפתרונות." |
| Medium | `ui/app/event/[id].tsx` | 30-40 דקות | ניהול עץ באירוע | `EventScreen`, `flatTree` | "כאן המשתמש רואה ומנהל את עץ הקבוצות." |
| Medium | `ui/lib/metrics.ts` | 30 דקות | display metrics | `computeTableMetrics`, `treeDist` | "זה מחשב מדדים להצגה אחרי שיש arrangement." |
| Medium | `solver/gnn_model.py` | 30-45 דקות | GNN initializer | `SeatingGNN`, `gnn_initializer` | "ה-GNN הוא initializer אופציונלי, לא solver ראשי." |
| Low | `nginx.conf`, Dockerfiles | 20-30 דקות | deployment routing | nginx locations | "nginx מחבר בין UI לבין solver." |

## 9. Expected Lecturer Questions and Prepared Answers

**למה בחרתם NSGA-II?**  
כי יש כאן כמה מטרות שמתנגשות: מצד אחד רוצים מעט שולחנות, מצד שני רוצים איכות חברתית טובה. NSGA-II מתאים לבעיה רב-מטרתית ומחזיר tradeoffs במקום פתרון יחיד לפי משקל קשיח.

**איך אתם מייצגים קשרים בין קבוצות?**  
ה-frontend שומר groups במערך שטוח עם `parentId`. לכל group יש `edgeWeight` שמייצג את המרחק מה-parent. בצד solver זה הופך לעץ משוקלל.

**איך האלגוריתם יודע מי קרוב למי?**  
הוא מחשב weighted tree distance דרך LCA. אם שתי קבוצות נמצאות תחת אב משותף קרוב, המרחק קטן. אם הן בענפים רחוקים, המרחק גדול.

**איך נמנעים מחריגה מקיבולת שולחן?**  
ה-initializers מנסים לבנות פתרונות valid, mutation בודק capacity לפני moves/swaps, crossover מפעיל `repair`, ו-`compact_tables` יכול לחזור ל-`random_valid` אם לא מצליח לתקן.

**מה זה cohesion?**  
מדד שמתגמל קבוצות קרובות שיושבות באותו שולחן. ככל שהמרחק בעץ קטן יותר, התרומה ל-cohesion גבוהה יותר.

**מה זה loneliness?**  
מדד שמעניש קבוצה אם היא יושבת בשולחן שבו הקבוצה הכי קרובה אליה עדיין רחוקה בעץ. זה מונע מצב שמישהו יושב "מנותק" חברתית.

**מה עושים `alpha` ו-`p`?**  
`alpha` קובע כמה חזק מענישים loneliness. `p` מחזק במיוחד מקרים של מרחקים גדולים, כי הוא exponent על המרחק.

**איך ה-GNN משתלב?**  
ה-GNN משמש כ-initializer אופציונלי אם `gnn_model.pt` קיים. הוא לא מחליף את NSGA-II. הוא עוזר ליצור population התחלתי טוב יותר.

**מה קורה אם ה-solver נכשל?**  
ב-`handleGenerate` יש catch. ה-frontend מציג הודעה ומייצר seating random דרך `generateRandomSeating`, כדי שהמשתמש עדיין יקבל משהו.

**איך הנתונים נשמרים?**  
ה-store שומר events ב-state. ב-web הוא כותב ל-localStorage. אם המשתמש מחובר, הוא גם כותב את כל events ל-Firestore תחת `users/{uid}`.

**איך chunks הופכים לאורחים אמיתיים?**  
ה-solver מחזיר groupId, tableId ו-size. `chunksToTables` משתמש ב-`guestsByGroup` כדי לקחת את האורחים הצפויים מאותה קבוצה ולבנות `TableAssignment[]`.

**מה היה החלק הכי קשה?**  
תשובה טובה: "החלק המורכב היה לחבר בין UI גמיש מאוד לבין solver שעובד על leaves. לכן יש normalization ב-backend שמטפל בכמה roots, guests בקבוצות פנימיות, וקבוצות גדולות מדי."

**מה היית משפר בהמשך?**  
תשובה טובה: "הייתי משפר conflict resolution ב-Firestore, progress reporting מה-solver, validation חזק יותר לעריכה ידנית, והפרדה ברורה יותר בין production GNN לבין research scripts."

## 10. Glossary

| מונח | הסבר קצר בעברית |
|---|---|
| NSGA-II | אלגוריתם אבולוציוני רב-מטרתי. כאן הוא מחפש סידורי הושבה טובים לפי כמה מטרות במקביל. |
| Pareto front | אוסף פתרונות שבהם אי אפשר לשפר מטרה אחת בלי לפגוע באחרת. למשל פחות שולחנות מול איכות חברתית. |
| fitness | פונקציה שמודדת כמה פתרון טוב. בפרויקט זה כולל מספר שולחנות ו-penalty חברתי. |
| cohesion | מדד חיובי של קרבה בתוך שולחן. קבוצות קרובות בעץ שיושבות יחד משפרות cohesion. |
| loneliness | מדד של בדידות. אם group יושב עם groups רחוקים ממנו, loneliness עולה. |
| edge weight | משקל הקשת בין group לבין parent. משקל גבוה אומר הפרדה חזקה יותר בין ענפים. |
| initializer | שיטה ליצירת פתרונות התחלתיים לפני שהאלגוריתם מתחיל להתפתח. |
| mutation | שינוי קטן בפתרון קיים, כמו להזיז group לשולחן אחר או למזג שולחנות. |
| crossover | שילוב בין שני פתרונות, למשל לקיחת subtree seating מפתרון אחד וחיבור לפתרון אחר. |
| repair | תיקון פתרון לא חוקי, למשל שולחן שעבר capacity. |
| GNN initializer | שימוש ב-Graph Neural Network כדי ליצור פתרון התחלתי לפי מבנה העץ. בפרויקט זה אופציונלי ולא מחליף את NSGA-II. |

## 11. Recommended 3-5 Day Study Plan

### Day 1: Architecture and UI Flow

קבצים:

- `ui/app/_layout.tsx`
- `ui/lib/types.ts`
- `ui/lib/store.tsx`
- `ui/app/index.tsx`
- `ui/app/event/[id].tsx`
- `ui/app/group/[id].tsx`

מטרה:

- להבין איך האפליקציה עולה, איפה state נשמר, ואיך events/groups/guests עובדים.

בסוף היום:

- לדעת להסביר איך משתמש יוצר event, בונה עץ קבוצות ומוסיף guests.

### Day 2: Seating Generation Flow

קבצים:

- `ui/app/seating.tsx`
- `ui/lib/metrics.ts`
- `ui/components/TableCircle.tsx`
- `ui/components/ColoredTree.tsx`

מטרה:

- להבין `handleGenerate`, `solverGroupsPayload`, polling, `chunksToTables`, saving candidates, manual editing.

בסוף היום:

- לדעת לצייר את כל ה-flow מכפתור Generate עד saved arrangement.

### Day 3: Backend and Algorithm

קבצים:

- `solver/api.py`
- `solver/solve.py`
- `solver/optimizer.py`
- `solver/tree_distance.py`
- `solver/fitness.py`

מטרה:

- להבין normalization, async jobs, NSGA-II, weighted distance, fitness.

בסוף היום:

- לדעת להסביר את האלגוריתם ברמת מצגת ולהראות את קוד distance/fitness.

### Day 4: Initializers, Operators, GNN, Persistence, Deployment

קבצים:

- `solver/initializers.py`
- `solver/operators.py`
- `solver/gnn_model.py`
- `ui/lib/auth.tsx`
- `ui/lib/firebase.ts`
- `nginx.conf`
- `ui/Dockerfile`
- `solver/Dockerfile`

מטרה:

- להבין את החלקים המתקדמים והתומכים.

בסוף היום:

- לדעת להסביר GNN בזהירות, capacity repair, ו-deployment routing.

### Day 5: Review and Q&A

קבצים לחזרה:

- `ui/app/seating.tsx`
- `solver/api.py`
- `solver/tree_distance.py`
- `solver/fitness.py`
- `solver/optimizer.py`

מטרה:

- להתאמן על שאלות ותשובות ועל walkthroughs.

בסוף היום:

- לדעת לתת summary של 2 דקות, summary טכני של 5 דקות, ולהראות 2-3 קטעי קוד בביטחון.

## 12. Two-Minute Oral Project Summary

"הפרויקט הוא מערכת לניהול אירועים וליצירת סידורי הושבה אופטימליים. המשתמש יוצר אירוע, בונה עץ קבוצות של אורחים, מוסיף אורחים, ומסמן מי צפוי להגיע. לכל קבוצה יש קשר היררכי ומשקל לקבוצה שמעליה, כך שהמערכת יודעת להבין מי קרוב למי מבחינה חברתית או משפחתית.

בצד ה-frontend האפליקציה בנויה ב-Expo ו-React Native. יש store מרכזי שמנהל events, groups, guests, seating configuration ו-arrangements. הנתונים נשמרים מקומית ב-web וגם מסתנכרנים ל-Firestore כשמשתמש מחובר.

כאשר המשתמש לוחץ Generate, ה-frontend בונה payload קומפקטי שכולל את מבנה הקבוצות, מספר האורחים הצפויים בכל קבוצה, ומשקלי הקשרים. הבקשה נשלחת ל-Flask backend. ה-backend מנרמל את העץ לפורמט שה-solver יודע לפתור, מפעיל job אסינכרוני, וה-frontend עושה polling עד שהתוצאה מוכנה.

ה-solver משתמש ב-NSGA-II כדי לפתור בעיה רב-מטרתית: מצד אחד לצמצם מספר שולחנות, ומצד שני לשפר איכות חברתית. האיכות מחושבת לפי מרחקים משוקללים בעץ: cohesion מתגמל קבוצות קרובות שיושבות יחד, ו-loneliness מעניש קבוצות שיושבות רחוקות מכל מי שאיתן בשולחן.

בסוף ה-solver מחזיר candidate arrangements, ה-frontend ממיר אותם לשולחנות עם אורחים אמיתיים, והמשתמש יכול לשמור, לצפות, לראות visualizations, ולהזיז אורחים ידנית עם undo/redo."

## 13. Five-Minute Technical Summary

"המערכת בנויה מכמה שכבות. בצד ה-frontend יש אפליקציית Expo עם `expo-router`. הקובץ `_layout.tsx` טוען providers עבור theme, i18n, auth ו-store. ה-store המרכזי נמצא ב-`ui/lib/store.tsx`, והוא מנהל את כל מודל הנתונים: events, groups, guests, seating configs ו-arrangements.

העץ של האורחים נשמר בצורה פשוטה: מערך שטוח של `GuestGroup`, ולכל group יש `parentId`. זה מאפשר לבנות עץ, למחוק subtree, להזיז group, לשכפל event, ולייצא subtree לאירוע אחר. כל guest נשמר בתוך group, וה-field החשוב ל-solver הוא `expectedToArrive`.

ה-flow המרכזי נמצא ב-`ui/app/seating.tsx`. כאשר המשתמש לוחץ Generate, `solverGroupsPayload` בונה payload שבו לכל group יש `id`, `parentId`, `guestCount`, ו-`edgeWeight`. חשוב שרק expected guests נספרים. `handleGenerate` שולח POST ל-`/solve`, מקבל `jobId`, ואז עושה polling ל-`/solve/<jobId>`. כשהתוצאה מוכנה, `chunksToTables` מחברת את chunks של ה-solver בחזרה לאורחים אמיתיים.

בצד backend, `solver/api.py` מטפל ב-Flask endpoints. `solve_endpoint` יוצר job אסינכרוני. `_prepare_solver_groups` הוא שלב חשוב מאוד: הוא מתרגם את מודל ה-UI הגמיש למודל leaf-only שה-solver יודע לפתור. הוא מוסיף synthetic root אם יש כמה roots, יוצר leaves מלאכותיים ל-guests ישירים על internal groups, ומפצל groups גדולים מדי ל-chunks. אחרי הפתרון, `_clean_assignment` מחזיר group IDs אמיתיים ל-frontend.

האלגוריתם מתחיל ב-`solver/solve.py`, שיוצר `GuestTree` ומפעיל `run_optimization`. ב-`solver/tree_distance.py`, `GuestTree` בונה עץ משוקלל עם Euler tour ו-sparse table כדי לחשב LCA ו-weighted distances. המרחק הזה הוא הבסיס להבנת הקרבה בין קבוצות.

ה-fitness נמצא ב-`solver/fitness.py`. לכל assignment מחושבים שני objectives: מספר שולחנות ו-penalty. ה-penalty מורכב מ-loneliness פחות cohesion. loneliness מודד כמה רחוק ה-neighbor הקרוב ביותר של כל group באותו שולחן, ו-cohesion מתגמל זוגות קרובים שיושבים יחד.

`solver/optimizer.py` מחבר את זה ל-NSGA-II של `pymoo`. יש sampling מותאם דרך `initializers.py`, mutation/crossover דרך `operators.py`, ו-repair כדי לתקן חריגות capacity. לכן זה לא רק שימוש בספרייה, אלא התאמה של אלגוריתם אבולוציוני לבעיה של seating.

בנוסף יש GNN ב-`solver/gnn_model.py`. הוא משמש כ-initializer אופציונלי שמייצר population התחלתי לפי embeddings של העץ. חשוב להדגיש שהוא לא מחליף את NSGA-II.

אחרי שיש arrangement, ה-frontend מציג tables עם `TableCircle`, מחשב display metrics ב-`ui/lib/metrics.ts`, ומציג ColoredTree שמראה איך groups התחלקו בין tables. המשתמש יכול גם להזיז guests ידנית, והמערכת שומרת undo/redo stacks.

ב-deployment יש שלושה services: UI, solver ו-nginx. nginx מנתב `/` ל-UI ואת `/solve` ו-`/health` ל-Flask solver."

## 14. Limitations / Things Not to Overclaim

אלה דברים שחשוב לא להגזים בהם מול המרצים:

- לא להגיד שה-GNN הוא האלגוריתם הראשי. האלגוריתם הראשי הוא NSGA-II.
- לא להגיד שה-GNN תמיד פעיל. הוא משמש רק אם `gnn_model.pt` נטען בהצלחה.
- לא להגיד ש-mid-run GNN injection פעיל ב-production. הקוד קיים ב-`GNNInjectionCallback`, אבל `solve()` לא מפעיל `gnn_inject=True`.
- לא להגיד שיש collaboration מלא בזמן אמת. Firestore שומר את כל events במסמך אחד, ואין conflict resolution בין מכשירים.
- לא להגיד שעריכה ידנית תמיד שומרת capacity. היא מאפשרת חריגה ומציגה warning.
- לא להגיד שכל שדה guest מנוצל. לדוגמה `arrivedConfirmed` מוצג, אבל לא נמצא flow מרכזי שמעדכן אותו ל-true.
- לא להגיד ש-FCM notifications הן חלק מה-flow הרגיל. backend תומך ב-`fcmToken`, אבל ה-frontend הנוכחי לא שולח אותו ב-`handleGenerate`.
- לא להגיד ש-native שומר events ב-localStorage. ה-localStorage בקוד עובד רק ב-web.
- לא להגיד שה-solver תמיד מצליח. ב-frontend יש fallback ל-random seating אם solver נכשל.
- לא לבזבז זמן על styling components. עדיף להתמקד ב-store, generation flow, backend normalization, tree distance, fitness, NSGA-II ו-manual editing.

משפט טוב אם שואלים על מגבלות:

"הפרויקט עובד מקצה לקצה, אבל יש דברים שהייתי מציג כ-future work: conflict resolution ב-Firestore, progress reporting מה-solver, בדיקות עומס עמוקות יותר, ואכיפה חזקה יותר של capacity בעריכה ידנית."
