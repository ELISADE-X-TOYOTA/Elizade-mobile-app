import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppTextField } from '../../src/components/AppTextField';
import { AuthScaffold } from '../../src/components/AuthScaffold';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { SendingOverlay } from '../../src/components/SendingOverlay';
import { Txt } from '../../src/components/Txt';
import { requestOtp } from '../../src/data/authRepository';
import { spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { cleanEmail, isValidEmail } from '../../src/utils/sanitize';

/** Minimum time the sending animation stays up, so a fast response doesn't
 *  produce a jarring one-frame flash. */
const MIN_ANIMATION_MS = 1100;

/** Passwordless login: enter email → a one-time code is sent to that inbox →
 *  verified on the OTP screen, which completes the sign-in. */
export default function Login() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  const sendCode = async () => {
    if (!isValidEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    setError(undefined);
    setSending(true);

    const startedAt = Date.now();
    try {
      await requestOtp({ email, purpose: 'login' });
      // Let the animation finish its beat before handing over.
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_ANIMATION_MS) {
        await new Promise((r) => setTimeout(r, MIN_ANIMATION_MS - elapsed));
      }
      setSending(false);
      router.push({ pathname: '/(auth)/otp', params: { email } });
    } catch (e) {
      setSending(false);
      setError(e instanceof Error ? e.message : tr('auth.couldNotSendCode'));
    }
  };

  return (
    <>
      <AuthScaffold
        title={tr('auth.welcomeBack')}
        subtitle={tr('auth.loginSubtitle')}
        compactSubtitle
        showBack={false}
      >
        <AppTextField
          label={tr('auth.email')}
          placeholder={tr('auth.emailPlaceholder')}
          icon="mail-outline"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          sanitize={cleanEmail}
          maxLength={254}
          error={error}
        />

        <View style={{ height: spacing.xl }} />
        <PrimaryButton
          label={tr('auth.sendLoginCode')}
          icon="mail-outline"
          loading={sending}
          onPress={sendCode}
        />

        <Pressable
          onPress={() => router.push('/(auth)/register')}
          style={{ marginTop: spacing.xl, alignItems: 'center' }}
        >
          <Txt tone="secondary">
            {tr('auth.noAccount')}{'  '}
            <Txt variant="titleSmall" color={t.colors.accentText}>{tr('auth.signUp')}</Txt>
          </Txt>
        </Pressable>
      </AuthScaffold>

      <SendingOverlay visible={sending} email={email} />
    </>
  );
}
