#!/usr/bin/env python3
"""Generate a large realistic demo event for debug mode."""
import json, random, time
import numpy as np
from synthetic import generate_synthetic_tree

# 152 groups, group sizes 1-15 weighted toward ≤7
def generate_weighted_tree(n_groups, rng):
    """Like generate_synthetic_tree but with weighted group sizes (mostly ≤7, rarely up to 15)."""
    groups = [{'id': 1, 'size': 0, 'parent_id': 0}]
    for i in range(2, n_groups + 1):
        parent = rng.integers(1, i)
        groups.append({'id': i, 'size': 0, 'parent_id': int(parent)})
    parent_ids = {g['parent_id'] for g in groups if g['parent_id'] != 0}
    for g in groups:
        if g['id'] not in parent_ids:
            # Weighted: 70% chance size 1-7, 25% chance 8-11, 5% chance 12-15
            r = rng.random()
            if r < 0.70:
                g['size'] = int(rng.integers(1, 8))
            elif r < 0.95:
                g['size'] = int(rng.integers(8, 12))
            else:
                g['size'] = int(rng.integers(12, 16))
    return groups

groups_raw = generate_weighted_tree(152, np.random.default_rng(42))
rng = random.Random(42)

FIRST_NAMES = [
    'Emma','Liam','Olivia','Noah','Ava','Ethan','Sophia','Mason','Isabella','William',
    'Mia','James','Charlotte','Benjamin','Amelia','Lucas','Harper','Henry','Evelyn','Alexander',
    'Abigail','Daniel','Emily','Michael','Elizabeth','Sebastian','Sofia','Jack','Avery','Aiden',
    'Ella','Owen','Scarlett','Samuel','Grace','Ryan','Chloe','Nathan','Victoria','Leo',
    'Isaac','Aria','Gabriel','Lily','Julian','Aurora','Mateo','Zoey','Anthony','Penelope',
    'Joshua','Camila','Christopher','Hannah','Andrew','Hazel','Theodore','Ellie','Caleb','Mila',
    'Dylan','Luna','Thomas','Stella','David','Violet','Luke','Savannah','Jonathan','Audrey',
    'Levi','Brooklyn','Carter','Bella','John','Claire','Wyatt','Skylar','Matthew','Lucy',
    'Jayden','Anna','Asher','Aaliyah','Grayson','Madelyn','Eli','Naomi','Landon','Alice',
    'Noa','Yael','Amit','Shira','Rotem','Gili','Ido','Tal','Eyal','Nir','Oren','Yoni',
    'Maya','Tamar','Liora','Dina','Gal','Tali','Shai','Alon','Noam','Itai','Rina','Hila',
    'Adam','Zoe','Riley','Layla','Nora','Ivy','Ruby','Willow','Emery','Jade','Iris',
]
LAST_NAMES = [
    'Cohen','Levy','Goldberg','Shapiro','Friedman','Katz','Rosen','Berman','Weiss','Klein',
    'Smith','Johnson','Williams','Brown','Davis','Wilson','Moore','Taylor','Anderson','Thomas',
    'Garcia','Martinez','Rodriguez','Lopez','Hernandez','Gonzalez','Kim','Park','Lee','Nguyen',
]
GROUP_NAMES = [
    "Family","Friends","Colleagues","Neighbors","Community","Club","Team","Circle","Group","Crew",
]
CITIES = [
    "Tel Aviv","Jerusalem","Haifa","NYC","LA","Chicago","London","Paris","Berlin","Sydney",
    "Boston","SF","Seattle","Miami","Denver","Portland","Austin","Toronto","Melbourne","Amsterdam",
]

used_names = set()
def make_guest_name():
    for _ in range(200):
        name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        if name not in used_names:
            used_names.add(name)
            return name
    used_names.add(f"Guest {len(used_names)}")
    return f"Guest {len(used_names)}"

used_group_names = set()
def make_group_name(gid, depth):
    if depth == 0: return "Event"
    if depth == 1:
        sides = ["Host's Side", "Partner's Side", "Mutual Friends", "Parents' Friends", "Work Colleagues", "Extended Family", "Community"]
        name = sides[gid % len(sides)]
        if name in used_group_names:
            name = f"{name} {gid % 100}"
        used_group_names.add(name)
        return name
    for _ in range(100):
        name = f"{rng.choice(GROUP_NAMES)} {rng.choice(CITIES)}"
        if name not in used_group_names:
            used_group_names.add(name)
            return name
    name = f"Group {len(used_group_names)}"
    used_group_names.add(name)
    return name

children_map = {}
for g in groups_raw:
    children_map.setdefault(g['parent_id'], []).append(g['id'])
id_to_raw = {g['id']: g for g in groups_raw}

t = int(time.time() * 1000)
ui_groups = []
order = [0]

def convert(gid, parent_ui_id, depth):
    raw = id_to_raw[gid]
    order[0] += 1
    ui_id = str(t + order[0])
    guests = []
    if raw['size'] > 0:
        for _ in range(raw['size']):
            guests.append({
                'id': str(t + order[0] * 1000 + len(guests)),
                'name': make_guest_name(),
                'expectedToArrive': rng.random() < 0.85,
                'arrivedConfirmed': False,
            })
    ui_groups.append({
        'id': ui_id, 'name': make_group_name(gid, depth),
        'parentId': parent_ui_id, 'guests': guests,
        'edgeWeight': 1, 'createdAt': t + order[0],
    })
    for child_id in children_map.get(gid, []):
        convert(child_id, ui_id, depth + 1)

root_id = next(g['id'] for g in groups_raw if g['parent_id'] == 0)
convert(root_id, None, 0)

total = sum(len(g['guests']) for g in ui_groups)
expected = sum(1 for g in ui_groups for gu in g['guests'] if gu['expectedToArrive'])

event = {
    'id': str(t),
    'name': f'Large Demo Event ({total} guests)',
    'date': '2026-08-22',
    'groups': ui_groups,
    'seatingConfig': {'maxTableSize': 10, 'alpha': 2.0, 'p': 2.0},
    'arrangements': [],
    'createdAt': t,
}
print(json.dumps(event))
import sys
print(f"# {len(ui_groups)} groups, {total} guests ({expected} expected)", file=sys.stderr)
