import { Stack } from 'expo-router';
import { StoreProvider } from '@/lib/store';
import { I18nProvider } from '@/lib/i18n';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider, useTheme, Colors } from '@/lib/theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function AppStack() {
  const { mode, colors } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: '' }} />
        <Stack.Screen name="event/[id]" options={{ title: '' }} />
        <Stack.Screen name="add-group" options={{ title: '' }} />
        <Stack.Screen name="add-guest" options={{ title: '' }} />
        <Stack.Screen name="edit-guest" options={{ title: '' }} />
        <Stack.Screen name="edit-group" options={{ title: '' }} />
        <Stack.Screen name="tree-view" options={{ title: '' }} />
        <Stack.Screen name="seating" options={{ title: '' }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <StoreProvider>
              <AppStack />
            </StoreProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
