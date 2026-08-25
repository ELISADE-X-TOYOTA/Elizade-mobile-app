import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationsApi } from '../api/notifications';
import { APP } from '../constants/app';

/**
 * Push registration.
 *
 * ── WHY expo-notifications IS NEVER IMPORTED AT THE TOP OF THIS FILE ──
 *
 * SDK 53 removed Android remote-push support from Expo Go, and the module
 * throws on IMPORT, not on use: `DevicePushTokenAutoRegistration.fx.js` runs as
 * a side effect of loading `expo-notifications` and calls `addPushTokenListener`
 * immediately. A static import therefore crashes the app at startup in Expo Go —
 * and because this module is reached from `authRepository` → `login.tsx`, that
 * meant the very first screen.
 *
 * So the module is loaded with a dynamic `import()` inside the functions that
 * need it, behind an Expo Go check. In Expo Go nothing is loaded and every
 * function no-ops; in a development or production build it behaves normally.
 *
 * PERMISSION TIMING: `registerForPush()` is called after sign-in, not on first
 * launch. A prompt shown before the customer knows what the app does is the one
 * most people decline, and iOS only asks once — a rejection is permanent.
 *
 * Nothing here throws. Push is an enhancement: a customer who declines, an
 * emulator with no push service, or Expo Go must all still get a working app.
 */

/**
 * Expo Go identifies itself as `storeClient` — it IS the store-installed Expo
 * client. Development and production builds report `standalone`/`bare`.
 */
export const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** True when push can actually work here. */
export const pushSupported = !IS_EXPO_GO && !APP.useMock;

/** The token last sent to the server, so we don't re-POST on every launch. */
let lastRegistered: string | null = null;
/** Set once, the first time the module is genuinely loaded. */
let handlerConfigured = false;

type NotificationsModule = typeof import('expo-notifications');

/**
 * Loads expo-notifications, or `null` where it cannot run.
 *
 * The `import()` is deliberately inside the guard: reaching it at all in Expo Go
 * is what crashes, so the check has to happen first.
 */
async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!pushSupported) return null;
  try {
    const Notifications = await import('expo-notifications');
    if (!handlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      handlerConfigured = true;
    }
    return Notifications;
  } catch {
    // A build without the native module compiled in.
    return null;
  }
}

async function getToken(): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  // A simulator has no push service to issue a token against.
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    // Only ask if we have not been refused before — iOS ignores repeat asks
    // and Android would just re-deny.
    if (!existing.canAskAgain) return null;
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  // Android needs a channel before anything will surface in the tray.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Elizade Connect',
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  // Expo injects the project id into a build; `easConfig` is the runtime copy.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const token = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return token.data;
}

/** Registers this device for push. Safe to call on every sign-in. */
export async function registerForPush(): Promise<boolean> {
  if (!pushSupported) return false;
  try {
    const token = await getToken();
    if (!token || token === lastRegistered) return !!token;
    await notificationsApi.registerDevice({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    lastRegistered = token;
    return true;
  } catch {
    // Declined, unsupported, or offline — none of which should surface.
    return false;
  }
}

/**
 * Unregisters on sign-out.
 *
 * Without this a shared handset keeps delivering the previous customer's
 * service updates to whoever signs in next.
 */
export async function unregisterFromPush(): Promise<void> {
  if (!lastRegistered) return;
  try {
    await notificationsApi.unregisterDevice(lastRegistered);
  } catch {
    /* best effort — the server also reassigns a token on re-registration */
  } finally {
    lastRegistered = null;
  }
}
