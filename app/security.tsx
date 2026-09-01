import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '../src/components/Txt';
import { setHardwareProtection } from '../src/api/session';
import { LockCapabilities, NO_CAPABILITIES, authenticate, getCapabilities } from '../src/security/biometrics';
import { DEFAULT_LOCK_GRACE_MS, DEFAULT_SESSION_MAX_IDLE_MS } from '../src/security/lockPolicy';
import { useSecurityStore } from '../src/store/useSecurityStore';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { solid } from '../src/theme/colors';

const METHOD_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  face: 'face-recognition',
  fingerprint: 'fingerprint',
  iris: 'eye-outline',
  passcode: 'dialpad',
  none: 'lock-outline',
};

/** App Lock settings. */
export default function Security() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();

  const enabled = useSecurityStore((s) => s.appLockEnabled);
  const setEnabled = useSecurityStore((s) => s.setAppLockEnabled);

  const [caps, setCaps] = useState<LockCapabilities>(NO_CAPABILITIES);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    getCapabilities().then(setCaps);
  }, []);

  /**
   * Turning the lock ON authenticates FIRST.
   *
   * Otherwise a customer can arm a gate they cannot open — one failed sensor
   * and their own account is behind a door that never admits them. Proving the
   * gate works before relying on it is the whole point.
   */
  const toggle = async (next: boolean) => {
    setNotice(undefined);
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await authenticate(
        next ? tr('appLock.confirmEnable') : tr('appLock.confirmDisable'),
        tr('common.cancel'),
      );
      if (!outcome.ok) {
        if (outcome.reason !== 'cancelled') setNotice(tr('appLock.failed'));
        return;
      }

      const stored = await setHardwareProtection(next);
      // The preference still applies even if the keystore rewrite failed: the
      // overlay is real protection on its own. But say so rather than implying
      // hardware-backed sealing that is not actually in place.
      if (!stored) setNotice(tr('appLock.softOnly'));
      setEnabled(next);
    } finally {
      setBusy(false);
    }
  };

  const graceMinutes = Math.round(DEFAULT_LOCK_GRACE_MS / 60_000);
  const idleDays = Math.round(DEFAULT_SESSION_MAX_IDLE_MS / 86_400_000);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH, paddingBottom: spacing.sm }}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>{tr('appLock.settingsTitle')}</Txt>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screenH, paddingTop: spacing.sm, paddingBottom: 60, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: solid(t.colors.accent) }]}>
              <MaterialCommunityIcons
                name={METHOD_ICON[caps.method] ?? 'lock-outline'}
                size={22}
                color={t.colors.onAccent}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Txt variant="titleMedium">{tr('appLock.toggleLabel')}</Txt>
              <Txt variant="bodySmall" tone="secondary" style={{ marginTop: 2 }}>
                {caps.canUseAppLock
                  ? tr(`appLock.method.${caps.method}`)
                  : tr('appLock.noDeviceLock')}
              </Txt>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggle}
              disabled={busy || !caps.canUseAppLock}
              trackColor={{ true: solid(t.colors.accent), false: t.colors.border }}
              thumbColor={t.colors.surface}
            />
          </View>
        </View>

        {notice ? (
          <Txt variant="bodySmall" tone="secondary">{notice}</Txt>
        ) : null}

        <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, gap: 10 }]}>
          <Txt variant="titleSmall">{tr('appLock.howTitle')}</Txt>
          <Txt variant="bodySmall" tone="secondary">{tr('appLock.howResume', { minutes: graceMinutes })}</Txt>
          <Txt variant="bodySmall" tone="secondary">{tr('appLock.howSession', { days: idleDays })}</Txt>
          <Txt variant="bodySmall" tone="secondary">{tr('appLock.howKeystore')}</Txt>
        </View>

        {!caps.canUseAppLock ? (
          <Txt variant="bodySmall" tone="secondary">{tr('appLock.setUpDeviceLock')}</Txt>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
