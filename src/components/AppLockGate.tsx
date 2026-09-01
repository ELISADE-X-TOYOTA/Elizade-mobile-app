import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from './Txt';
import {
  clearSession,
  readLastActive,
  resetHardwareUnlock,
  touchActivity,
  wasHardwareUnlockedThisLaunch,
} from '../api/session';
import { authenticate } from '../security/biometrics';
import { decideOnResume } from '../security/lockPolicy';
import { useSecurityStore } from '../store/useSecurityStore';
import { useStore } from '../store/useStore';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { solid } from '../theme/colors';

/**
 * The lock screen, mounted once above the navigator.
 *
 * It covers the app rather than navigating to a route, for one reason: a route
 * can be dismissed. A customer who backgrounds the app on their warranty
 * documents comes back to an opaque overlay on top of that screen, and the only
 * way past it is the device gate. Nothing underneath ever unmounts, so returning
 * from the lock puts them exactly where they were.
 */
export function AppLockGate() {
  const t = useTheme();
  const { t: tr } = useTranslation();

  const enabled = useSecurityStore((s) => s.appLockEnabled);
  const locked = useSecurityStore((s) => s.locked);
  const setLocked = useSecurityStore((s) => s.setLocked);
  const backgroundedAt = useSecurityStore((s) => s.backgroundedAt);
  const setBackgroundedAt = useSecurityStore((s) => s.setBackgroundedAt);
  const currentUser = useStore((s) => s.currentUser);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  /** Guards against two prompts racing — a resume event plus a manual tap. */
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    setBusy(true);
    setMessage(undefined);
    try {
      const outcome = await authenticate(tr('appLock.prompt'), tr('common.cancel'));
      if (outcome.ok) {
        await touchActivity();
        setLocked(false);
        setBackgroundedAt(null);
        return;
      }
      // Cancelling is not an error worth shouting about — the overlay simply
      // stays up with its Unlock button. The other outcomes need explaining.
      if (outcome.reason === 'lockout') setMessage(tr('appLock.lockout'));
      else if (outcome.reason === 'unavailable') setMessage(tr('appLock.unavailable'));
      else if (outcome.reason === 'failed') setMessage(tr('appLock.failed'));
    } finally {
      prompting.current = false;
      setBusy(false);
    }
  }, [setBackgroundedAt, setLocked, tr]);

  /*
    Launch. The session-expiry clock is checked here rather than on resume
    alone, because the commonest stale session is one that was never resumed —
    the app was closed for a month and opened cold.
  */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      /*
        Signed out: do nothing, and in particular do NOT stamp activity.

        This effect runs once with `currentUser` still null — the splash has not
        finished restoring — and again once it lands. Stamping on that first
        pass would write `lastActiveAt = now` before the expiry check ever saw
        the real value, silently resetting the session clock on every launch and
        making a 14-day expiry unreachable.
      */
      if (!currentUser) return;

      const lastActiveAt = await readLastActive();
      if (cancelled) return;
      const action = decideOnResume({
        hasSession: true,
        enabled,
        // A cold launch has no background stamp. Passing 0 (the epoch) makes
        // the elapsed time enormous, so a launch always clears the grace
        // period — which is what "lock on every fresh launch" means.
        backgroundedAt: enabled ? 0 : null,
        lastActiveAt,
        now: Date.now(),
      });

      if (action === 'signOut') {
        await clearSession();
        useStore.getState().setCurrentUser(null);
        router.replace('/(auth)/login');
        return;
      }
      if (action === 'lock') {
        // Unless the keystore already took a fingerprint to unseal the token
        // during session restore — asking twice in one launch is noise.
        if (wasHardwareUnlockedThisLaunch()) {
          await touchActivity();
          return;
        }
        setLocked(true);
        return;
      }
      await touchActivity();
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per launch, after the splash has restored (or not) a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  /* Background / resume. */
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        // Stamped even when the lock is off: the session clock runs regardless,
        // and a customer who enables App Lock later needs a sane starting point.
        const now = Date.now();
        setBackgroundedAt(now);
        void touchActivity(now);
        return;
      }
      if (next !== 'active') return;

      const state = useSecurityStore.getState();
      if (!useStore.getState().currentUser) return;

      void (async () => {
        const lastActiveAt = await readLastActive();
        const action = decideOnResume({
          hasSession: true,
          enabled: state.appLockEnabled,
          backgroundedAt: state.backgroundedAt,
          lastActiveAt,
          now: Date.now(),
        });
        if (action === 'signOut') {
          await clearSession();
          useStore.getState().setCurrentUser(null);
          router.replace('/(auth)/login');
          return;
        }
        if (action === 'lock') {
          // A fresh gate is required, so any earlier keystore unlock is spent.
          resetHardwareUnlock();
          state.setLocked(true);
          return;
        }
        await touchActivity();
      })();
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [setBackgroundedAt]);

  /* Prompt as soon as the overlay appears — no extra tap in the common case. */
  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  // Belt and braces: if the preference is switched off while locked (only
  // reachable from the settings screen, which sits behind the lock), never
  // strand the customer behind an overlay nothing can dismiss.
  useEffect(() => {
    if (!enabled && locked) setLocked(false);
  }, [enabled, locked, setLocked]);

  if (!locked) return null;

  return (
    // The background must be OPAQUE and must never resolve to undefined: a
    // transparent lock screen shows the account it is supposed to be hiding.
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: t.colors.canvas ?? t.colors.background },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: solid(t.colors.accent) }]}>
        <MaterialCommunityIcons name="lock-outline" size={34} color={t.colors.onAccent} />
      </View>

      <Txt variant="headlineMedium" style={{ marginTop: spacing.lg }}>{tr('appLock.title')}</Txt>
      <Txt tone="secondary" style={styles.body}>{tr('appLock.body')}</Txt>

      {message ? (
        <Txt tone="secondary" style={styles.body}>{message}</Txt>
      ) : null}

      <Pressable
        onPress={unlock}
        disabled={busy}
        accessibilityRole="button"
        style={[styles.cta, { backgroundColor: solid(t.colors.accent), opacity: busy ? 0.6 : 1 }]}
      >
        <Txt variant="titleSmall" color={t.colors.onAccent}>
          {busy ? tr('appLock.checking') : tr('appLock.unlock')}
        </Txt>
      </Pressable>

      {/*
        The way out for a customer whose sensor has failed or who has forgotten
        the device passcode. Without it, a broken fingerprint reader means an
        uninstall — the account is still reachable, just not from this overlay.
      */}
      <Pressable
        onPress={async () => {
          await clearSession();
          useStore.getState().setCurrentUser(null);
          setLocked(false);
          router.replace('/(auth)/login');
        }}
        accessibilityRole="button"
        style={styles.secondary}
      >
        <Txt tone="secondary">{tr('appLock.useAccount')}</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.screenH, zIndex: 999 },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  body: { marginTop: spacing.sm, textAlign: 'center' },
  cta: {
    marginTop: spacing.xl,
    paddingHorizontal: 28,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { marginTop: spacing.md, padding: spacing.sm },
});
