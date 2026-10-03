# 🎉 Seating Arrangement Manager

A full-stack seating planning app for events such as weddings, birthdays, and corporate dinners. Organize guests into a hierarchy of social groups, then generate optimized seating candidates that trade off number of tables against social seating quality.

The main optimizer is NSGA-II. A Graph Neural Network (GNN) is used only during initialization, to create some starting candidates before the evolutionary search continues.

## ✨ Features

- Event creation and management
- Guest and group hierarchy (tree) management
- Relationship weights between groups
- Multiple seating candidates generated asynchronously
- Comparison by table count and social quality
- Table and tree-based visualizations
- Saved arrangements with manual editing after generation
- English / Hebrew UI, light / dark theme
- Firebase sync for signed-in users and local web guest mode

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git
- A modern browser

The startup scripts build and run the UI, solver, and nginx containers.

| | Windows | Linux / macOS |
|---|---|---|
| Start | `start.bat` | `./start.sh` |
| Start with demo data (~500 guests) | `start.bat --debug` | `./start.sh --debug` |
| Stop | `stop.bat` | `./stop.sh` |

Then open http://localhost.

### Firebase (optional)

Web guest mode works out of the box using browser localStorage. Google sign-in and Firestore sync require a configured Firebase project. The configuration lives in `ui/lib/firebase.ts`; make sure Google sign-in is enabled in your Firebase Authentication settings.

## 🧭 How It Works

1. Create an event and organize guests into social groups.
2. Generate seating candidates from the seating screen.
3. Compare alternatives by table count and social seating quality.
4. Save an arrangement and adjust it manually if needed.

## 🏗️ Architecture

```
Browser / Mobile
      │
      ▼
   nginx (:80)  — only exposed port
   ├── /        → UI container (Expo, React Native Web)
   └── /solve   → Solver container (Flask + Gunicorn)
```

Firebase is used directly by the client for Authentication and Firestore sync.

| Container | Image | Role |
|---|---|---|
| `seating-ui` | `node:20-slim` | Expo dev server serving the web app |
| `seating-solver` | `python:3.10-slim` | Gunicorn (3 workers) wrapping the NSGA-II optimizer |
| `seating-nginx` | `nginx:alpine` | Reverse proxy, port 80 |

Solving is **asynchronous**: `POST /solve` returns a `jobId`, and the UI polls `GET /solve/{jobId}` until the result is ready. The backend includes thread-budget logic for concurrent solve requests.

## 🧮 Solver

The seating problem is treated as a multi-objective optimization problem:

- **Fewer tables**
- **Better social seating quality** by penalizing social isolation and rewarding cohesion

NSGA-II is the main optimizer. The GNN does not produce the final seating; it only helps seed part of the initial population. The solver returns several trade-off candidates so you can pick the arrangement that suits your event.

## 💾 Data Storage

On web, guest users store events in browser `localStorage`. Signed-in web users also sync their events with Firestore.

On native Android/iOS, event sync relies on Firestore for signed-in users; local guest event persistence is currently web-only.

## 🧰 Tech Stack

- **Frontend:** React Native, Expo, Expo Router, React Native Web
- **Auth & storage:** Firebase Auth, Firestore
- **Backend API:** Flask, Gunicorn
- **Optimization:** pymoo (NSGA-II)
- **Machine learning:** PyTorch, PyTorch Geometric
- **Infrastructure:** Docker, nginx

## 📱 Mobile

The UI is built with Expo, so it can also target Android and iOS:

Run server (web works):

```bash
start.bat
```

Install Android App:

```bash
cd ui
npm install
npx expo prebuild --platform android --clean
cd android
gradlew installRelease
```

The Docker flow serves the web version in the browser. The Android app is a separately installed app (not a browser pointing at localhost), but it still relies on the server started by Docker, so the server must be running for the app to work.

## 📁 Project Structure

```
ui/        React Native / Expo frontend
solver/    Flask API and seating optimization engine
research/  Research report and experiment figures
static/    Static assets and demo-related files
```

## 📚 More Documentation

- [solver/README.md](solver/README.md): solver modules, research scripts, and optimization notes
- [research/report.pdf](research/report.pdf): full technical report with algorithms, experiments, and figures