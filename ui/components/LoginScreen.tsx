import { View, Text, StyleSheet, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/Button';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { alertOk } from '@/lib/alert';

import { CONFIG } from '@/lib/config';
const SOLVER_BASE_URL = CONFIG.SERVER_URL;

const openAbout = () => {
  if (Platform.OS === 'web') window.open('/about.html', '_blank');
  else Linking.openURL(`${SOLVER_BASE_URL}/about.html`);
};

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const { t } = useI18n();
  const isHe = t('lang') === 'he';

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💍</Text>
      <Text style={styles.title}>Seating Planner</Text>
      <Text style={styles.subtitle}>{isHe ? 'ארגון הושבה לאירועים' : 'Smart seating for your special day'}</Text>
      <Text onPress={openAbout} style={styles.aboutLink}>
        {isHe ? 'מה האפליקציה עושה? →' : 'Learn what this app does →'}
      </Text>

      <View style={styles.card}>
        <Button
          title={isHe ? 'התחבר עם Google' : 'Sign in with Google'}
          onPress={async () => {
            try {
              await signInWithGoogle();
            } catch (e: any) {
              alertOk('Google sign-in failed', e?.message ?? String(e));
            }
          }}
          icon={<Ionicons name="logo-google" size={18} color="#FFF" />}
        />
        <Text style={styles.hint}>
          {isHe
            ? 'התחבר כדי לשמור את הנתונים בענן ולגשת מכל מכשיר'
            : 'Sign in to save your data in the cloud and access from any device'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emoji: { fontSize: 64, marginBottom: Spacing.md },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' },
  card: { width: '100%', maxWidth: 360, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  hint: { fontSize: 12, color: Colors.disabled, textAlign: 'center', marginTop: Spacing.md, lineHeight: 17 },
  aboutLink: { fontSize: 14, color: Colors.primary, fontWeight: '600', marginBottom: Spacing.lg },
});
