import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { Guest } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface Props {
  guest: Guest;
  onToggleExpected: () => void;
  onPress: () => void;
}

export function GuestCard({ guest, onToggleExpected, onPress }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} style={styles.left} activeOpacity={0.7}>
        <View style={[styles.avatar, !guest.expectedToArrive && styles.avatarDimmed]}>
          <Ionicons name="person" size={18} color={guest.expectedToArrive ? Colors.surface : Colors.disabled} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, !guest.expectedToArrive && styles.dimmed]}>{guest.name}</Text>
          {guest.phone ? <Text style={styles.phone}>{guest.phone}</Text> : null}
          {guest.arrivedConfirmed && (
            <View style={styles.arrivedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
              <Text style={styles.arrivedText}>{t('arrived')}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.right}>
        <Text style={styles.toggleLabel}>{guest.expectedToArrive ? t('coming') : t('notComing')}</Text>
        <Switch
          value={guest.expectedToArrive}
          onValueChange={onToggleExpected}
          trackColor={{ false: Colors.border, true: Colors.success }}
          thumbColor={Colors.surface}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  avatarDimmed: { backgroundColor: Colors.disabled },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text },
  dimmed: { color: Colors.disabled },
  phone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  arrivedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  arrivedText: { fontSize: 11, color: Colors.success, marginLeft: 3, fontWeight: '600' },
  right: { alignItems: 'flex-end' },
  toggleLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
});
