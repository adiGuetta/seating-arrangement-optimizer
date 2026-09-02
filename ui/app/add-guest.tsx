import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/Input';
import { alertOk } from '@/lib/alert';
import { Button } from '@/components/Button';
import { Colors, Spacing } from '@/lib/theme';

export default function AddGuestScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { addGuest, getGroup } = useStore();
  const { t } = useI18n();
  const group = getGroup(groupId);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [expected, setExpected] = useState(true);

  const handleSave = () => {
    if (!name.trim()) { alertOk(t('name'), ''); return; }
    addGuest(groupId, {
      name: name.trim(), phone: phone.trim() || undefined,
      email: email.trim() || undefined, notes: notes.trim() || undefined,
      expectedToArrive: expected, arrivedConfirmed: false,
    });
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{t('addGuest')}</Text>
      {group && <Text style={styles.hint}>{group.name}</Text>}
      <Input label={t('name')} placeholder="Full name" value={name} onChangeText={setName} autoFocus />
      <Input label={t('phone')} placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input label={t('email')} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Input label={t('notes')} placeholder="Notes" value={notes} onChangeText={setNotes} multiline />
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>{t('expectedToArrive')}</Text>
        </View>
        <Switch value={expected} onValueChange={setExpected} trackColor={{ false: Colors.border, true: Colors.success }} thumbColor={Colors.surface} />
      </View>
      <View style={styles.actions}>
        <Button title={t('cancel')} variant="ghost" onPress={() => router.back()} style={{ flex: 1, marginRight: Spacing.sm }} />
        <Button title={t('addGuest')} onPress={handleSave} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  hint: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.lg },
  switchLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  actions: { flexDirection: 'row' },
});
