import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { alertConfirm } from '@/lib/alert';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors, Spacing } from '@/lib/theme';

export default function EditGuestScreen() {
  const { groupId, guestId } = useLocalSearchParams<{ groupId: string; guestId: string }>();
  const router = useRouter();
  const { getGroup, updateGuest, removeGuest } = useStore();
  const { t } = useI18n();

  const group = getGroup(groupId);
  const guest = group?.guests.find(g => g.id === guestId);

  const [name, setName] = useState(guest?.name ?? '');
  const [phone, setPhone] = useState(guest?.phone ?? '');
  const [email, setEmail] = useState(guest?.email ?? '');
  const [notes, setNotes] = useState(guest?.notes ?? '');
  const [expected, setExpected] = useState(guest?.expectedToArrive ?? true);
  const [giftDesc, setGiftDesc] = useState(guest?.giftDescription ?? '');

  if (!group || !guest) return <Text style={{ padding: Spacing.lg }}>Guest not found</Text>;

  const handleSave = () => {
    if (!name.trim()) { alertOk(t('name'), ''); return; }
    updateGuest(groupId, guestId, {
      name: name.trim(), phone: phone.trim() || undefined,
      email: email.trim() || undefined, notes: notes.trim() || undefined,
      expectedToArrive: expected, giftDescription: giftDesc.trim() || undefined,
    });
    router.back();
  };

  const handleDelete = () => {
    alertConfirm(t('remove'), t('removeGuestConfirm', guest.name), () => { removeGuest(groupId, guestId); router.back(); });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: guest.name }} />
      <Input label={t('name')} value={name} onChangeText={setName} />
      <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Input label={t('notes')} value={notes} onChangeText={setNotes} multiline />
      <Input label={t('giftDescription')} value={giftDesc} onChangeText={setGiftDesc} multiline />
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>{t('expectedToArrive')}</Text>
          <Text style={styles.switchHint}>{expected ? t('coming') : t('notComing')}</Text>
        </View>
        <Switch value={expected} onValueChange={setExpected} trackColor={{ false: Colors.border, true: Colors.success }} thumbColor={Colors.surface} />
      </View>
      {guest.arrivedConfirmed && (
        <View style={styles.arrivedBanner}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.arrivedText}>{t('arrived')} ✓</Text>
        </View>
      )}
      <View style={styles.actions}>
        <Button title={t('save')} onPress={handleSave} style={{ flex: 1, marginRight: Spacing.sm }} />
        <Button title={t('remove')} variant="danger" onPress={handleDelete} icon={<Ionicons name="trash-outline" size={16} color="#FFF" />} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 80 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.md },
  switchLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  switchHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  arrivedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDF7EA', padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.lg },
  arrivedText: { fontSize: 14, color: Colors.success, fontWeight: '600', marginLeft: Spacing.sm },
  actions: { flexDirection: 'row', marginTop: Spacing.md },
});
