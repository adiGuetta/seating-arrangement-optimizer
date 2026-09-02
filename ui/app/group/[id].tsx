import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { alertConfirm, alertOk } from '@/lib/alert';
import { GuestCard } from '@/components/GuestCard';
import { Button } from '@/components/Button';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { useState } from 'react';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getGroup, getChildren, getSubtreeGroups, deleteGroup, updateGuest, events, currentEvent, exportSubtreeToEvent } = useStore();
  const { t } = useI18n();
  const isHe = t('lang') === 'he';

  const group = getGroup(id);
  if (!group) return <Text style={{ padding: Spacing.lg }}>Group not found</Text>;

  const [showExport, setShowExport] = useState(false);

  const children = getChildren(id);
  const subtree = getSubtreeGroups(id);
  const totalGuests = subtree.reduce((s, g) => s + g.guests.length, 0);
  const expectedGuests = subtree.reduce((s, g) => s + g.guests.filter(gu => gu.expectedToArrive).length, 0);

  const handleDelete = () => {
    alertConfirm(t('deleteGroup'), t('deleteGroupConfirm', group.name), () => { deleteGroup(id); router.back(); });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: group.name }} />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{group.guests.length}</Text>
          <Text style={styles.statLabel}>{t('direct')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{totalGuests}</Text>
          <Text style={styles.statLabel}>{t('inSubtree')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.success }]}>{expectedGuests}</Text>
          <Text style={styles.statLabel}>{t('expected')}</Text>
        </View>
        {group.parentId && (
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{group.edgeWeight}</Text>
            <Text style={styles.statLabel}>{t('edgeWeight')}</Text>
          </View>
        )}
      </View>

      {/* Subgroups */}
      {children.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('subgroups')}</Text>
          {children.map(child => (
            <TouchableOpacity key={child.id} style={styles.subgroupRow}
              onPress={() => router.push(`/group/${child.id}`)} activeOpacity={0.7}>
              <View style={styles.subgroupLeft}>
                <View style={styles.dot} />
                <Text style={styles.subgroupName}>{child.name}</Text>
                {child.edgeWeight !== 1 && (
                  <Text style={styles.weightBadge}>w={child.edgeWeight}</Text>
                )}
              </View>
              <View style={styles.subgroupRight}>
                <Text style={styles.subgroupMeta}>{child.guests.length} {t('guests')}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.border} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Guests */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('guestsInGroup')}</Text>
          <TouchableOpacity onPress={() => router.push(`/add-guest?groupId=${id}`)}>
            <Ionicons name="person-add" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        {group.guests.length === 0 ? (
          <View style={styles.emptyGuests}>
            <Text style={styles.emptyText}>{t('noGuestsYet')}</Text>
            <Button title={t('addGuest')} variant="secondary"
              onPress={() => router.push(`/add-guest?groupId=${id}`)}
              icon={<Ionicons name="person-add-outline" size={16} color={Colors.primary} />}
              style={{ marginTop: Spacing.sm }} />
          </View>
        ) : (
          group.guests.map(guest => (
            <GuestCard key={guest.id} guest={guest}
              onToggleExpected={() => updateGuest(id, guest.id, { expectedToArrive: !guest.expectedToArrive })}
              onPress={() => router.push(`/edit-guest?groupId=${id}&guestId=${guest.id}`)} />
          ))
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title={t('editGroup')} variant="secondary"
          onPress={() => router.push(`/edit-group?id=${id}`)}
          icon={<Ionicons name="create-outline" size={16} color={Colors.primary} />}
          style={{ marginBottom: Spacing.sm }} />
        <Button title={t('viewAsTree')} variant="secondary"
          onPress={() => router.push(`/tree-view?rootId=${id}`)}
          icon={<Ionicons name="git-network-outline" size={16} color={Colors.primary} />}
          style={{ marginBottom: Spacing.sm }} />
        <Button title={t('addSubgroup')} variant="secondary"
          onPress={() => router.push(`/add-group?parentId=${id}`)}
          icon={<Ionicons name="folder-open-outline" size={16} color={Colors.primary} />}
          style={{ marginBottom: Spacing.sm }} />
        <Button title={isHe ? 'ייצא תת-עץ לאירוע אחר' : 'Export subtree to another event'} variant="secondary"
          onPress={() => setShowExport(!showExport)}
          icon={<Ionicons name="share-outline" size={16} color={Colors.primary} />}
          style={{ marginBottom: Spacing.sm }} />
        {showExport && (
          <View style={styles.exportList}>
            {events.filter(e => e.id !== currentEvent?.id).map(e => (
              <TouchableOpacity key={e.id} style={styles.exportOption}
                onPress={() => { exportSubtreeToEvent(id, e.id); setShowExport(false); alertOk(isHe ? 'ייצוא' : 'Export', isHe ? `יוצא ל-${e.name}` : `Exported to ${e.name}`); }}>
                <Text style={styles.exportText}>{e.name}</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            ))}
            {events.filter(e => e.id !== currentEvent?.id).length === 0 && (
              <Text style={styles.exportEmpty}>{isHe ? 'אין אירועים אחרים' : 'No other events'}</Text>
            )}
          </View>
        )}
        <Button title={t('deleteGroup')} variant="danger" onPress={handleDelete}
          icon={<Ionicons name="trash-outline" size={16} color="#FFF" />} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 80 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: 70, alignItems: 'center', paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  statNum: { fontSize: 22, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, textTransform: 'uppercase' },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  subgroupRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  subgroupLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, marginRight: Spacing.sm },
  subgroupName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  weightBadge: { fontSize: 10, color: Colors.textSecondary, backgroundColor: Colors.accentLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: Spacing.sm },
  subgroupRight: { flexDirection: 'row', alignItems: 'center' },
  subgroupMeta: { fontSize: 12, color: Colors.textSecondary, marginRight: Spacing.xs },
  emptyGuests: { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyText: { fontSize: 14, color: Colors.disabled },
  actions: { marginTop: Spacing.md },
  exportList: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.sm },
  exportOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  exportText: { fontSize: 14, color: Colors.text },
  exportEmpty: { padding: Spacing.md, fontSize: 13, color: Colors.disabled, textAlign: 'center' },
});
