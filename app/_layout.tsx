// Per-weight subpath imports (not the package root): the root index re-exports
// all 9 weights, which makes Metro bundle ~495 kB of .ttf. This ships only the
// 4 weights the type scale actually uses.
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { useFonts } from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { migrateLegacyToken } from '../src/api/session';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { CompareTray } from '../src/components/CompareTray';
import { PatternBackground } from '../src/components/PatternBackground';
import { useStore } from '../src/store/useStore';
import { useTheme } from '../src/theme/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Black native window before React mounts, matching the black splash so the
// launch never flashes white. Once mounted, the effect below hands this over to
// the active theme.
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

  /*
    Keep the NATIVE system surfaces in step with the theme.

    Window colour: used to be pinned to black at module scope and never
    updated, which left the window light-on-failure and wrong in light mode. It
    matters because every screen renders `backgroundColor: 'transparent'` over a
    single canvas View — if that view ever fails to paint, this is the colour
    the user sees behind near-white text, so it has to be the themed backdrop.

    Android nav bar: SDK 54 puts Android in edge-to-edge, so the bar is
    transparent and our canvas shows through it. Only the BUTTON glyphs need
    theming — and they must invert relative to the canvas, or the dark default
    icons sit invisibly on our near-black backdrop. `setBackgroundColorAsync` is
    deliberately not called: it is unsupported under edge-to-edge and only warns.
  */
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.colors.canvas).catch(() => {});
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync(t.isDark ? 'light' : 'dark').catch(() => {});
    }
  }, [t.colors.canvas, t.isDark]);

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
        {/*
          The wallpaper is mounted ONCE here, beneath the navigator, so every
          route inherits it — including modals and screens added later. Screens
          render a transparent root so it shows through.

          The base tint is `canvas`, the token for "recessed page backdrop":
          it is the grey wash in light mode and the darkest black in dark mode,
          so opaque `surface` cards read as raised in BOTH themes. (It is not
          `surfaceAlt` — that is lighter than `surface` on dark, which inverted
          the elevation and made cards look sunken.)
        */}
        {/*
          `?? background` is deliberate belt-and-braces. Screens are all
          transparent, so this ONE view carries the backdrop for the entire app
          — and `backgroundColor: undefined` does not fail loudly, it renders
          nothing and drops near-white text onto the bare native surface. A
          missing palette key must degrade to another themed colour, never to
          transparent.
        */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: t.colors.canvas ?? t.colors.background },
          ]}
        >
          <PatternBackground absolute />
        </View>
        <Stack
          screenOptions={{
            headerShown: false,
            // Transparent so the wallpaper above is visible behind each route.
            contentStyle: { backgroundColor: 'transparent' },
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
          <Stack.Screen name="book-test-drive" />
          <Stack.Screen name="book-service" />
          <Stack.Screen name="service-detail/[id]" />
          <Stack.Screen name="warranty" />
          <Stack.Screen name="new-ticket" />
          <Stack.Screen name="ticket/[id]" />
          <Stack.Screen name="garage" />
          <Stack.Screen name="garage-vehicle/[id]" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="trade-in" />
          <Stack.Screen name="compare" />
          </Stack>
          {/*
            Mounted once, above the navigator, so a comparison survives the trip
            from the showroom grid into a car's details and back. It gates
            itself by route rather than being dropped into each screen — one
            instance means one source of truth for the dock's state and no
            duplicate trays during a screen transition.
          */}
          <CompareTray />
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
