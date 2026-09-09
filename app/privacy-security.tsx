import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '../src/components/Txt';
import { APP } from '../src/constants/app';
import { WEBSITE } from '../src/constants/contact';
import { logout } from '../src/data/authRepository';
import { useStore } from '../src/store/useStore';
import { emailSupport, openLink } from '../src/utils/contact';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';

/**
 * Privacy & Security.
 *
 * I REMOVED THIS ROW rather than leave it dead, and said at the time it should
 * come back when there was something real to put in it. This is that: every
 * item below does something that already exists, and nothing here is a stub.
 *
 *   * signing out everywhere is a genuine server-side action — `revokeSession`
 *     kills the refresh-token family, not just this device's copy;
 *   * the email lock is explained where somebody looking for account security
 *     would actually go looking;
 *   * data requests route to a real inbox rather than a form that goes nowhere.
 *
 * Account deletion is deliberately ABSENT rather than faked. There is no
 * endpoint for it, and a button that files a support ticket while claiming to
 * delete an account would be worse than not offering it. It is the next thing
 * this screen should gain.
 */
export default function PrivacySecurity() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const [signingOut, setSigningOut] = useState(false);

  const signOutEverywhere = () => {
    Alert.alert(
      tr('privacy.signOutAll'),
      tr('privacy.signOutAllConfirm'),
      [
        { text: tr('common.back'), style: 'cancel' },
        {
          text: tr('privacy.signOutAll'),
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              // Revokes the refresh-token family server-side, so every other
              // device is signed out too — not just this one.
              await logout();
              setCurrentUser(null);
              router.replace('/(auth)/login');
            } catch (e) {
              Alert.alert(
                tr('privacy.signOutAll'),
                e instanceof Error ? e.message : tr('privacy.signOutAllFailed'),
              );
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={tr('common.back')}
          style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          {tr('profile.privacySecurity')}
        </Txt>
        <Txt tone="secondary">{tr('privacy.subtitle')}</Txt>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 40, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {/* How the account is protected — stated, not implied. */}
        <Section title={tr('privacy.howYouSignIn')}>
          <Fact icon="mail-outline" text={tr('privacy.signInFact', { email: APP.supportEmail })} />
          <Fact icon="lock-closed-outline" text={tr('privacy.emailLockedFact')} />
          <Fact icon="notifications-outline" text={tr('privacy.alertsFact')} />
        </Section>

        <Section title={tr('privacy.yourDevices')}>
          <Action
            icon="log-out-outline"
            danger
            label={tr('privacy.signOutAll')}
            detail={tr('privacy.signOutAllDetail')}
            disabled={signingOut}
            onPress={signOutEverywhere}
          />
        </Section>

        <Section title={tr('privacy.yourData')}>
          <Action
            icon="document-text-outline"
            label={tr('privacy.privacyPolicy')}
            detail={WEBSITE.replace('https://', '')}
            onPress={() => openLink(WEBSITE, tr('privacy.privacyPolicy'))}
          />
          <Action
            icon="download-outline"
            label={tr('privacy.requestYourData')}
            detail={APP.supportEmail}
            onPress={() => emailSupport(tr('privacy.requestYourData'), 'Data request')}
          />
          {/*
            Deletion routes to a human because there is no endpoint for it. A
            button that claimed to delete an account and quietly filed a ticket
            would be a lie in the one place a lie is least acceptable.
          */}
          <Action
            icon="trash-outline"
            danger
            label={tr('privacy.deleteAccount')}
            detail={tr('privacy.deleteAccountDetail')}
            onPress={() => emailSupport(tr('privacy.deleteAccount'), 'Account deletion request')}
          />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View>
      <Txt variant="titleSmall" tone="secondary" style={{ marginBottom: spacing.sm }}>
        {title}
      </Txt>
      <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={t.colors.textSecondary} />
      <Txt variant="bodySmall" tone="secondary" style={{ flex: 1, marginLeft: 12 }}>
        {text}
      </Txt>
    </View>
  );
}

function Action({
  icon,
  label,
  detail,
  danger,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const ink = danger ? t.colors.errorText : t.colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, { opacity: pressed || disabled ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={18} color={danger ? t.colors.errorText : t.colors.primary} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Txt variant="titleSmall" color={ink}>{label}</Txt>
        {detail ? (
          <Txt variant="bodySmall" tone="secondary" numberOfLines={1}>{detail}</Txt>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
});
