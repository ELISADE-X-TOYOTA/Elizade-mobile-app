import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareView } from '../src/components/KeyboardAware';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Txt } from '../src/components/Txt';
import { OTP_KEYBOARD_TYPE } from '../src/constants/otpKeyboard';
import { deleteAccount, requestDeletionCode } from '../src/data/accountRepository';
import { useStore } from '../src/store/useStore';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';

/** Kept in step with the public page at elizade-web.vercel.app/delete-account.html. */
const DELETED_KEYS = ['profile', 'vehicles', 'uploads', 'support', 'saved', 'sessions'] as const;
const KEPT_KEYS = ['sales', 'warranty'] as const;
/** Six dots, one per code digit — a shape, not words, so it needs no translation. */
const CODE_PLACEHOLDER = '•'.repeat(6);

/**
 * Delete my account.
 *
 * Two deliberate steps: what will happen, then a code sent to the account's
 * email. The code is the confirmation — deletion cannot be undone, and holding
 * an unlocked phone is not the same as being the account holder.
 */
export default function DeleteAccountScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useStore((s) => s.currentUser);
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [step, setStep] = useState<'explain' | 'code'>('explain');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setSending(true);
    setError(null);
    try {
      await requestDeletionCode();
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('deleteAccount.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const confirm = () => {
    if (code.trim().length < 4) return;
    Alert.alert(tr('deleteAccount.finalTitle'), tr('deleteAccount.finalBody'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('deleteAccount.finalConfirm'), style: 'destructive', onPress: () => void runDelete() },
    ]);
  };

  const runDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount(code);
      setCurrentUser(null);
      router.replace('/onboarding');
      Alert.alert(tr('deleteAccount.doneTitle'), tr('deleteAccount.doneBody'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('deleteAccount.failed'));
      setDeleting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScreenHeader title={tr('deleteAccount.title')} />
      <KeyboardAwareView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: spacing.screenH,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'explain' ? (
            <>
              <Txt variant="bodyMedium" tone="secondary">
                {tr('deleteAccount.intro')}
              </Txt>

              <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <Txt variant="titleSmall" style={styles.cardTitle}>{tr('deleteAccount.deletedTitle')}</Txt>
                {DELETED_KEYS.map((k) => (
                  <Bullet key={k} icon="trash-outline" color={t.colors.errorText} text={tr(`deleteAccount.deleted.${k}`)} />
                ))}
              </View>

              <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <Txt variant="titleSmall" style={styles.cardTitle}>{tr('deleteAccount.keptTitle')}</Txt>
                {KEPT_KEYS.map((k) => (
                  <Bullet key={k} icon="archive-outline" color={t.colors.textSecondary} text={tr(`deleteAccount.kept.${k}`)} />
                ))}
              </View>

              <Txt variant="bodySmall" tone="secondary">
                {tr('deleteAccount.codeExplain', { email: user?.email ?? '' })}
              </Txt>
              {error ? <Txt variant="bodySmall" color={t.colors.errorText}>{error}</Txt> : null}
              <PrimaryButton label={tr('deleteAccount.sendCode')} icon="mail-outline" loading={sending} onPress={sendCode} />
              <PrimaryButton label={tr('common.cancel')} variant="outline" onPress={() => router.back()} />
            </>
          ) : (
            <>
              <Txt variant="bodyMedium" tone="secondary">
                {tr('deleteAccount.enterCode', { email: user?.email ?? '' })}
              </Txt>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\s/g, '').slice(0, 6))}
                placeholder={CODE_PLACEHOLDER}
                placeholderTextColor={t.colors.textTertiary}
                keyboardType={OTP_KEYBOARD_TYPE}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                accessibilityLabel={tr('deleteAccount.codeLabel')}
                style={[
                  styles.codeInput,
                  {
                    color: t.colors.textPrimary,
                    backgroundColor: t.colors.surface,
                    borderColor: error ? t.colors.errorText : t.colors.border,
                    fontFamily: t.type.titleLarge.fontFamily,
                  },
                ]}
              />
              {error ? <Txt variant="bodySmall" color={t.colors.errorText}>{error}</Txt> : null}
              <PrimaryButton
                label={tr('deleteAccount.confirm')}
                icon="trash-outline"
                loading={deleting}
                disabled={code.trim().length < 4}
                onPress={confirm}
              />
              <PrimaryButton
                label={tr('deleteAccount.resend')}
                variant="outline"
                loading={sending}
                disabled={deleting}
                onPress={sendCode}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAwareView>
    </View>
  );
}

function Bullet({ icon, color, text }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }) {
  return (
    <View style={styles.bullet}>
      <Ionicons name={icon} size={16} color={color} style={{ marginTop: 2 }} />
      <Txt variant="bodyMedium" style={{ flex: 1, marginLeft: 10 }}>{text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 16 },
  cardTitle: { marginBottom: 8 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  codeInput: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 16,
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 10,
  },
});
