#!/usr/bin/env python3.10
"""Flask API for the seating arrangement solver.

Supports async solve with job queue and FCM push notifications.
Designed to run under gunicorn with multiple workers sharing a thread budget.
"""
import os
import uuid
import threading
import multiprocessing
from flask import Flask, request, jsonify
from flask_cors import CORS
from solve import solve
from fitness import set_max_workers

app = Flask(__name__)
CORS(app)

# --- Thread budget manager ---
_total_cpus = os.cpu_count() or 4
_solver_threads = max(2, _total_cpus - 2)  # reserve 2 for nginx/UI/OS
_active_solves = multiprocessing.Value('i', 0)
_active_lock = multiprocessing.Lock()

def _acquire_threads():
    """Acquire a solve slot and return the number of threads to use."""
    with _active_lock:
        _active_solves.value += 1
        active = _active_solves.value
    n = max(1, _solver_threads // max(active, 1))
    set_max_workers(n)
    return n

def _release_threads():
    """Release a solve slot."""
    with _active_lock:
        _active_solves.value = max(0, _active_solves.value - 1)
        active = _active_solves.value
    # Remaining active solves can now use more threads
    if active > 0:
        set_max_workers(max(1, _solver_threads // active))

# --- Job store (shared filesystem for cross-worker access) ---
import json as _json
import tempfile

_JOBS_DIR = os.path.join(tempfile.gettempdir(), 'seating_jobs')
os.makedirs(_JOBS_DIR, exist_ok=True)

def _set_job(job_id, data):
    with open(os.path.join(_JOBS_DIR, job_id), 'w') as f:
        _json.dump(data, f)

def _get_job(job_id):
    path = os.path.join(_JOBS_DIR, job_id)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return _json.load(f)

def _del_job(job_id):
    path = os.path.join(_JOBS_DIR, job_id)
    try: os.remove(path)
    except: pass


def _prepare_solver_groups(ui_groups, table_capacity):
    """Convert UI groups to solver format, handling edge cases."""
    parent_ids = {g['parentId'] for g in ui_groups if g.get('parentId')}
    roots = [g for g in ui_groups if not g.get('parentId')]
    solver_groups = []
    needs_synthetic_root = len(roots) != 1
    if needs_synthetic_root:
        solver_groups.append({'id': '_root', 'size': 0, 'parent_id': 0, 'edge_weight': 1.0})
    for g in ui_groups:
        gid = g['id']
        has_children = gid in parent_ids
        guest_count = g.get('guestCount', 0)
        raw_parent = g.get('parentId')
        ew = g.get('edgeWeight', 1.0)
        parent_id = ('_root' if needs_synthetic_root else 0) if not raw_parent else raw_parent
        if has_children and guest_count > 0:
            solver_groups.append({'id': gid, 'size': 0, 'parent_id': parent_id, 'edge_weight': ew})
            _add_leaf(solver_groups, f'_direct_{gid}', guest_count, gid, 0.0, table_capacity)
        elif guest_count > table_capacity and not has_children:
            solver_groups.append({'id': gid, 'size': 0, 'parent_id': parent_id, 'edge_weight': ew})
            _add_leaf(solver_groups, f'_chunk_{gid}', guest_count, gid, 0.0, table_capacity)
        else:
            solver_groups.append({'id': gid, 'size': guest_count, 'parent_id': parent_id, 'edge_weight': ew})
    return solver_groups


def _add_leaf(solver_groups, base_id, guest_count, parent_id, edge_weight, table_capacity):
    if guest_count <= table_capacity:
        solver_groups.append({'id': base_id, 'size': guest_count, 'parent_id': parent_id, 'edge_weight': edge_weight})
    else:
        remaining = guest_count
        i = 0
        while remaining > 0:
            chunk = min(remaining, table_capacity)
            solver_groups.append({'id': f'{base_id}_{i}', 'size': chunk, 'parent_id': parent_id, 'edge_weight': edge_weight})
            remaining -= chunk
            i += 1


def _clean_assignment(assignment, solver_groups):
    import re
    size_map = {g['id']: g['size'] for g in solver_groups}
    result = []
    for leaf_id, table_id in assignment.items():
        if not isinstance(leaf_id, str):
            result.append({'groupId': str(leaf_id), 'tableId': int(table_id), 'size': size_map.get(leaf_id, 0)})
            continue
        real_id = leaf_id
        for prefix in ('_direct_', '_chunk_'):
            if real_id.startswith(prefix):
                real_id = real_id[len(prefix):]
                break
        real_id = re.sub(r'_\d+$', '', real_id)
        result.append({'groupId': real_id, 'tableId': int(table_id), 'size': size_map.get(leaf_id, 0)})
    return result


def _send_fcm(fcm_token, job_id, success):
    """Send FCM push notification. Best-effort, non-blocking."""
    try:
        import firebase_admin
        from firebase_admin import messaging
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        message = messaging.Message(
            token=fcm_token,
            data={'jobId': job_id, 'status': 'done' if success else 'error'},
            notification=messaging.Notification(
                title='Seating arrangement ready' if success else 'Solver error',
                body='Your optimized seating is ready to view.' if success else 'The solver encountered an error.',
            ),
        )
        messaging.send(message)
    except Exception as e:
        print(f"FCM send failed: {e}", flush=True)


def _run_solve(job_id, ui_groups, table_capacity, alpha, p, fcm_token):
    """Run solver in background thread."""
    threads = _acquire_threads()
    try:
        solver_groups = _prepare_solver_groups(ui_groups, table_capacity)
        solutions = solve(solver_groups, table_capacity=table_capacity,
                          alpha=alpha, p=p, verbose=True)
        for s in solutions:
            s['chunks'] = _clean_assignment(s['assignment'], solver_groups)
            del s['assignment']
        _set_job(job_id, {'status': 'done', 'result': {'solutions': solutions}})
        if fcm_token:
            _send_fcm(fcm_token, job_id, True)
    except Exception as e:
        _set_job(job_id, {'status': 'error', 'error': str(e)})
        if fcm_token:
            _send_fcm(fcm_token, job_id, False)
    finally:
        _release_threads()


# --- Async endpoints ---

@app.route('/solve', methods=['POST'])
def solve_endpoint():
    """Start an async solve job. Returns a job ID immediately."""
    data = request.json
    job_id = str(uuid.uuid4())
    _set_job(job_id, {'status': 'pending'})
    t = threading.Thread(target=_run_solve, args=(
        job_id,
        data.get('groups', []),
        data.get('tableCapacity', 10),
        data.get('alpha', 2.0),
        data.get('p', 2.0),
        data.get('fcmToken'),
    ), daemon=True)
    t.start()
    return jsonify({'jobId': job_id})


@app.route('/solve/<job_id>', methods=['GET'])
def solve_status(job_id):
    """Poll for job status. Returns result when done."""
    job = _get_job(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    if job['status'] == 'pending':
        return jsonify({'status': 'pending'})
    if job['status'] == 'error':
        return jsonify({'status': 'error', 'error': job['error'], 'solutions': []}), 500
    # Done — return result and clean up
    _del_job(job_id)
    return jsonify({'status': 'done', **job['result']})


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'cpus': _total_cpus, 'solver_threads': _solver_threads})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=False)
