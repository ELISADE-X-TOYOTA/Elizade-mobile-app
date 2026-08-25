import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationsApi } from '../api/notifications';
import { APP } from '../constants/app';

/**
 * Push registration.
 *
 * PERMISSION TIMING: `register()` is called after sign-in, not on first launch.
 * A permission prompt shown before the customer knows what the app does is the
 * one most people decline, and iOS only asks once — a rejection is effectively
 * permanent.
 *
 * Nothing here throws. Push is an enhancement: a customer who declines, or an
 * emulator with no push support, must still get a working app.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** The token last sent to the server, so we don't re-POST on every launch. */
let lastRegistered: string | null = null;

async function getToken(): Promise<string | null> {
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

  const projectId =
    (APP as { easProjectId?: string }).easProjectId ??
    // Expo injects this in a build; absent in bare dev.
    (Notifications as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  const token = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return token.data;
}

/** Registers this device for push. Safe to call on every sign-in. */
export async function registerForPush(): Promise<boolean> {
  if (APP.useMock) return false;
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
    // Declined, unsupported, or offline — none of which should surface to the user.
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
  if (APP.useMock || !lastRegistered) return;
  try {
    await notificationsApi.unregisterDevice(lastRegistered);
  } catch {
    /* best effort — the server also reassigns a token on re-registration */
  } finally {
    lastRegistered = null;
  }
}
