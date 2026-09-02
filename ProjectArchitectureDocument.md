# Project Architecture Report

| | |
|---|---|
| **Student Names / ID** | *(Fill in)* |
| | *(Fill in)* |
| | *(Fill in)* |
| **Project Code** | *(Fill in)* |
| **Advisor** | *(Fill in)* |

---

## Abstract

This project implements a Seating Arrangement Optimizer -- a full-stack web and mobile application that generates optimal seating plans for events. The system models guest relationships as a weighted hierarchical tree and employs multi-objective evolutionary optimization (NSGA-II), enhanced by a Graph Neural Network (GNN), to produce a set of Pareto-optimal seating arrangements. Each solution balances competing goals: minimizing the number of tables, maximizing group cohesion, and minimizing social isolation. The application provides a cross-platform user interface for managing events, building guest hierarchies, interactively exploring the generated solutions and modifying them. Cloud services (Firebase) handle authentication and store user data (such as guests list and saved arrangements).

---

## 1. Introduction

Seating arrangement for events such as weddings and corporate gatherings is a combinatorially complex task. A wedding with 200 guests and tables of 10 has an astronomical number of possible configurations, and the quality of a seating plan depends on social dynamics, family structure, and group cohesion. This project explores the design of a system that models guest relationships as a weighted hierarchical tree and uses multi-objective optimization to generate high-quality seating solutions.

---

## 2. Problem Statement

Manually arranging seating for large events is time-consuming and error-prone, and the planner cannot explore the vast solution space. Additionally, last-minute changes, such as guests canceling or new ones being added, are very common and require redoing the arrangement from scratch, which is not always feasible given time constraints. The challenge is to automatically assign guests to tables while balancing multiple conflicting goals: minimizing table count, keeping social groups together, and preventing individual guests from being isolated from people they know.

---

## 3. Objectives

1. Design a hierarchical tree data model for guest groups with configurable edge weights.
2. Implement NSGA-II multi-objective optimization to balance table count, cohesion, and isolation.
3. Train and integrate a Graph Neural Network (GNN) to accelerate optimization convergence.
4. Develop a cross-platform app (web, mobile) for managing events, guests, and seating.
5. Integrate Firebase for authentication and user data storage.
6. Present results as a Pareto front with interactive table visualizations.

---

## 4. User Stories

1. As an event planner, I want to build a hierarchical tree of guest groups, so the system understands the social structure.
2. As an event planner, I want to set edge weights on group relationships, so the optimizer knows which groups should sit together.
3. As an event planner, I want to add guests with contact details to groups, so I have a centralized registry.
4. As an event planner, I want to generate multiple Pareto-optimal seating arrangements with one click.
5. As an event planner, I want to save and compare multiple seating arrangements per event.
6. As an event planner, I want to sign in with Google and sync my data across devices.
7. As an event planner, I want to drag and drop groups to reorganize the hierarchy.
8. As an event planner, I want to view seating arrangements in various views (list of tables or color-coded tree view where colors represent table assignments).
9. As an event planner, I want to manually modify generated seating arrangements.
10. As an event planner, I want to export the guests tree (or a sub guests-tree) to another event.
11. As an event planner, I want to search for the table of a specific guest in a certain seating arrangement.

---

### Sample Test Code for User Stories

**User Story 1: Build a Hierarchical Guest Tree**
```python
import requests

def test_create_guest_hierarchy():
    root = requests.post("http://localhost/api/events/1/groups", json={
        "name": "All Guests", "parentId": None, "edgeWeight": 1.0
    })
    assert root.status_code == 201
    child = requests.post("http://localhost/api/events/1/groups", json={
        "name": "Bride's Family", "parentId": root.json()["id"], "edgeWeight": 0.5
    })
    assert child.status_code == 201
    assert child.json()["parentId"] == root.json()["id"]

test_create_guest_hierarchy()
```

**User Story 4: Generate Seating Arrangements**
```python
import time

def test_generate_seating():
    solve_request = {
        "groups": [
            {"id": "g1", "name": "Family A", "parentId": None, "edgeWeight": 1.0,
             "guests": [{"id": "p1", "name": "Alice"}, {"id": "p2", "name": "Bob"}]},
            {"id": "g2", "name": "Family B", "parentId": None, "edgeWeight": 1.0,
             "guests": [{"id": "p3", "name": "Carol"}, {"id": "p4", "name": "Dave"}]}
        ],
        "tableCapacity": 10
    }
    response = requests.post("http://localhost/solve", json=solve_request)
    job_id = response.json()["jobId"]
    for _ in range(60):
        status = requests.get(f"http://localhost/solve/{job_id}").json()
        if status["status"] == "done":
            break
        time.sleep(2)
    assert status["status"] == "done"
    assert len(status["solutions"]) >= 1

test_generate_seating()
```

**User Story 6: Google Sign-In and Cloud Sync**
```python
from unittest.mock import MagicMock

def test_firebase_sync_on_login():
    mock_firestore = FirebaseMock()
    local_events = [{"id": "evt1", "name": "My Wedding", "groups": []}]
    sync_to_cloud(mock_firestore, user_uid="user123", local_data=local_events)
    written = mock_firestore.collection("users").document("user123").set.call_args[0][0]
    assert written["events"][0]["name"] == "My Wedding"

test_firebase_sync_on_login()
```

**User Story 11: Search for a Guest's Table**
```python
def test_search_guest_table():
    arrangement = {
        "tables": [
            {"tableId": 1, "guests": [{"guestId": "p1", "guestName": "Alice"}]},
            {"tableId": 2, "guests": [{"guestId": "p2", "guestName": "Bob"}]}
        ]
    }
    result = search_guest_in_arrangement(arrangement, query="Bob")
    assert result["guestName"] == "Bob"
    assert result["tableId"] == 2

test_search_guest_table()
```

---

## 5. Application Screenshots

*[Placeholder for Screenshot 1 -- Event List / Home Screen]*

*[Placeholder for Screenshot 2 -- Guest Tree Management]*

*[Placeholder for Screenshot 3 -- Visual Tree View]*

*[Placeholder for Screenshot 4 -- Seating Generation & Results]*

*[Placeholder for Screenshot 5 -- Login screen]*

---

## 6. Typical User Flows

1. **Creating an Event and Guest Tree:**
Open app → Create event (name, date) → Add top-level groups ("Bride's Side", "Groom's Side") → Add subgroups and guests → Adjust edge weights → Review in visual tree view.

2. **Generating and Exploring Seating:**
Question - why "Wait for completion (push notification)" ?
Navigate to Seating screen → Set table size → Tap "Generate" → Wait for completion (push notification) → Browse Pareto solutions → Inspect table diagrams and metrics → Save preferred arrangement.

---

## 7. Project Entity Diagram
The diagram below showcases key system components including clients, servers and network. These are necessary in order to allow our users to login to the service via their clients and communicate with the different servers
```
                         ┌──────────────────────────────────┐
                         │           Firebase Cloud         │
                         │  ┌────────────┐ ┌──────────────┐ │
                         │  │  Firestore │ │  Firebase    │ │
                         │  │  (Database)│ │  Auth (Google)││
                         │  └─────┬──────┘ └──────┬───────┘ │
                         └─────────────────┼────────────────|
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
              ┌─────▼─────┐                                ┌─────▼─────┐
              │  Browser  │                                │ Android   │
              │  (Web)    │                                │  (Expo)   │
              └─────┬─────┘                                └─────┬─────┘
                    │                      │                      │
                    └──────────────────────┼──────────────────────┘
                                           │ HTTP
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │            Nginx Reverse Proxy (:80)         │
                    │  Routes:  /  →  UI,  /solve  →  Solver      │
                    └──────────┬───────────────────┬───────────────┘
                               │                   │
                    ┌──────────▼────────┐  ┌───────▼──────────────┐
                    │  UI Container     │  │  Solver Container     │
                    │  Expo / React     │  │  Flask + Gunicorn     │
                    │  Native Web       │  │  NSGA-II + GNN        │
                    └───────────────────┘  └───────────────────────┘

                    ▲──────── Docker Network ("seating") ─────────▲
```

We will store the data of users in the following scheme in Firebase:
```
    User (Firebase Auth)
      │
      └── 1:N ── Event
                    ├── id, name, date
                    ├── SeatingConfig (maxTableSize)
                    ├── 1:N ── GuestGroup (id, name, parentId, edgeWeight)
                    │            └── 1:N ── Guest (id, name, phone?, email?)
                    └── 1:N ── SeatingArrangement
                                 └── 1:N ── TableAssignment (tableId, guests[])
```

The solver will generate initial population of seating arrangements via greedy algotithms and then use evolutionary process to find and improve optimal solution

TODO: add a basic diagram of the evolutionary process


We will train a GNN from the optimal seating arrangements created by the evolutionary algorithm. The GNN will be used to generate part of the initial population above:
 TODO: add a basic diagram of the training process.

---

## 8. Implementation

### 8.1 Technologies Used

UI Backend and Frontend: *Expo (React Native Web), TypeScript*
Optimization: *pymoo (NSGA-II), PyTorch + PyTorch Geometric (GNN)*
Database: *Firebase Firestore + localStorage*
Authentication: *Firebase Auth (Google Sign-In)*
Deployment: *Docker, Nginx*
