import { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { VisualTree } from '@/components/VisualTree';
import { Colors, Spacing } from '@/lib/theme';

const MOBILE_TREE_MAX_DEPTH = 3;

export default function TreeViewScreen() {
  const params = useLocalSearchParams<{ rootId?: string }>();
  const { groups, getGroup, getSubtreeGroups, moveGroup } = useStore();
  const { t, isRTL } = useI18n();
  const router = useRouter();

  const roots = groups.filter(g => g.parentId === null).sort((a, b) => a.createdAt - b.createdAt);
  const [focusId, setFocusId] = useState<string>(params.rootId || '');
  const [movingId, setMovingId] = useState<string | null>(null);

  const movingSubtreeIds = useMemo(() =>
    movingId ? new Set(getSubtreeGroups(movingId).map(g => g.id)) : new Set<string>(),
    [movingId, groups, getSubtreeGroups]
  );

  // If focused on a specific node, show that subtree. Otherwise show all roots.
  const focusGroup = focusId ? getGroup(focusId) : undefined;
  const subtree = focusId ? getSubtreeGroups(focusId) : groups;
  const totalGuests = subtree.reduce((s, g) => s + g.guests.length, 0);
  const expectedGuests = subtree.reduce((s, g) => s + g.guests.filter(gu => gu.expectedToArrive).length, 0);

  const breadcrumb: { id: string; name: string }[] = [];
  if (focusGroup) {
    let cur = focusGroup;
    while (cur) {
      breadcrumb.unshift({ id: cur.id, name: cur.name });
      const parent = cur.parentId ? getGroup(cur.parentId) : undefined;
      if (!parent) break;
      cur = parent;
    }
  }

  const handleNodePress = (id: string) => {
    if (id === focusId) router.push(`/group/${id}`);
    else setFocusId(id);
  };

  const handleMobileBack = () => {
    if (!focusGroup) return;
    if (focusGroup.parentId) setFocusId(focusGroup.parentId);
    else setFocusId('');
  };

  // Which roots to render
  const visibleRoots = focusId ? [focusId] : roots.map(r => r.id);
  const maxDepth = Platform.OS === 'web' ? undefined : MOBILE_TREE_MAX_DEPTH;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: focusGroup?.name ?? t('treeView') }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbBar} contentContainerStyle={styles.breadcrumbContent}>
        {focusId && (
          <View style={styles.breadcrumbItem}>
            <TouchableOpacity onPress={() => setFocusId('')}>
              <Text style={styles.breadcrumbText}>{t('treeView')}</Text>
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={12} color={Colors.disabled} style={{ marginHorizontal: 4 }} />
          </View>
        )}
        {breadcrumb.map((b, i) => (
          <View key={b.id} style={styles.breadcrumbItem}>
            {i > 0 && <Ionicons name="chevron-forward" size={12} color={Colors.disabled} style={{ marginHorizontal: 4 }} />}
            <TouchableOpacity onPress={() => setFocusId(b.id)}>
              <Text style={[styles.breadcrumbText, b.id === focusId && styles.breadcrumbActive]}>{b.name}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {Platform.OS !== 'web' && focusGroup && (
        <View style={styles.mobileBackRow}>
          <TouchableOpacity style={styles.mobileBackButton} onPress={handleMobileBack}>
            <Ionicons name="arrow-back" size={16} color={Colors.primary} />
            <Text style={styles.mobileBackText}>{focusGroup.parentId ? 'Back to parent' : 'Back to full tree'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{subtree.length} {t('groups')} · {totalGuests} {t('guests')} · {expectedGuests} {t('expected')}</Text>
      </View>

      {movingId && (
        <View style={styles.moveBanner}>
          <Text style={styles.moveText}>
            {isRTL ? 'בחר יעד עבור' : 'Tap a node to move'} "{groups.find(g => g.id === movingId)?.name}" {isRTL ? '' : 'into it'}
          </Text>
          <TouchableOpacity onPress={() => setMovingId(null)}>
            <Text style={styles.moveCancel}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.treeScroll} horizontal>
        <ScrollView>
          {visibleRoots.length > 0 ? (
            visibleRoots.map(rootId => (
              <View key={rootId} style={visibleRoots.length > 1 ? styles.treeSection : undefined}>
                <VisualTree groups={groups} rootId={rootId} onNodePress={handleNodePress} focusedId={focusId || undefined}
                  maxDepth={maxDepth}
                  movingId={movingId} movingSubtreeIds={movingSubtreeIds}
                  onMoveStart={(id) => setMovingId(movingId === id ? null : id)}
                  onMoveDrop={(targetId) => { moveGroup(movingId!, targetId); setMovingId(null); }}
                />
              </View>
            ))
          ) : (
            <Text style={{ padding: Spacing.lg, color: Colors.disabled }}>{t('noGroupsYet')}</Text>
          )}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  breadcrumbBar: { maxHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  breadcrumbContent: { alignItems: 'center', paddingHorizontal: Spacing.md },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center' },
  breadcrumbText: { fontSize: 13, color: Colors.textSecondary },
  breadcrumbActive: { color: Colors.primary, fontWeight: '700' },
  mobileBackRow: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  mobileBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.accentLight,
  },
  mobileBackText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  statsRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  statsText: { fontSize: 12, color: Colors.textSecondary },
  treeScroll: { flex: 1 },
  treeSection: { marginBottom: Spacing.lg, paddingBottom: Spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  moveBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.accentLight, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.accent },
  moveText: { fontSize: 13, color: Colors.text, flex: 1 },
  moveCancel: { fontSize: 13, fontWeight: '700', color: Colors.danger, marginLeft: Spacing.md },
});
