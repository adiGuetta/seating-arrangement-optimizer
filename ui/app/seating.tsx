import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform, ActivityIndicator, Switch } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/Button';
import { TableCircleNative as TableCircle } from '@/components/TableCircleNative';
import { alertConfirm, alertOk } from '@/lib/alert';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { TableAssignment, SeatingArrangement } from '@/lib/types';
import { computeTableMetrics, findLoneliestGlobal, cohesionColor, cohesionLabel, lonelinessColor, TableMetrics } from '@/lib/metrics';

// For native apps (Android/iOS), set this to your server's address.
// On web this is ignored — requests go through the nginx reverse proxy.
import { CONFIG } from '@/lib/config';
const SOLVER_BASE_URL = CONFIG.SERVER_URL;

function generateRandomSeating(
  groups: { id: string; name: string; guests: { id: string; name: string; expectedToArrive: boolean }[] }[],
  maxTableSize: number,
): TableAssignment[] {
  const allGuests: { guestId: string; guestName: string; groupId: string; groupName: string }[] = [];
  for (const g of groups) {
    for (const guest of g.guests) {
      if (guest.expectedToArrive)
        allGuests.push({ guestId: guest.id, guestName: guest.name, groupId: g.id, groupName: g.name });
    }
  }
  for (let i = allGuests.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allGuests[i], allGuests[j]] = [allGuests[j], allGuests[i]];
  }
  const tables: TableAssignment[] = [];
  for (let i = 0; i < allGuests.length; i += maxTableSize)
    tables.push({ tableId: tables.length + 1, guests: allGuests.slice(i, i + maxTableSize) });
  return tables;
}

function Stepper({ label, hint, value, min, max, step, onChange }: {
  label: string; hint: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  const canDec = value - step >= min;
  const canInc = value + step <= max;
  const display = step >= 1 ? String(value) : value.toFixed(1);
  return (
    <View style={stepStyles.wrap}>
      <View style={stepStyles.header}>
        <Text style={stepStyles.label}>{label}</Text>
        <Text style={stepStyles.value}>{display}</Text>
      </View>
      <Text style={stepStyles.hint}>{hint}</Text>
      <View style={stepStyles.controls}>
        <TouchableOpacity style={[stepStyles.btn, !canDec && stepStyles.btnDisabled]}
          onPress={() => canDec && onChange(Math.round((value - step) * 10) / 10)} disabled={!canDec}>
          <Ionicons name="remove" size={20} color={canDec ? Colors.primary : Colors.disabled} />
        </TouchableOpacity>
        <View style={stepStyles.track}>
          <View style={[stepStyles.fill, { width: `${((value - min) / (max - min)) * 100}%` }]} />
        </View>
        <TouchableOpacity style={[stepStyles.btn, !canInc && stepStyles.btnDisabled]}
          onPress={() => canInc && onChange(Math.round((value + step) * 10) / 10)} disabled={!canInc}>
          <Ionicons name="add" size={20} color={canInc ? Colors.primary : Colors.disabled} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: Colors.text },
  value: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.sm, lineHeight: 17 },
  controls: { flexDirection: 'row', alignItems: 'center' },
  btn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  btnDisabled: { borderColor: Colors.disabled },
  track: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, marginHorizontal: Spacing.sm },
  fill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
});

type SortKey = 'default' | 'coherency' | 'loneliness' | 'count';
const MOBILE_TREE_PREVIEW_DEPTH = 3;
const SUBTREE_PREVIEW_DEPTH = 3;

interface Candidate {
  tables: TableAssignment[];
  tableCount: number;
  penalty: number;
  saved: boolean;
}


import { ColoredTree } from '@/components/ColoredTree';
import { VisualTree } from '@/components/VisualTree';

function ArrangementView({ arr, groups, isHe, t, onBack, movingGuest, setMovingGuest, handleMoveGuest, updateArrangement, search, setSearch, groupPath, undoStack, onUndo, redoStack, onRedo, overCapacityTables, maxTableSize }: {
  arr: SeatingArrangement; groups: any[]; isHe: boolean; t: any; onBack: () => void;
  movingGuest: { guestId: string; fromTableId: number } | null;
  setMovingGuest: (v: { guestId: string; fromTableId: number } | null) => void;
  handleMoveGuest: (guestId: string, from: number, to: number) => void;
  updateArrangement: (id: string, u: Partial<SeatingArrangement>) => void;
  search: string; setSearch: (s: string) => void;
  groupPath: Map<string, string>;
  undoStack: TableAssignment[][];
  onUndo: () => void;
  redoStack: TableAssignment[][];
  onRedo: () => void;
  overCapacityTables: number[];
  maxTableSize: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showTreeMap, setShowTreeMap] = useState(false);
  const [treeMapRootId, setTreeMapRootId] = useState<string | null>(null);
  const treeMapDepth = Platform.OS === 'web' ? undefined : MOBILE_TREE_PREVIEW_DEPTH;
  const metrics = useMemo(() => computeTableMetrics(arr.tables, groups), [arr.tables, groups]);
  const metricsMap = useMemo(() => new Map(metrics.map(m => [m.tableId, m])), [metrics]);
  const loneliest = useMemo(() => findLoneliestGlobal(metrics), [metrics]);
  const groupMap = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);
  const visibleTreeRoots = useMemo(
    () => treeMapRootId ? [treeMapRootId] : groups.filter(g => g.parentId === null).map(g => g.id),
    [treeMapRootId, groups]
  );
  const focusedTreeRoot = treeMapRootId ? groupMap.get(treeMapRootId) : null;

  // Assign a consistent color to each group
  const GROUP_COLORS = ['#4CAF50','#2196F3','#FF9800','#9C27B0','#F44336','#00BCD4','#FF5722','#3F51B5','#8BC34A','#E91E63','#009688','#FFC107','#673AB7','#CDDC39','#795548','#607D8B','#FF6F00','#1565C0','#2E7D32','#AD1457'];
  const groupColorMap = useMemo(() => {
    const ids = [...new Set(arr.tables.flatMap(tb => tb.guests.map(g => g.groupId)))];
    return new Map(ids.map((id, i) => [id, GROUP_COLORS[i % GROUP_COLORS.length]]));
  }, [arr.tables]);

  const sortedTables = useMemo(() => {
    const sorted = [...arr.tables];
    if (sortKey === 'coherency') sorted.sort((a, b) => {
      const ca = metricsMap.get(a.tableId)?.cohesion ?? 0;
      const cb = metricsMap.get(b.tableId)?.cohesion ?? 0;
      return (cb === -1 ? Infinity : cb) - (ca === -1 ? Infinity : ca);
    });
    else if (sortKey === 'loneliness') sorted.sort((a, b) => (metricsMap.get(a.tableId)?.loneliness ?? 0) - (metricsMap.get(b.tableId)?.loneliness ?? 0));
    else if (sortKey === 'count') sorted.sort((a, b) => b.guests.length - a.guests.length);
    return sorted;
  }, [arr.tables, sortKey, metricsMap]);

  const searchQ = search.trim().toLowerCase();
  const searchResults = searchQ
    ? arr.tables.flatMap(tb => tb.guests.filter(g => g.guestName.toLowerCase().includes(searchQ)).map(g => ({ ...g, tableId: tb.tableId })))
    : null;

  const sortKeys: SortKey[] = ['default', 'coherency', 'loneliness', 'count'];
  const sortLabels: Record<SortKey, string> = { default: '#', coherency: isHe ? 'קוהרנטיות' : 'Coherency', loneliness: isHe ? 'בדידות' : 'Loneliness', count: isHe ? 'כמות' : 'Count' };

  return (
    <View>
      <View style={styles.activeHeader}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        {renamingId === arr.id ? (
          <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
            <TextInput style={styles.renameInput} value={renameValue} onChangeText={setRenameValue} autoFocus />
            <TouchableOpacity onPress={() => { updateArrangement(arr.id, { name: renameValue.trim() || arr.name }); setRenamingId(null); }}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={{ flex: 1 }} onPress={() => { setRenamingId(arr.id); setRenameValue(arr.name); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.activeTitle}>{arr.name}</Text>
              <Ionicons name="create-outline" size={16} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}
        <Text style={styles.activeMeta}>{arr.tables.length} {t('tables')}</Text>
        {undoStack.length > 0 && (
          <TouchableOpacity onPress={onUndo} style={{ marginLeft: 8 }}>
            <Ionicons name="arrow-undo" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {redoStack.length > 0 && (
          <TouchableOpacity onPress={onRedo} style={{ marginLeft: 4 }}>
            <Ionicons name="arrow-redo" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => {
          const lines: string[] = [`${arr.name}\n${arr.tables.length} tables, ${arr.tables.reduce((s, tb) => s + tb.guests.length, 0)} guests\n`];
          for (const tb of arr.tables) {
            lines.push(`Table #${tb.tableId} (${tb.guests.length} guests)`);
            for (const g of tb.guests) lines.push(`  ${g.guestName} — ${groupPath.get(g.groupId) || g.groupName}`);
            lines.push('');
          }
          const text = lines.join('\n');
          if (Platform.OS === 'web') {
            const blob = new Blob([text], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${arr.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
            a.click();
          }
        }} style={{ marginLeft: 8 }}>
          <Ionicons name="download-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Over-capacity warning */}
      {overCapacityTables.length > 0 && (
        <View style={{ backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FF9800', borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: '#E65100', fontWeight: '700' }}>
            ⚠ {overCapacityTables.length === 1 ? 'Table' : 'Tables'} {overCapacityTables.join(', ')} exceed{overCapacityTables.length === 1 ? 's' : ''} max size ({maxTableSize}). Move guests to fix.
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.disabled} style={{ marginRight: Spacing.sm }} />
        <TextInput style={styles.searchInput} placeholder={isHe ? 'חפש אורח בסידור...' : 'Find guest...'}
          placeholderTextColor={Colors.disabled} value={search} onChangeText={setSearch} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.disabled} /></TouchableOpacity>}
      </View>

      {searchResults && (
        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
          <View style={styles.searchResults}>
          {searchResults.length === 0 ? <Text style={styles.noResults}>{t('noGuestsFound')}</Text> :
            searchResults.map(g => (
              <View key={g.guestId} style={styles.searchRow}>
                <Text style={styles.searchName}>{g.guestName}</Text>
                <Text style={styles.searchTable}>{t('table')} #{g.tableId}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Sort bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortBarScroll} contentContainerStyle={styles.sortBar}>
        <Text style={styles.sortLabel}>{t('sortBy')}:</Text>
        {sortKeys.map(k => (
          <TouchableOpacity key={k} style={[styles.sortChip, sortKey === k && styles.sortChipActive]} onPress={() => setSortKey(k)}>
            <Text style={[styles.sortChipText, sortKey === k && styles.sortChipTextActive]}>{sortLabels[k]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {movingGuest && (
        <View style={styles.moveBanner}>
          <Text style={styles.moveText}>
            {isHe ? 'בחר שולחן יעד עבור' : 'Select destination table for'}{' '}
            {arr.tables.find(t => t.tableId === movingGuest.fromTableId)?.guests.find(g => g.guestId === movingGuest.guestId)?.guestName}
          </Text>
          <TouchableOpacity onPress={() => setMovingGuest(null)}>
            <Text style={styles.moveCancel}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* View toggle */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.md }}>
        <TouchableOpacity style={[styles.sortChip, !showTreeMap && styles.sortChipActive]} onPress={() => setShowTreeMap(false)}>
          <Text style={[styles.sortChipText, !showTreeMap && styles.sortChipTextActive]}>Tables</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sortChip, showTreeMap && styles.sortChipActive]} onPress={() => setShowTreeMap(true)}>
          <Text style={[styles.sortChipText, showTreeMap && styles.sortChipTextActive]}>Tree Map</Text>
        </TouchableOpacity>
      </View>

      {showTreeMap ? (
        <ScrollView horizontal>
          <ScrollView>
            {focusedTreeRoot && (
              <View style={styles.treeMapNavRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.treeMapNavLabel}>Current tree</Text>
                  <Text style={styles.treeMapNavTitle}>{focusedTreeRoot.name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.treeMapNavButton}
                  onPress={() => setTreeMapRootId(focusedTreeRoot.parentId ?? null)}
                >
                  <Ionicons name="arrow-up" size={16} color={Colors.primary} />
                  <Text style={styles.treeMapNavButtonText}>{focusedTreeRoot.parentId ? 'Up' : 'All roots'}</Text>
                </TouchableOpacity>
              </View>
            )}
            {visibleTreeRoots.map(rootId => (
              <ColoredTree
                key={rootId}
                groups={groups}
                rootId={rootId}
                tables={arr.tables}
                maxDepth={treeMapDepth}
                onNodePress={treeMapDepth === undefined ? undefined : setTreeMapRootId}
              />
            ))}
          </ScrollView>
        </ScrollView>
      ) : (
      <>
      {/* Table circles */}
      <View style={styles.tablesGrid}>
        {sortedTables.map(table => {
          const isSource = movingGuest?.fromTableId === table.tableId;
          const isTarget = !!movingGuest && !isSource;
          const m = metricsMap.get(table.tableId);
          return (
            <TableCircle key={table.tableId} table={table}
              movingGuestId={movingGuest?.guestId} isDropTarget={isTarget}
              onGuestPress={(guestId) => { if (movingGuest) { if (movingGuest.guestId === guestId) setMovingGuest(null); } else { setMovingGuest({ guestId, fromTableId: table.tableId }); } }}
              onGuestLongPress={(guestId) => setMovingGuest({ guestId, fromTableId: table.tableId })}
              onTableDrop={() => { if (movingGuest) handleMoveGuest(movingGuest.guestId, movingGuest.fromTableId, table.tableId); }}
              metrics={m} highlightLoneliest={loneliest?.tableId === table.tableId}
              groupColorMap={groupColorMap}
            />
          );
        })}
      </View>

      {/* Table list */}
      {sortedTables.map(table => {
        const isSource = movingGuest?.fromTableId === table.tableId;
        const isTarget = !!movingGuest && !isSource;
        const m = metricsMap.get(table.tableId);
        return (
          <View key={`list-${table.tableId}`} style={[styles.tableList, isTarget && styles.tableListTarget, overCapacityTables.includes(table.tableId) && { borderColor: '#F44336', borderWidth: 2 }]}>
            <TouchableOpacity style={styles.tableListHeader}
              onPress={() => isTarget && handleMoveGuest(movingGuest!.guestId, movingGuest!.fromTableId, table.tableId)} disabled={!isTarget}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tableListTitle}>{t('table')} #{table.tableId} ({table.guests.length})</Text>
                {m && (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 11, color: cohesionColor(m.cohesion) }}>Cohesion: {cohesionLabel(m.cohesion)}</Text>
                    <Text style={{ fontSize: 11, color: lonelinessColor(m.loneliness) }}>Loneliness: {m.loneliness} ({m.loneliestGuestGroup})</Text>
                  </View>
                )}
              </View>
              {loneliest?.tableId === table.tableId && (
                <Text style={{ fontSize: 11, color: '#F44336', fontWeight: '700' }}>⚠ Loneliest table: {loneliest.loneliestGuestGroup} (loneliness {loneliest.loneliness})</Text>
              )}
              {isTarget && (
                <View style={styles.moveHereBadge}>
                  <Ionicons name="add-circle" size={16} color="#FFF" />
                  <Text style={styles.moveHereText}>{isHe ? 'העבר לכאן' : 'Drop here'}</Text>
                </View>
              )}
            </TouchableOpacity>
            {table.guests.map(g => {
              const isMoving = movingGuest?.guestId === g.guestId && isSource;
              return (
                <TouchableOpacity key={g.guestId} style={[styles.tableGuest, isMoving && styles.guestMoving]}
                  onPress={() => { if (movingGuest) { if (isMoving) setMovingGuest(null); } else { setMovingGuest({ guestId: g.guestId, fromTableId: table.tableId }); } }}
                  onLongPress={() => setMovingGuest({ guestId: g.guestId, fromTableId: table.tableId })}
                  activeOpacity={0.6}>
                  <Ionicons name="reorder-three" size={18} color={isMoving ? Colors.primary : Colors.disabled} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tableGuestName, isMoving && { color: Colors.primary }]}>{g.guestName}</Text>
                    <Text style={styles.tableGuestGroup} numberOfLines={1}>{groupPath.get(g.groupId) || g.groupName}</Text>
                  </View>
                  {isMoving && <Text style={styles.guestMovingLabel}>{isHe ? 'נבחר' : 'Selected'}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
      </>
      )}
    </View>
  );
}


export default function SeatingScreen() {
  const { currentEvent, groups, updateSeatingConfig, addArrangement, updateArrangement, deleteArrangement, getSubtreeGroups, getChildren } = useStore();
  const { t } = useI18n();
  const router = useRouter();
  const isHe = t('lang') === 'he';

  if (!currentEvent) return <Text style={{ padding: Spacing.lg }}>No event selected</Text>;

  // Build groupId → full ancestor path string (e.g. "Event → Bride's Side → Mom's Side")
  const groupMap = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);
  const groupPath = useMemo(() => {
    const cache = new Map<string, string>();
    const build = (id: string): string => {
      if (cache.has(id)) return cache.get(id)!;
      const g = groupMap.get(id);
      if (!g) return '';
      const parentPath = g.parentId ? build(g.parentId) : '';
      const path = parentPath ? `${parentPath} › ${g.name}` : g.name;
      cache.set(id, path);
      return path;
    };
    const result = new Map<string, string>();
    for (const g of groups) result.set(g.id, build(g.id));
    return result;
  }, [groups, groupMap]);

  const config = currentEvent.seatingConfig;
  const arrangements = currentEvent.arrangements ?? [];

  const [maxTableSize, setMaxTableSize] = useState(config.maxTableSize);
  const [familyPriority, setFamilyPriority] = useState(config.alpha);
  const [strictness, setStrictness] = useState(config.p);
  const [arrName, setArrName] = useState('');
  const [activeArrId, setActiveArrId] = useState<string | null>(null);
  const activeArr = arrangements.find(a => a.id === activeArrId);
  const [search, setSearch] = useState('');
  const [movingGuest, setMovingGuest] = useState<{ guestId: string; fromTableId: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [undoStack, setUndoStack] = useState<TableAssignment[][]>([]);
  const [redoStack, setRedoStack] = useState<TableAssignment[][]>([]);
  // Feature 1: Multiple candidates
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [viewingCandidate, setViewingCandidate] = useState<number | null>(null);
  const [solving, setSolving] = useState(false);
  const [depthWeighting, setDepthWeighting] = useState(false);

  // Feature 3: Subtree view state
  const [subtreeRootId, setSubtreeRootId] = useState<string | null>(null);
  const [subtreeArrId, setSubtreeArrId] = useState<string | null>(null);
  const [showSubtreeView, setShowSubtreeView] = useState(false);
  const [stTreeMap, setStTreeMap] = useState(false);
  const [subtreeSearch, setSubtreeSearch] = useState('');
  const isWeb = Platform.OS === 'web';
  const subtreePreviewDepth = isWeb ? undefined : SUBTREE_PREVIEW_DEPTH;

  const totalExpected = groups.reduce((s, g) => s + g.guests.filter(gu => gu.expectedToArrive).length, 0);

  // Build a lookup: groupId -> list of expected guests
  const guestsByGroup = useMemo(() => {
    const map = new Map<string, { guestId: string; guestName: string; groupId: string; groupName: string }[]>();
    for (const g of groups) {
      const guests = g.guests
        .filter(gu => gu.expectedToArrive)
        .map(gu => ({ guestId: gu.id, guestName: gu.name, groupId: g.id, groupName: g.name }));
      if (guests.length > 0) map.set(g.id, guests);
    }
    return map;
  }, [groups]);

  const solverGroupsPayload = useMemo(() => {
    // Compute depth of each group
    const depthMap = new Map<string, number>();
    const getDepth = (id: string | null): number => {
      if (!id) return 0;
      if (depthMap.has(id)) return depthMap.get(id)!;
      const g = groups.find(gr => gr.id === id);
      const d = g?.parentId ? getDepth(g.parentId) + 1 : 0;
      depthMap.set(id, d);
      return d;
    };
    groups.forEach(g => getDepth(g.id));
    const maxDepth = Math.max(1, ...depthMap.values());

    return groups.map(g => {
      const depth = depthMap.get(g.id) ?? 0;
      const multiplier = depthWeighting ? (maxDepth + 1 - depth) : 1;
      return {
        id: g.id,
        parentId: g.parentId,
        guestCount: g.guests.filter(gu => gu.expectedToArrive).length,
        edgeWeight: g.edgeWeight * multiplier,
      };
    });
  }, [groups, depthWeighting]);

  /** Convert solver chunks [{groupId, tableId, size}] to TableAssignment[] */
  const chunksToTables = useCallback((chunks: { groupId: string; tableId: number; size: number }[]): TableAssignment[] => {
    const tableMap = new Map<number, TableAssignment['guests']>();
    // Track how many guests we've consumed per group
    const consumed = new Map<string, number>();
    for (const chunk of chunks) {
      const allGuests = guestsByGroup.get(chunk.groupId);
      if (!allGuests) continue;
      const offset = consumed.get(chunk.groupId) || 0;
      const slice = allGuests.slice(offset, offset + chunk.size);
      consumed.set(chunk.groupId, offset + chunk.size);
      const existing = tableMap.get(chunk.tableId) || [];
      existing.push(...slice);
      tableMap.set(chunk.tableId, existing);
    }
    // Remap to 1-indexed table IDs for display
    return [...tableMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, guests], i) => ({ tableId: i + 1, guests }));
  }, [guestsByGroup]);

  const handleGenerate = async () => {
    const baseName = arrName.trim() || 'Arrangement';
    updateSeatingConfig({ maxTableSize, alpha: familyPriority, p: strictness });
    if (totalExpected === 0) { alertOk(t('seatingArrangement'), isHe ? 'אין אורחים צפויים לסידור' : 'No expected guests to seat.'); return; }

    setSolving(true);
    try {
      const baseUrl = Platform.OS === 'web' ? '' : SOLVER_BASE_URL;
      // Start async solve
      const startResp = await fetch(`${baseUrl}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: solverGroupsPayload, tableCapacity: maxTableSize, alpha: familyPriority, p: strictness }),
      });
      if (!startResp.ok) throw new Error(`Server error ${startResp.status}`);
      const { jobId } = await startResp.json() as { jobId: string };

      // Poll for result
      let result: { solutions: { tables: number; penalty: number; chunks: { groupId: string; tableId: number; size: number }[] }[] } | null = null;
      for (let i = 0; i < 300; i++) { // up to 10 minutes (2s intervals)
        await new Promise(r => setTimeout(r, 2000));
        const pollResp = await fetch(`${baseUrl}/solve/${jobId}`);
        const data = await pollResp.json();
        if (data.status === 'done') { result = data; break; }
        if (data.status === 'error') throw new Error(data.error || 'Solver error');
      }
      if (!result) throw new Error('Solve timed out');

      const newCandidates: Candidate[] = result.solutions.map(s => ({
        tables: chunksToTables(s.chunks),
        tableCount: s.tables,
        penalty: s.penalty,
        saved: false,
      }));

      if (newCandidates.length === 0) {
        newCandidates.push({ tables: generateRandomSeating(groups, maxTableSize), tableCount: 0, penalty: 0, saved: false });
      }
      setCandidates(newCandidates);
      setArrName(baseName);
    } catch (e) {
      console.warn('Solver failed, falling back to random:', e);
      alertOk(
        isHe ? 'שגיאה' : 'Solver unavailable',
        isHe ? 'נוצר סידור אקראי במקום' : 'Generated random arrangement as fallback',
      );
      const tables = generateRandomSeating(groups, maxTableSize);
      setCandidates([{ tables, tableCount: tables.length,penalty: 0, saved: false }]);
      setArrName(baseName);
    } finally {
      setSolving(false);
    }
  };

  const handleSaveCandidate = (idx: number) => {
    const c = candidates[idx];
    if (c.saved) return;
    const name = `${arrName} (${c.tables.length} ${t('tables')})`;
    addArrangement(name, c.tables, { maxTableSize, alpha: familyPriority, p: strictness });
    setCandidates(prev => prev.map((cc, i) => i === idx ? { ...cc, saved: true } : cc));
  };

  const doDiscard = () => {
    setCandidates([]);
    setViewingCandidate(null);
    setArrName('');
  };

  const handleDiscardCandidates = () => {
    const unsaved = candidates.filter(c => !c.saved).length;
    if (unsaved > 0) {
      alertConfirm(t('discardAll'), isHe ? t('unsavedWarning') : t('unsavedWarning'), doDiscard);
    } else {
      doDiscard();
    }
  };

  const handleBackFromActive = () => {
    setActiveArrId(null); setMovingGuest(null); setSearch(''); setUndoStack([]); setRedoStack([]);
  };

  const handleMoveGuest = (guestId: string, fromTableId: number, toTableId: number) => {
    if (!activeArr || fromTableId === toTableId) return;
    // Save current state for undo, clear redo
    setUndoStack(prev => [...prev, activeArr.tables]);
    setRedoStack([]);
    const newTables = activeArr.tables.map(tb => {
      if (tb.tableId === fromTableId) return { ...tb, guests: tb.guests.filter(g => g.guestId !== guestId) };
      if (tb.tableId === toTableId) {
        const guest = activeArr.tables.find(t => t.tableId === fromTableId)?.guests.find(g => g.guestId === guestId);
        return guest ? { ...tb, guests: [...tb.guests, guest] } : tb;
      }
      return tb;
    }).filter(tb => tb.guests.length > 0);
    updateArrangement(activeArr.id, { tables: newTables });
    setMovingGuest(null);
  };

  const handleUndo = () => {
    if (!activeArr || undoStack.length === 0) return;
    setRedoStack(prev => [...prev, activeArr.tables]);
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    updateArrangement(activeArr.id, { tables: prev });
  };

  const handleRedo = () => {
    if (!activeArr || redoStack.length === 0) return;
    setUndoStack(prev => [...prev, activeArr.tables]);
    const next = redoStack[redoStack.length - 1];
    setRedoStack(s => s.slice(0, -1));
    updateArrangement(activeArr.id, { tables: next });
  };

  // Check for over-capacity tables
  const overCapacityTables = activeArr
    ? activeArr.tables.filter(tb => tb.guests.length > maxTableSize).map(tb => tb.tableId)
    : [];

  // Feature 3: Subtree view data
  const subtreeGroups = subtreeRootId ? getSubtreeGroups(subtreeRootId) : [];
  const subtreeGroupIds = useMemo(() => new Set(subtreeGroups.map(g => g.id)), [subtreeGroups]);
  const subtreeArr = arrangements.find(a => a.id === subtreeArrId);
  const subtreeRootGroup = subtreeRootId ? groupMap.get(subtreeRootId) : null;
  const topLevelGroups = useMemo(
    () => groups.filter(g => g.parentId === null).sort((a, b) => a.createdAt - b.createdAt),
    [groups]
  );
  const subtreeTables = useMemo(() => {
    if (!subtreeArr || subtreeGroupIds.size === 0) return [];
    return subtreeArr.tables.filter(tb => tb.guests.some(g => subtreeGroupIds.has(g.groupId)));
  }, [subtreeArr, subtreeGroupIds]);

  // Build flat group list for subtree picker
  const flatGroups = useMemo(() => {
    const result: { group: typeof groups[0]; depth: number }[] = [];
    const visit = (parentId: string | null, depth: number) => {
      const children = groups.filter(g => g.parentId === parentId).sort((a, b) => a.createdAt - b.createdAt);
      for (const c of children) { result.push({ group: c, depth }); visit(c.id, depth + 1); }
    };
    visit(null, 0);
    return result;
  }, [groups]);

  // Feature 3: Subtree view states (must be at top level for hooks rules)
  const [stSort, setStSort] = useState<SortKey>('default');
  const [stSearch, setStSearch] = useState('');

  const stMetrics = useMemo(() => showSubtreeView && subtreeArr ? computeTableMetrics(subtreeTables, groups) : [], [showSubtreeView, subtreeArr, subtreeTables, groups]);
  const stMetricsMap = useMemo(() => new Map(stMetrics.map(m => [m.tableId, m])), [stMetrics]);
  const stLoneliest = useMemo(() => findLoneliestGlobal(stMetrics), [stMetrics]);
  const sortedST = useMemo(() => {
    const sorted = [...subtreeTables];
    if (stSort === 'coherency') sorted.sort((a, b) => {
      const ca = stMetricsMap.get(a.tableId)?.cohesion ?? 0;
      const cb = stMetricsMap.get(b.tableId)?.cohesion ?? 0;
      return (cb === -1 ? Infinity : cb) - (ca === -1 ? Infinity : ca);
    });
    else if (stSort === 'loneliness') sorted.sort((a, b) => (stMetricsMap.get(a.tableId)?.loneliness ?? 0) - (stMetricsMap.get(b.tableId)?.loneliness ?? 0));
    else if (stSort === 'count') sorted.sort((a, b) => b.guests.length - a.guests.length);
    return sorted;
  }, [subtreeTables, stSort, stMetricsMap]);

  // Candidate viewing
  if (candidates.length > 0 && viewingCandidate !== null) {
    const c = candidates[viewingCandidate];
    const metrics = computeTableMetrics(c.tables, groups);
    const metricsMap = new Map(metrics.map(m => [m.tableId, m]));
    const loneliest = findLoneliestGlobal(metrics);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: t('generationResults') }} />
        <View style={styles.activeHeader}>
          <TouchableOpacity onPress={() => setViewingCandidate(null)}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.activeTitle}>{c.tables.length} {t('tables')}</Text>
          {!c.saved ? (
            <TouchableOpacity style={styles.saveCandidateBtn} onPress={() => handleSaveCandidate(viewingCandidate)}>
              <Ionicons name="save-outline" size={16} color="#FFF" />
              <Text style={styles.saveCandidateText}>{t('saveArrangement')}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: Colors.success, fontWeight: '700', fontSize: 13 }}>✓ {t('saved')}</Text>
          )}
        </View>
        <View style={styles.tablesGrid}>
          {c.tables.map(table => (
            <TableCircle key={table.tableId} table={table}
              metrics={metricsMap.get(table.tableId)}
              highlightLoneliest={loneliest?.tableId === table.tableId} />
          ))}
        </View>
        {c.tables.map(table => {
          const m = metricsMap.get(table.tableId);
          return (
            <View key={`list-${table.tableId}`} style={styles.tableList}>
              <View style={styles.tableListHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tableListTitle}>{t('table')} #{table.tableId} ({table.guests.length})</Text>
                  {m && (
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 11, color: cohesionColor(m.cohesion) }}>Cohesion: {cohesionLabel(m.cohesion)}</Text>
                      <Text style={{ fontSize: 11, color: lonelinessColor(m.loneliness) }}>Loneliness: {m.loneliness} ({m.loneliestGuestGroup})</Text>
                    </View>
                  )}
                </View>
              </View>
              {table.guests.map(g => (
                <View key={g.guestId} style={styles.tableGuest}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tableGuestName}>{g.guestName}</Text>
                    <Text style={styles.tableGuestGroup} numberOfLines={1}>{groupPath.get(g.groupId) || g.groupName}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    );
  }


  // Feature 3: Subtree view
  if (showSubtreeView && subtreeArr && subtreeRootId) {

    const stSearchQ = stSearch.trim().toLowerCase();
    const stSearchResults = stSearchQ
      ? subtreeTables.flatMap(tb => tb.guests.filter(g => g.guestName.toLowerCase().includes(stSearchQ)).map(g => ({ ...g, tableId: tb.tableId })))
      : null;

    const rootGroup = groups.find(g => g.id === subtreeRootId);
    const sortKeys: SortKey[] = ['default', 'coherency', 'loneliness', 'count'];
    const sortLabels: Record<SortKey, string> = { default: '#', coherency: isHe ? 'קוהרנטיות' : 'Coherency', loneliness: isHe ? 'בדידות' : 'Loneliness', count: isHe ? 'כמות' : 'Count' };

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: `${rootGroup?.name ?? ''} — ${subtreeArr.name}` }} />
        <View style={styles.activeHeader}>
          <TouchableOpacity onPress={() => setShowSubtreeView(false)}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.activeTitle}>{rootGroup?.name}</Text>
          <Text style={styles.activeMeta}>{subtreeTables.length} {t('tables')}</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={Colors.disabled} style={{ marginRight: Spacing.sm }} />
          <TextInput style={styles.searchInput} placeholder={isHe ? 'חפש אורח...' : 'Find guest...'}
            placeholderTextColor={Colors.disabled} value={stSearch} onChangeText={setStSearch} />
          {stSearch.length > 0 && <TouchableOpacity onPress={() => setStSearch('')}><Ionicons name="close-circle" size={16} color={Colors.disabled} /></TouchableOpacity>}
        </View>

        {stSearchResults && (
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            <View style={styles.searchResults}>
            {stSearchResults.length === 0 ? <Text style={styles.noResults}>{t('noGuestsFound')}</Text> :
              stSearchResults.map(g => (
                <View key={g.guestId} style={styles.searchRow}>
                  <Text style={styles.searchName}>{g.guestName}</Text>
                  <Text style={styles.searchTable}>{t('table')} #{g.tableId}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortBarScroll} contentContainerStyle={styles.sortBar}>
          <Text style={styles.sortLabel}>{t('sortBy')}:</Text>
          {sortKeys.map(k => (
            <TouchableOpacity key={k} style={[styles.sortChip, stSort === k && styles.sortChipActive]} onPress={() => setStSort(k)}>
              <Text style={[styles.sortChipText, stSort === k && styles.sortChipTextActive]}>{sortLabels[k]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* View toggle */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.md }}>
          <TouchableOpacity style={[styles.sortChip, !stTreeMap && styles.sortChipActive]} onPress={() => setStTreeMap(false)}>
            <Text style={[styles.sortChipText, !stTreeMap && styles.sortChipTextActive]}>Tables</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sortChip, stTreeMap && styles.sortChipActive]} onPress={() => setStTreeMap(true)}>
            <Text style={[styles.sortChipText, stTreeMap && styles.sortChipTextActive]}>Tree Map</Text>
          </TouchableOpacity>
        </View>

        {stTreeMap ? (
          <ScrollView horizontal nestedScrollEnabled>
            <ScrollView nestedScrollEnabled>
              <ColoredTree groups={groups} rootId={subtreeRootId} tables={subtreeArr.tables} maxDepth={subtreePreviewDepth} />
            </ScrollView>
          </ScrollView>
        ) : (
        <>
        <View style={styles.tablesGrid}>
          {sortedST.map(table => (
            <TableCircle key={table.tableId} table={table}
              metrics={stMetricsMap.get(table.tableId)}
              highlightLoneliest={stLoneliest?.tableId === table.tableId}
              subtreeGroupIds={subtreeGroupIds} />
          ))}
        </View>

        {sortedST.map(table => {
          const m = stMetricsMap.get(table.tableId);
          return (
            <View key={`list-${table.tableId}`} style={styles.tableList}>
              <View style={styles.tableListHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tableListTitle}>{t('table')} #{table.tableId} ({table.guests.length})</Text>
                  {m && (
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 11, color: cohesionColor(m.cohesion) }}>Cohesion: {cohesionLabel(m.cohesion)}</Text>
                      <Text style={{ fontSize: 11, color: lonelinessColor(m.loneliness) }}>Loneliness: {m.loneliness} ({m.loneliestGuestGroup})</Text>
                    </View>
                  )}
                </View>
              </View>
              {table.guests.map(g => {
                const isInSubtree = subtreeGroupIds.has(g.groupId);
                return (
                  <View key={g.guestId} style={[styles.tableGuest, !isInSubtree && { opacity: 0.4 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tableGuestName}>{g.guestName}</Text>
                      <Text style={styles.tableGuestGroup} numberOfLines={1}>{groupPath.get(g.groupId) || g.groupName}{!isInSubtree ? ` (${t('outsideGuests')})` : ''}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
        </>
        )}
      </ScrollView>
    );
  }


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t('seatingArrangement') }} />
      <Text style={styles.heading}>{t('seatingArrangement')}</Text>

      {/* Candidate results from generation */}
      {candidates.length > 0 && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Text style={styles.sectionTitle}>{t('generationResults')}</Text>
            <TouchableOpacity onPress={handleDiscardCandidates}>
              <Text style={{ fontSize: 12, color: Colors.danger, fontWeight: '600' }}>{t('discardAll')}</Text>
            </TouchableOpacity>
          </View>
          {candidates.map((c, idx) => {
            const m = computeTableMetrics(c.tables, groups);
            const totalCohesion = m.reduce((s, x) => s + (x.cohesion === -1 ? 0 : x.cohesion), 0);
            const totalLoneliness = m.reduce((s, x) => s + x.loneliness, 0);
            return (
              <View key={idx} style={styles.arrCard}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setViewingCandidate(idx)}>
                  <Text style={styles.arrName}>{c.tables.length} {t('tablesCount')}</Text>
                  <Text style={styles.arrMeta}>
                    {c.tables.reduce((s, tb) => s + tb.guests.length, 0)} {t('guests')} · Penalty: {c.penalty.toFixed(0)} · Cohesion: {totalCohesion.toFixed(1)} · Loneliness: {totalLoneliness.toFixed(1)}
                  </Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  {c.saved ? (
                    <Text style={{ color: Colors.success, fontWeight: '700', fontSize: 12 }}>✓</Text>
                  ) : (
                    <TouchableOpacity onPress={() => handleSaveCandidate(idx)}>
                      <Ionicons name="save-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Saved arrangements list */}
      {arrangements.length > 0 && !activeArr && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isHe ? 'סידורים שמורים' : 'Saved Arrangements'}</Text>
          {arrangements.map(arr => (
            <View key={arr.id} style={styles.arrCard}>
              {renamingId === arr.id ? (
                <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                  <TextInput style={styles.renameInput} value={renameValue} onChangeText={setRenameValue} autoFocus />
                  <TouchableOpacity onPress={() => { updateArrangement(arr.id, { name: renameValue.trim() || arr.name }); setRenamingId(null); }}>
                    <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={{ flex: 1 }} onPress={() => { setActiveArrId(arr.id); setSearch(''); setMovingGuest(null); }}>
                  <Text style={styles.arrName}>{arr.name}</Text>
                  <Text style={styles.arrMeta}>{arr.tables.length} {t('tables')} · {arr.tables.reduce((s, tb) => s + tb.guests.length, 0)} {t('guests')}</Text>
                </TouchableOpacity>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => { setRenamingId(arr.id); setRenameValue(arr.name); }}>
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => alertConfirm(t('delete'), arr.name, () => deleteArrangement(arr.id))}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Active arrangement view */}
      {activeArr && (
        <ArrangementView arr={activeArr} groups={groups} isHe={isHe} t={t}
          onBack={handleBackFromActive} movingGuest={movingGuest} setMovingGuest={setMovingGuest}
          handleMoveGuest={handleMoveGuest} updateArrangement={updateArrangement}
          search={search} setSearch={setSearch} groupPath={groupPath}
          undoStack={undoStack} onUndo={handleUndo}
          redoStack={redoStack} onRedo={handleRedo}
          overCapacityTables={overCapacityTables} maxTableSize={maxTableSize} />
      )}

      {/* Generate form (only when no active arrangement and no candidates) */}
      {!activeArr && candidates.length === 0 && (
        <View style={styles.configCard}>
          <Text style={styles.configTitle}>{isHe ? 'צור סידור חדש' : 'Generate New Arrangement'}</Text>
          <View style={styles.nameRow}>
            <TextInput style={styles.nameInput} placeholder={isHe ? 'שם הסידור (אופציונלי)' : 'Arrangement name (optional)'}
              placeholderTextColor={Colors.disabled} value={arrName} onChangeText={setArrName} />
          </View>
          <Stepper label={t('maxTableSize')}
            hint={isHe ? 'כמה אורחים יכולים לשבת בשולחן אחד' : 'How many guests can sit at one table'}
            value={maxTableSize} min={4} max={20} step={1} onChange={setMaxTableSize} />
          <Stepper label={isHe ? 'עדיפות למשפחה' : 'Keep families together'}
            hint={isHe ? 'ערך גבוה = קבוצות משפחתיות יישארו ביחד' : 'High = family groups stay together'}
            value={familyPriority} min={0.5} max={5.0} step={0.5} onChange={setFamilyPriority} />
          <Stepper label={isHe ? 'הימנעות מבדידות' : 'Avoid lonely guests'}
            hint={isHe ? 'ערך גבוה = אף אחד לא ישב לבד' : 'High = nobody sits alone'}
            value={strictness} min={1.0} max={4.0} step={0.5} onChange={setStrictness} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text }}>{isHe ? 'משקל לפי עומק' : 'Depth weighting'}</Text>
              <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>
                {isHe ? 'קבוצות קרובות לשורש מקבלות משקל גבוה יותר — חציית ענפים עליונים יקרה יותר' : 'Root-level splits cost more — crossing top branches is penalized more than splitting within a family'}
              </Text>
            </View>
            <Switch value={depthWeighting} onValueChange={setDepthWeighting}
              trackColor={{ false: Colors.border, true: Colors.success }} thumbColor={Colors.surface} />
          </View>
          <Button title={solving ? (isHe ? 'מחשב...' : 'Optimizing...') : t('generateSeating')} onPress={handleGenerate}
            icon={solving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="shuffle-outline" size={18} color="#FFF" />}
            disabled={solving} />
        </View>
      )}

      {/* Feature 3: Subtree seating picker */}
      {!activeArr && candidates.length === 0 && arrangements.length > 0 && (
        <View style={styles.configCard}>
          <Text style={styles.configTitle}>{t('subtreeView')}</Text>

          <Text style={styles.pickerLabel}>{t('pickSubtree')}</Text>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={Colors.disabled} style={{ marginRight: Spacing.sm }} />
            <TextInput style={styles.searchInput} placeholder={isHe ? 'חפש קבוצה...' : 'Search group...'}
              placeholderTextColor={Colors.disabled} value={subtreeSearch} onChangeText={setSubtreeSearch} />
            {subtreeSearch.length > 0 && <TouchableOpacity onPress={() => setSubtreeSearch('')}><Ionicons name="close-circle" size={16} color={Colors.disabled} /></TouchableOpacity>}
          </View>
          {subtreeSearch.trim() ? (
            <ScrollView style={{ maxHeight: 200, marginBottom: Spacing.md }} nestedScrollEnabled>
              {flatGroups.filter(({ group: g }) => g.name.toLowerCase().includes(subtreeSearch.trim().toLowerCase())).map(({ group: g, depth }) => (
                <TouchableOpacity key={g.id} style={[styles.pickerRow, subtreeRootId === g.id && styles.pickerRowActive, { paddingLeft: Spacing.md + depth * 16 }]}
                  onPress={() => { setSubtreeRootId(g.id); setSubtreeSearch(''); }}>
                  <Text style={[styles.pickerText, subtreeRootId === g.id && { color: Colors.primary, fontWeight: '700' }]}>{g.name}</Text>
                  {subtreeRootId === g.id && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
          <View style={{ marginBottom: Spacing.md }}>
            {isWeb ? (
              <>
                {subtreeRootGroup && (
                  <View style={styles.subtreeNavRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subtreeNavLabel}>Selected subtree</Text>
                      <Text style={styles.subtreeNavTitle}>{subtreeRootGroup.name}</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.subtreeHint}>Showing the full tree on web. Click any node to select that subtree.</Text>
                <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled horizontal>
                  <ScrollView nestedScrollEnabled>
                    {topLevelGroups.map(root => (
                      <View key={root.id} style={topLevelGroups.length > 1 ? styles.treeSection : undefined}>
                        <VisualTree
                          groups={groups}
                          rootId={root.id}
                          onNodePress={setSubtreeRootId}
                          focusedId={subtreeRootId ?? undefined}
                          maxDepth={subtreePreviewDepth}
                        />
                      </View>
                    ))}
                  </ScrollView>
                </ScrollView>
              </>
            ) : subtreeRootGroup ? (
              <>
                <View style={styles.subtreeNavRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subtreeNavLabel}>Current subtree</Text>
                    <Text style={styles.subtreeNavTitle}>{subtreeRootGroup.name}</Text>
                  </View>
                  {subtreeRootGroup.parentId && (
                    <TouchableOpacity style={styles.subtreeNavButton} onPress={() => setSubtreeRootId(subtreeRootGroup.parentId)}>
                      <Ionicons name="arrow-up" size={16} color={Colors.primary} />
                      <Text style={styles.subtreeNavButtonText}>Up</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.subtreeHint}>Showing up to {SUBTREE_PREVIEW_DEPTH} levels. Tap a node to drill into that subtree.</Text>
                <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled horizontal>
                  <ScrollView nestedScrollEnabled>
                    <VisualTree
                      groups={groups}
                      rootId={subtreeRootId!}
                      onNodePress={setSubtreeRootId}
                      focusedId={subtreeRootId ?? undefined}
                      maxDepth={subtreePreviewDepth}
                    />
                  </ScrollView>
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={styles.subtreeHint}>Choose a top-level group to start. The currently displayed subtree becomes the selection.</Text>
                {topLevelGroups.map(root => (
                  <TouchableOpacity key={root.id} style={styles.pickerRow} onPress={() => setSubtreeRootId(root.id)}>
                    <Text style={styles.pickerText}>{root.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
          )}

          <Text style={styles.pickerLabel}>{t('pickArrangement')}</Text>
          {arrangements.map(arr => (
            <TouchableOpacity key={arr.id} style={[styles.pickerRow, subtreeArrId === arr.id && styles.pickerRowActive]}
              onPress={() => setSubtreeArrId(arr.id)}>
              <Text style={[styles.pickerText, subtreeArrId === arr.id && { color: Colors.primary, fontWeight: '700' }]}>{arr.name}</Text>
              {subtreeArrId === arr.id && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
            </TouchableOpacity>
          ))}

          <Button title={t('viewSubtreeSeating')} onPress={() => setShowSubtreeView(true)}
            icon={<Ionicons name="git-branch-outline" size={18} color="#FFF" />}
            style={{ marginTop: Spacing.md }}
            disabled={!subtreeRootId || !subtreeArrId} />
        </View>
      )}

      {arrangements.length === 0 && !activeArr && candidates.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="grid-outline" size={40} color={Colors.disabled} />
          <Text style={styles.emptyText}>{t('noTables')}</Text>
        </View>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 80 },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  arrCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  arrName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  arrMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  renameInput: { flex: 1, fontSize: 15, color: Colors.text, borderBottomWidth: 1, borderBottomColor: Colors.primary, marginRight: Spacing.sm, paddingVertical: 4 },
  activeHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: Spacing.md, gap: Spacing.sm },
  activeTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, flex: 1, minWidth: 120 },
  activeMeta: { fontSize: 12, color: Colors.textSecondary },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 40, marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.text },
  searchResults: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.md },
  searchRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  searchName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  searchTable: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  noResults: { fontSize: 13, color: Colors.disabled, textAlign: 'center' },
  sortBarScroll: { marginBottom: Spacing.md },
  sortBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: Spacing.md },
  sortLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  sortChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  sortChipActive: { borderColor: Colors.primary, backgroundColor: Colors.accentLight },
  sortChipText: { fontSize: 11, color: Colors.textSecondary },
  sortChipTextActive: { color: Colors.primary, fontWeight: '700' },
  treeMapNavRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  treeMapNavLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase' },
  treeMapNavTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  treeMapNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.accentLight,
  },
  treeMapNavButtonText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  moveBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.accentLight, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.accent,
  },
  moveText: { fontSize: 13, color: Colors.text, flex: 1 },
  moveCancel: { fontSize: 13, fontWeight: '700', color: Colors.danger },
  tablesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: Spacing.md },
  tableList: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  tableListTarget: { borderColor: Colors.primary, borderWidth: 2 },
  tableListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  tableListTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  moveHereBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  moveHereText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  tableGuest: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderRadius: Radius.sm, paddingHorizontal: 4, marginHorizontal: -4 },
  guestMoving: { backgroundColor: Colors.accentLight, borderRadius: Radius.sm },
  guestMovingLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  tableGuestName: { fontSize: 13, color: Colors.text },
  tableGuestGroup: { fontSize: 11, color: Colors.textSecondary },
  configCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  configTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  nameRow: { marginBottom: Spacing.lg },
  nameInput: { fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 15, color: Colors.disabled, marginTop: Spacing.sm },
  saveCandidateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
  saveCandidateText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  pickerLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: Spacing.xs },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  pickerRowActive: { backgroundColor: Colors.accentLight },
  pickerText: { fontSize: 14, color: Colors.text },
  subtreeNavRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  subtreeNavLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase' },
  subtreeNavTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  subtreeNavButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.accentLight,
  },
  subtreeNavButtonText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  subtreeHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 18 },
});
