import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Linking, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { LoginScreen } from '@/components/LoginScreen';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { CONFIG } from '@/lib/config';
import { useTheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { alertConfirm } from '@/lib/alert';

export default function LandingScreen() {
  const { events, addEvent, cloneEvent, deleteEvent, updateEvent, setCurrentEventId } = useStore();
  const { t, lang, setLang, isRTL } = useI18n();
  const { user, loading, logout } = useAuth();
  const { mode: themeMode, toggle: toggleTheme } = useTheme();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [showClone, setShowClone] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);
  const [skipLogin, setSkipLogin] = useState(false);

  // Show login screen if not logged in and hasn't skipped
  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!user && !skipLogin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
          <LoginScreen />
          <TouchableOpacity style={styles.skipBtn} onPress={() => setSkipLogin(true)}>
            <Text style={styles.skipText}>{isRTL ? 'המשך בלי חשבון →' : 'Continue without account →'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const handleCreate = () => {
    if (!newName.trim()) return;
    const ev = addEvent(newName.trim(), newDate.trim() || undefined);
    setShowNew(false); setNewName(''); setNewDate('');
    setCurrentEventId(ev.id);
    router.push(`/event/${ev.id}`);
  };

  const handleClone = () => {
    if (!newName.trim() || !cloneSourceId) return;
    const ev = cloneEvent(cloneSourceId, newName.trim());
    setShowClone(false); setNewName(''); setCloneSourceId(null);
    setCurrentEventId(ev.id);
    router.push(`/event/${ev.id}`);
  };

  const handleDelete = (id: string, name: string) => {
    alertConfirm(t('delete'), `"${name}"?`, () => deleteEvent(id));
  };

  const openEvent = (id: string) => {
    setCurrentEventId(id);
    router.push(`/event/${id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: t('myEvents') }} />

      {/* Top bar: user info + language */}
      <View style={styles.topBar}>
        {user ? (
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={22} color={Colors.primary} />
            <Text style={styles.userName} numberOfLines={1}>{user.displayName || user.email}</Text>
            <TouchableOpacity onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setSkipLogin(false)} style={styles.signInLink}>
            <Ionicons name="log-in-outline" size={16} color={Colors.primary} />
            <Text style={styles.signInText}>{isRTL ? 'התחבר' : 'Sign in'}</Text>
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => { if (Platform.OS === 'web') window.open('/about.html', '_blank'); else Linking.openURL(`${CONFIG.SERVER_URL}/about.html`); }}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme}>
            <Ionicons name={themeMode === 'dark' ? 'sunny' : 'moon'} size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.langToggle} onPress={() => setLang(lang === 'en' ? 'he' : 'en')}>
            <Ionicons name="language" size={18} color={Colors.primary} />
            <Text style={styles.langText}>{lang === 'en' ? 'עברית' : 'English'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💍 {t('myEvents')}</Text>
      </View>

      {/* Event list */}
      <FlatList
        data={events}
        keyExtractor={e => e.id}
        contentContainerStyle={events.length === 0 ? styles.emptyContainer : styles.list}
        renderItem={({ item }) => {
          const totalGuests = item.groups.reduce((s, g) => s + g.guests.length, 0);
          const expected = item.groups.reduce((s, g) => s + g.guests.filter(gu => gu.expectedToArrive).length, 0);
          return (
            <View style={styles.eventCard}>
              {editingEvent === item.id ? (
                <View>
                  <Input label={t('eventName')} value={editName} onChangeText={setEditName} autoFocus />
                  <Input label={t('eventDate')} value={editDate} onChangeText={setEditDate} />
                  <View style={{ flexDirection: 'row', marginTop: Spacing.sm }}>
                    <Button title={t('cancel')} variant="ghost" onPress={() => setEditingEvent(null)} style={{ flex: 1, marginRight: Spacing.sm }} />
                    <Button title={t('save')} onPress={() => {
                      if (editName.trim()) updateEvent(item.id, { name: editName.trim(), date: editDate.trim() || undefined });
                      setEditingEvent(null);
                    }} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : (
                <>
                  <View style={[styles.eventHeader, isRTL && styles.rowRTL]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => openEvent(item.id)} activeOpacity={0.7}>
                      <Text style={styles.eventName}>{item.name}</Text>
                      {item.date && <Text style={styles.eventDate}>{item.date}</Text>}
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => { setEditingEvent(item.id); setEditName(item.name); setEditDate(item.date ?? ''); }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="create-outline" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => openEvent(item.id)} activeOpacity={0.7}>
                    <View style={styles.eventStats}>
                      <Text style={styles.eventStat}>{item.groups.length} {t('groups')}</Text>
                      <Text style={styles.eventStatDot}>·</Text>
                      <Text style={styles.eventStat}>{totalGuests} {t('guests')}</Text>
                      <Text style={styles.eventStatDot}>·</Text>
                      <Text style={[styles.eventStat, { color: Colors.success }]}>{expected} {t('expected')}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={Colors.disabled} />
            <Text style={styles.emptyText}>{t('noEvents')}</Text>
          </View>
        }
      />

      {/* New event form */}
      {(showNew || showClone) && (
        <View style={styles.formOverlay}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{showClone ? t('cloneEvent') : t('newEvent')}</Text>
            <Input label={t('eventName')} placeholder="e.g. Our Event" value={newName} onChangeText={setNewName} autoFocus />
            <Input label={t('eventDate')} placeholder="YYYY-MM-DD" value={newDate} onChangeText={setNewDate} />
            {showClone && (
              <>
                <Text style={styles.cloneLabel}>{t('cloneFrom')}</Text>
                {events.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.cloneOption, cloneSourceId === e.id && styles.cloneSelected]}
                    onPress={() => setCloneSourceId(e.id)}
                  >
                    <Text style={styles.cloneText}>{e.name}</Text>
                    {cloneSourceId === e.id && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </>
            )}
            <View style={styles.formActions}>
              <Button title={t('cancel')} variant="ghost" onPress={() => { setShowNew(false); setShowClone(false); setNewName(''); }} style={{ flex: 1, marginRight: Spacing.sm }} />
              <Button title={t('create')} onPress={showClone ? handleClone : handleCreate} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      )}

      {/* Bottom actions */}
      {!showNew && !showClone && (
        <View style={styles.bottomActions}>
          <Button title={t('newEvent')} onPress={() => setShowNew(true)} icon={<Ionicons name="add-circle-outline" size={18} color="#FFF" />} style={{ flex: 1, marginRight: Spacing.sm }} />
          {events.length > 0 && (
            <Button title={t('cloneEvent')} variant="secondary" onPress={() => setShowClone(true)} icon={<Ionicons name="copy-outline" size={18} color={Colors.primary} />} style={{ flex: 1 }} />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loginScroll: { flexGrow: 1, justifyContent: 'center' },
  langToggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', padding: Spacing.md, paddingBottom: 0 },
  langText: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginLeft: 4 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  list: { paddingHorizontal: Spacing.md },
  eventCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowRTL: { flexDirection: 'row-reverse' },
  eventName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  eventDate: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  eventStats: { flexDirection: 'row', marginTop: Spacing.sm },
  eventStat: { fontSize: 12, color: Colors.textSecondary },
  eventStatDot: { fontSize: 12, color: Colors.disabled, marginHorizontal: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center' },
  emptyText: { fontSize: 15, color: Colors.disabled, marginTop: Spacing.md, textAlign: 'center' },
  formOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', padding: Spacing.lg,
  },
  formCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  formTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  formActions: { flexDirection: 'row', marginTop: Spacing.md },
  cloneLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: Spacing.sm },
  cloneOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.xs, backgroundColor: Colors.surface,
  },
  cloneSelected: { borderColor: Colors.primary, backgroundColor: Colors.accentLight },
  cloneText: { fontSize: 14, color: Colors.text },
  bottomActions: { flexDirection: 'row', padding: Spacing.md },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  userName: { fontSize: 13, color: Colors.text, fontWeight: '600', maxWidth: 180 },
  signInLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signInText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  skipBtn: { padding: Spacing.lg },
  skipText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
