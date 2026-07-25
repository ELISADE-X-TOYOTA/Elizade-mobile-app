// Per-weight subpath imports (not the package root): the root index re-exports
// all 9 weights, which makes Metro bundle ~495 kB of .ttf. This ships only the
// 4 weights the type scale actually uses.
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { migrateLegacyToken } from '../src/api/session';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useStore } from '../src/store/useStore';
import { useTheme } from '../src/theme/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Black native window background so the launch never flashes white.
SystemUI.setBackgroundColorAsync('#000000').catch(() => {});

export default function RootLayout() {
  const t = useTheme();
  const setFontsReady = useStore((s) => s.setFontsReady);
  const [loaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  // Outfit is only safe to reference once actually loaded; on failure the
  // theme keeps serving the system face rather than rendering nothing.
  useEffect(() => {
    if (loaded) setFontsReady(true);
  }, [loaded, setFontsReady]);

  // One-off: move any token written by a pre-SecureStore build out of
  // plaintext AsyncStorage into the Keychain / KeyStore.
  useEffect(() => {
    migrateLegacyToken();
  }, []);

  // Settle = fonts ready OR failed. Never gate the UI on a network font.
  const settled = loaded || !!fontError;

  useEffect(() => {
    if (settled) SplashScreen.hideAsync().catch(() => {});
  }, [settled]);

  if (!settled) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style={t.isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: t.colors.background },
            animation: 'slide_from_right',
            // Headers are hidden app-wide (custom in-screen headers instead),
            // but set these so any screen that enables one still gets Outfit.
            headerTitleStyle: { fontFamily: t.type.titleLarge.fontFamily },
            headerBackTitleStyle: { fontFamily: t.type.bodyMedium.fontFamily },
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="car/[id]" />
          <Stack.Screen name="book-service" />
          <Stack.Screen name="service-detail/[id]" />
          <Stack.Screen name="warranty" />
          <Stack.Screen name="new-ticket" />
          <Stack.Screen name="ticket/[id]" />
          <Stack.Screen name="garage" />
          <Stack.Screen name="garage-vehicle/[id]" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="trade-in" />
          </Stack>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
