import { useState, useMemo, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { TreeRow } from '@/components/TreeRow';
import { GuestCard } from '@/components/GuestCard';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { GuestGroup } from '@/lib/types';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, setCurrentEventId, groups, getChildren, totalExpectedGuests, updateGuest, moveGroup, getSubtreeGroups } = useStore();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compactStats = width < 420;

  useEffect(() => { setCurrentEventId(id); }, [id]);

  const event = events.find(e => e.id === id);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const roots = groups.filter(g => g.parentId === null);
    const firstLevel = roots.flatMap(r => groups.filter(g => g.parentId === r.id));
    return new Set([...roots, ...firstLevel].map(g => g.id));
  });
  const [search, setSearch] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Re-expand when groups change (e.g. switching events)
  useEffect(() => {
    const roots = groups.filter(g => g.parentId === null);
    const firstLevel = roots.flatMap(r => groups.filter(g => g.parentId === r.id));
    setExpanded(new Set([...roots, ...firstLevel].map(g => g.id)));
  }, [id]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const results: { guest: typeof groups[0]['guests'][0]; group: GuestGroup }[] = [];
    for (const g of groups) {
      for (const guest of g.guests) {
        if (guest.name.toLowerCase().includes(q) || guest.phone?.includes(q) || guest.email?.toLowerCase().includes(q))
          results.push({ guest, group: g });
      }
    }
    return results;
  }, [search, groups]);

  const toggle = (gid: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(gid) ? n.delete(gid) : n.add(gid); return n; });
  };

  const flatTree = useMemo(() => {
    const result: { group: GuestGroup; depth: number }[] = [];
    const visit = (parentId: string | null, depth: number) => {
      const children = groups.filter(g => g.parentId === parentId).sort((a, b) => a.createdAt - b.createdAt);
      for (const child of children) {
        result.push({ group: child, depth });
        if (expanded.has(child.id)) visit(child.id, depth + 1);
      }
    };
    visit(null, 0);
    return result;
  }, [groups, expanded]);

  const totalGuests = groups.reduce((s, g) => s + g.guests.length, 0);
  const expected = totalExpectedGuests();

  if (!event) return <Text style={{ padding: Spacing.lg }}>Event not found</Text>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: event.name }} />

      {/* Stats */}
      <View style={[styles.statsBar, compactStats && styles.statsBarCompact]}>
        <TouchableOpacity style={[styles.stat, compactStats && styles.statCompact]} onPress={() => router.push(`/tree-view?rootId=`)}>
          <Ionicons name="git-network-outline" size={18} color={Colors.primary} />
          <Text style={styles.statLabel}>{t('treeView')}</Text>
        </TouchableOpacity>
        {!compactStats && <View style={styles.divider} />}
        <TouchableOpacity style={[styles.stat, compactStats && styles.statCompact]} onPress={() => router.push('/seating')}>
          <Ionicons name="grid-outline" size={18} color={Colors.primary} />
          <Text style={styles.statLabel}>{t('seatingArrangement')}</Text>
        </TouchableOpacity>
        {!compactStats && <View style={styles.divider} />}
        <View style={[styles.stat, compactStats && styles.statCompact]}>
          <Text style={styles.statNum}>{totalGuests}</Text>
          <Text style={styles.statLabel}>{t('totalGuests')}</Text>
        </View>
        {!compactStats && <View style={styles.divider} />}
        <View style={[styles.stat, compactStats && styles.statCompact]}>
          <Text style={[styles.statNum, { color: Colors.success }]}>{expected}</Text>
          <Text style={styles.statLabel}>{t('expected')}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.disabled} style={{ marginRight: Spacing.sm }} />
        <TextInput style={styles.searchInput} placeholder={t('search')} placeholderTextColor={Colors.disabled} value={search} onChangeText={setSearch} />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.disabled} />
          </TouchableOpacity>
        )}
      </View>

      {searchResults ? (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.guest.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: Spacing.md }}>
              <Text style={styles.searchGroupLabel}>{item.group.name}</Text>
              <GuestCard
                guest={item.guest}
                onToggleExpected={() => updateGuest(item.group.id, item.guest.id, { expectedToArrive: !item.guest.expectedToArrive })}
                onPress={() => router.push(`/edit-guest?groupId=${item.group.id}&guestId=${item.guest.id}`)}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}><Text style={styles.emptyText}>{t('noGuestsFound')}</Text></View>
          }
        />
      ) : (
        <>
          {/* Drag mode banner */}
          {draggingId && (
            <View style={styles.dragBanner}>
              <Text style={styles.dragText}>
                {isRTL ? 'בחר יעד עבור' : 'Tap a group to move'} "{groups.find(g => g.id === draggingId)?.name}" {isRTL ? '' : 'into it'}
              </Text>
              <TouchableOpacity onPress={() => setDraggingId(null)}>
                <Text style={styles.dragCancel}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={flatTree}
            keyExtractor={item => item.group.id}
            renderItem={({ item }) => {
              const hasChildren = groups.some(g => g.parentId === item.group.id);
              const isDragging = draggingId === item.group.id;
              // Valid drop target: not self, not a descendant of dragged node
              const draggingSubtreeIds = draggingId ? new Set(getSubtreeGroups(draggingId).map(g => g.id)) : new Set();
              const isDropTarget = !!draggingId && !isDragging && !draggingSubtreeIds.has(item.group.id);
              return (
                <TreeRow group={item.group} depth={item.depth} expanded={expanded.has(item.group.id)}
                  hasChildren={hasChildren} onToggle={() => toggle(item.group.id)}
                  onPress={() => router.push(`/group/${item.group.id}`)}
                  isDragging={isDragging}
                  isDropTarget={isDropTarget}
                  onDragStart={() => setDraggingId(isDragging ? null : item.group.id)}
                  onDrop={() => {
                    if (draggingId) {
                      moveGroup(draggingId, item.group.id);
                      // Auto-expand the target so user sees the moved group
                      setExpanded(prev => { const n = new Set(prev); n.add(item.group.id); return n; });
                      setDraggingId(null);
                    }
                  }}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color={Colors.disabled} />
                <Text style={styles.emptyText}>{t('noGroupsYet')}</Text>
                <Text style={styles.emptyHint}>{t('tapToCreate')}</Text>
              </View>
            }
            contentContainerStyle={flatTree.length === 0 ? styles.emptyContainer : undefined}
          />
        </>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-group')} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: Colors.surface, paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  statsBarCompact: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    rowGap: Spacing.sm,
  },
  stat: { alignItems: 'center', paddingVertical: 4 },
  statCompact: {
    width: '48%',
    minHeight: 72,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  statNum: { fontSize: 20, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  divider: { width: 1, height: 32, backgroundColor: Colors.border },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  searchGroupLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyContainer: { flex: 1 },
  emptyText: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md },
  emptyHint: { fontSize: 13, color: Colors.disabled, marginTop: Spacing.xs },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  dragBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.accentLight, borderRadius: Radius.md, padding: Spacing.md,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.accent,
  },
  dragText: { fontSize: 13, color: Colors.text, flex: 1 },
  dragCancel: { fontSize: 13, fontWeight: '700', color: Colors.danger, marginLeft: Spacing.sm },
});
