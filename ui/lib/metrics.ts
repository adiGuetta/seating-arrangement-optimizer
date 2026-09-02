import { TableAssignment, GuestGroup } from './types';

export interface TableMetrics {
  tableId: number;
  count: number;
  cohesion: number;          // sum of 1/tree_dist for all guest pairs at this table
  loneliness: number;        // max min-distance (worst lonely guest at this table)
  loneliestGuest: string;    // name of the loneliest guest
  loneliestGuestGroup: string; // group name of the loneliest guest
}

/** Compute weighted tree distance between two groups using LCA path. */
function treeDist(
  groupA: string,
  groupB: string,
  groupMap: Map<string, GuestGroup>,
): number {
  if (groupA === groupB) return 0;
  // Build ancestor chains with cumulative weighted depth
  const ancestors = (id: string): Map<string, number> => {
    const chain = new Map<string, number>();
    let depth = 0;
    let cur: string | null = id;
    while (cur) {
      chain.set(cur, depth);
      const g = groupMap.get(cur);
      if (!g) break;
      if (!g.parentId) {
        // Root node — add virtual root so multiple roots share an LCA
        chain.set('_root', depth + g.edgeWeight);
        break;
      }
      depth += g.edgeWeight;
      cur = g.parentId;
    }
    return chain;
  };
  const aChain = ancestors(groupA);
  const bChain = ancestors(groupB);
  // Find LCA — first common ancestor
  let lcaDist = Infinity;
  for (const [id, depthA] of aChain) {
    const depthB = bChain.get(id);
    if (depthB !== undefined) {
      lcaDist = depthA + depthB;
      break;
    }
  }
  return lcaDist === Infinity ? 100 : lcaDist;
}

/** Precompute pairwise tree distances for a set of group IDs. */
function buildDistMatrix(
  groupIds: string[],
  groupMap: Map<string, GuestGroup>,
): number[][] {
  const n = groupIds.length;
  const dm: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = treeDist(groupIds[i], groupIds[j], groupMap);
      dm[i][j] = d;
      dm[j][i] = d;
    }
  }
  return dm;
}

/** Compute per-table metrics using solver-consistent definitions.
 *
 * Cohesion: sum of 1/tree_distance for all pairs at the table. Higher = better.
 * Loneliness: for each guest, min tree distance to any other guest at the same table.
 *             The table's loneliness is the max of these (the worst-off guest). Lower = better.
 */
export function computeTableMetrics(tables: TableAssignment[], groups: GuestGroup[]): TableMetrics[] {
  const groupMap = new Map(groups.map(g => [g.id, g]));

  return tables.map(t => {
    if (t.guests.length <= 1) {
      return {
        tableId: t.tableId, count: t.guests.length,
        cohesion: 0, loneliness: 999,
        loneliestGuest: t.guests[0]?.guestName ?? '',
        loneliestGuestGroup: t.guests[0]?.groupName ?? '',
      };
    }

    const guestGroupIds = t.guests.map(g => g.groupId);
    const uniqueGroups = [...new Set(guestGroupIds)];

    // Special case: all guests from the same group — perfect cohesion
    if (uniqueGroups.length === 1) {
      return {
        tableId: t.tableId, count: t.guests.length,
        cohesion: -1, // sentinel: perfect cohesion
        loneliness: 0,
        loneliestGuest: '',
        loneliestGuestGroup: '',
      };
    }

    const groupIdx = new Map(uniqueGroups.map((id, i) => [id, i]));
    const dm = buildDistMatrix(uniqueGroups, groupMap);

    // Cohesion: sum of 1/dist for all guest pairs (matching solver: dist 0 contributes 0)
    let cohesion = 0;
    for (let i = 0; i < t.guests.length; i++) {
      for (let j = i + 1; j < t.guests.length; j++) {
        const d = dm[groupIdx.get(guestGroupIds[i])!][groupIdx.get(guestGroupIds[j])!];
        if (d > 0) cohesion += 1 / d;
      }
    }

    // Loneliness: per leaf (group), min tree distance to any other leaf at same table.
    // sum(min_dist^p) matching solver. Distance between different groups is always >= 1.
    const p = 2;
    let loneliness = 0;
    let worstMinDist = 0;
    let loneliestGroupIdx = 0;
    for (let i = 0; i < uniqueGroups.length; i++) {
      let minDist = Infinity;
      for (let j = 0; j < uniqueGroups.length; j++) {
        if (i === j) continue;
        const d = dm[i][j];
        if (d < minDist) minDist = d;
      }
      // If alone at table (only group), use max distance to any other group in the tree
      if (minDist === Infinity) minDist = 0;
      loneliness += minDist ** p;
      if (minDist > worstMinDist) {
        worstMinDist = minDist;
        loneliestGroupIdx = i;
      }
    }

    // Find a guest from the loneliest group for display
    const loneliestGid = uniqueGroups[loneliestGroupIdx];
    const loneliestGuest = t.guests.find(g => g.groupId === loneliestGid);

    return {
      tableId: t.tableId,
      count: t.guests.length,
      cohesion: Math.round(cohesion * 100) / 100,
      loneliness: Math.round(loneliness * 100) / 100,
      loneliestGuest: loneliestGuest?.guestName ?? '',
      loneliestGuestGroup: loneliestGuest?.groupName ?? '',
    };
  });
}

/** Find the table with the globally worst loneliness (highest min-distance). */
export function findLoneliestGlobal(metrics: TableMetrics[]): TableMetrics | null {
  let worst: TableMetrics | null = null;
  for (const m of metrics) {
    if (!worst || m.loneliness > worst.loneliness) worst = m;
  }
  return worst;
}

/** Color for cohesion: green (high) → yellow → red (low). -1 = perfect (single group). */
export function cohesionColor(c: number): string {
  if (c === -1) return '#4CAF50';
  if (c >= 10) return '#4CAF50';
  if (c >= 4) return '#FF9800';
  return '#F44336';
}

/** Format cohesion for display. */
export function cohesionLabel(c: number): string {
  if (c === -1) return '★ Same group';
  return c.toFixed(1);
}

/** Color for loneliness: red (high sum = lonely table) → green (low sum = comfortable). */
export function lonelinessColor(l: number): string {
  if (l === 0) return '#4CAF50';
  if (l <= 8) return '#FF9800';
  return '#F44336';
}
