import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors, Spacing, Radius } from '@/lib/theme';

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getGroup, groups, updateGroup, moveGroup, reorderGroup, getSubtreeGroups } = useStore();
  const { t } = useI18n();

  const group = getGroup(id);
  if (!group) return <Text style={{ padding: Spacing.lg }}>Group not found</Text>;

  const [name, setName] = useState(group.name);
  const [edgeWeight, setEdgeWeight] = useState(String(group.edgeWeight));
  const [newParentId, setNewParentId] = useState<string | null | undefined>(undefined); // undefined = no change

  const subtreeIds = new Set(getSubtreeGroups(id).map(g => g.id));

  // Parent options: all groups except self and descendants
  const parentOptions: { id: string | null; label: string; depth: number }[] = [
    { id: null, label: t('noneTopLevel'), depth: 0 },
  ];
  const buildOptions = (pid: string | null, depth: number) => {
    groups.filter(g => g.parentId === pid && !subtreeIds.has(g.id))
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach(g => { parentOptions.push({ id: g.id, label: g.name, depth }); buildOptions(g.id, depth + 1); });
  };
  buildOptions(null, 1);

  const effectiveParent = newParentId === undefined ? group.parentId : newParentId;

  const handleSave = () => {
    if (!name.trim()) { alertOk(t('name'), ''); return; }
    const w = parseFloat(edgeWeight) || 1;
    updateGroup(id, { name: name.trim(), edgeWeight: Math.max(0.1, w) });
    if (newParentId !== undefined && newParentId !== group.parentId) {
      moveGroup(id, newParentId);
    }
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `${t('editGroup')}: ${group.name}` }} />

      <Input label={t('groupName')} value={name} onChangeText={setName} />

      <Input label={t('edgeWeight')} value={edgeWeight} onChangeText={setEdgeWeight} keyboardType="numeric" />
      <Text style={styles.hint}>{t('edgeWeightHint')}</Text>

      {/* Reorder */}
      <Text style={styles.sectionLabel}>{t('moveGroup')}</Text>
      <View style={styles.reorderRow}>
        <Button title="↑" variant="secondary" onPress={() => reorderGroup(id, 'up')} style={{ flex: 1, marginRight: Spacing.sm }} />
        <Button title="↓" variant="secondary" onPress={() => reorderGroup(id, 'down')} style={{ flex: 1 }} />
      </View>

      {/* Parent picker */}
      <Text style={styles.sectionLabel}>{t('parentGroup')}</Text>
      <View style={styles.parentList}>
        {parentOptions.map(opt => (
          <TouchableOpacity
            key={opt.id ?? 'root'}
            style={[styles.parentOption, effectiveParent === opt.id && styles.parentSelected]}
            onPress={() => setNewParentId(opt.id)}
            activeOpacity={0.7}
          >
            <View style={{ paddingLeft: opt.depth * 16, flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {opt.depth > 0 && <View style={[styles.dot, { backgroundColor: opt.depth === 1 ? Colors.primary : Colors.primaryLight }]} />}
              <Text style={[styles.parentText, effectiveParent === opt.id && styles.parentTextSelected]} numberOfLines={1}>
                {opt.label}
              </Text>
            </View>
            {effectiveParent === opt.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title={t('cancel')} variant="ghost" onPress={() => router.back()} style={{ flex: 1, marginRight: Spacing.sm }} />
        <Button title={t('save')} onPress={handleSave} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 80 },
  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: -Spacing.sm, marginBottom: Spacing.md, lineHeight: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  reorderRow: { flexDirection: 'row', marginBottom: Spacing.md },
  parentList: { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.lg },
  parentOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  parentSelected: { backgroundColor: Colors.accentLight },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.sm },
  parentText: { fontSize: 15, color: Colors.text },
  parentTextSelected: { fontWeight: '600', color: Colors.primary },
  actions: { flexDirection: 'row', marginTop: Spacing.md },
});
