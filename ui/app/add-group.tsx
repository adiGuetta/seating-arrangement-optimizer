import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors, Spacing, Radius } from '@/lib/theme';

export default function AddGroupScreen() {
  const params = useLocalSearchParams<{ parentId?: string }>();
  const { groups, addGroup, updateGroup } = useStore();
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(params.parentId ?? null);
  const [edgeWeight, setEdgeWeight] = useState('1');

  const parentOptions: { id: string | null; label: string; depth: number }[] = [
    { id: null, label: t('noneTopLevel'), depth: 0 },
  ];
  const visit = (pid: string | null, depth: number) => {
    groups.filter(g => g.parentId === pid).sort((a, b) => a.createdAt - b.createdAt)
      .forEach(c => { parentOptions.push({ id: c.id, label: c.name, depth }); visit(c.id, depth + 1); });
  };
  visit(null, 1);

  const handleSave = () => {
    if (!name.trim()) { alertOk(t('groupName'), ''); return; }
    const g = addGroup(name.trim(), parentId);
    const w = parseFloat(edgeWeight) || 1;
    if (w !== 1) updateGroup(g.id, { edgeWeight: Math.max(0.1, w) });
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{t('addGroup')}</Text>
      <Text style={styles.hint}>{t('groupHint')}</Text>

      <Input label={t('groupName')} placeholder="e.g. Bride's Family" value={name} onChangeText={setName} autoFocus />

      {parentId !== null && (
        <>
          <Input label={t('edgeWeight')} value={edgeWeight} onChangeText={setEdgeWeight} keyboardType="numeric" />
          <Text style={styles.weightHint}>{t('edgeWeightHint')}</Text>
        </>
      )}

      <Text style={styles.sectionLabel}>{t('parentGroup')}</Text>
      <View style={styles.parentList}>
        {parentOptions.map(opt => (
          <TouchableOpacity key={opt.id ?? 'root'}
            style={[styles.parentOption, parentId === opt.id && styles.parentSelected]}
            onPress={() => setParentId(opt.id)} activeOpacity={0.7}>
            <View style={{ paddingLeft: opt.depth * 16, flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {opt.depth > 0 && <View style={[styles.dot, { backgroundColor: opt.depth === 1 ? Colors.primary : Colors.primaryLight }]} />}
              <Text style={[styles.parentText, parentId === opt.id && styles.parentTextSelected]} numberOfLines={1}>{opt.label}</Text>
            </View>
            {parentId === opt.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title={t('cancel')} variant="ghost" onPress={() => router.back()} style={{ flex: 1, marginRight: Spacing.sm }} />
        <Button title={t('create')} onPress={handleSave} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  hint: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 18 },
  weightHint: { fontSize: 11, color: Colors.textSecondary, marginTop: -Spacing.sm, marginBottom: Spacing.md, lineHeight: 15 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
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
