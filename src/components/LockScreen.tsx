import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Modal, Pressable, StyleSheet, View } from 'react-native';

import { clearSession } from '../api/session';
import { describeBiometric, requestUnlock } from '../security/biometrics';
import { useStore } from '../store/useStore';
import { brand, LOCK_BADGE, LOCK_ERROR, LOCK_GROUND, LOCK_INK, LOCK_INK_FAINT, LOCK_INK_MUTED, solid } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { PrimaryButton } from './PrimaryButton';
import { Txt } from './Txt';

/**
 * The session is still here; the data is not on screen until the phone says
 * this is still you.
 *
 * Replaces the old behaviour of destroying the session after five minutes
 * away, which made the email OTP feel compulsory — and, while mail to Outlook
 * was being dropped, sometimes made returning impossible.
 *
 * A `Modal` rather than a routed screen so nothing underneath unmounts: the
 * customer comes back to the screen they left, mid-form if they were typing,
 * instead of being dropped at the dashboard having lost their place.
 *
 * ONE PROMPT PER LOCK. It fires once when the lock appears, and otherwise only
 * when the customer asks. Re-prompting on every foreground event is what made
 * the previous biometric attempt intolerable — the app asked again each time
 * the system briefly backgrounded it, including for the prompt's own
 * system UI.
 */
export function LockScreen() {
  const locked = useStore((s) => s.locked);
  const setLocked = useStore((s) => s.setLocked);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const { t: tr } = useTranslation();

  const [kind, setKind] = useState<'face' | 'fingerprint' | 'iris' | 'generic'>('generic');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Guards the auto-prompt so it runs once per lock, not once per render. */
  const prompted = useRef(false);

  useEffect(() => {
    if (locked) describeBiometric().then(setKind).catch(() => {});
    else prompted.current = false;
  }, [locked]);

  const unlock = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const outcome = await requestUnlock(tr('lock.prompt'));
      if (outcome === 'unlocked') {
        setLocked(false);
      } else if (outcome === 'unavailable') {
        // The device can no longer ask — biometrics removed, or the hardware
        // failed. Leaving the customer at a prompt nothing can satisfy would
        // be a dead end, so fall back to the sign-in they can always complete.
        await signOut();
      } else {
        setFailed(true);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, setLocked, tr]);

  const signOut = useCallback(async () => {
    await clearSession();
    setCurrentUser(null);
    setLocked(false);
    router.replace('/(auth)/login');
  }, [setCurrentUser, setLocked]);

  // Fire once as the lock appears. Only while the app is actually foreground:
  // raising a system prompt against a backgrounded app is how the previous
  // implementation ended up prompting twice.
  useEffect(() => {
    if (!locked || prompted.current) return;
    if (AppState.currentState !== 'active') return;
    prompted.current = true;
    void unlock();
  }, [locked, unlock]);

  if (!locked) return null;

  const icon = kind === 'face' ? 'scan-outline' : kind === 'iris' ? 'eye-outline' : 'finger-print';

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.badge}>
          <Ionicons name={icon} size={48} color={solid(brand.accent)} />
        </View>

        <Txt variant="headlineMedium" center color={LOCK_INK} style={{ marginTop: spacing.xl }}>
          {tr('lock.title')}
        </Txt>
        <Txt center color={LOCK_INK_MUTED} style={{ marginTop: spacing.sm, paddingHorizontal: spacing.xl }}>
          {tr(`lock.subtitle.${kind}`, { defaultValue: tr('lock.subtitle.generic') })}
        </Txt>

        {failed ? (
          <Txt variant="bodySmall" center color={LOCK_ERROR} style={{ marginTop: spacing.md }}>
            {tr('lock.failed')}
          </Txt>
        ) : null}

        <View style={{ height: spacing.xl }} />
        <View style={{ width: '100%', paddingHorizontal: spacing.xl }}>
          <PrimaryButton label={tr('lock.unlock')} icon={icon} loading={busy} onPress={unlock} />
        </View>

        {/* Always available. A lock with no way past it is a lost account. */}
        <Pressable onPress={signOut} hitSlop={10} style={{ marginTop: spacing.lg }}>
          <Txt variant="titleSmall" color={LOCK_INK_FAINT}>
            {tr('lock.useEmail')}
          </Txt>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: LOCK_GROUND, alignItems: 'center', justifyContent: 'center' },
  badge: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LOCK_BADGE,
  },
});
