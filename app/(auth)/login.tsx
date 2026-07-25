import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppTextField } from '../../src/components/AppTextField';
import { AuthScaffold } from '../../src/components/AuthScaffold';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Txt } from '../../src/components/Txt';
import { requestOtp } from '../../src/data/authRepository';
import { spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { cleanEmail, isValidEmail } from '../../src/utils/sanitize';

/** Passwordless login: enter email → a one-time code is sent to that inbox →
 *  verified on the OTP screen, which completes the sign-in. */
export default function Login() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const sendCode = async () => {
    if (!isValidEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await requestOtp({ email, purpose: 'login' });
      router.push({ pathname: '/(auth)/otp', params: { email } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      title="Welcome Back"
      subtitle="Enter your email and we'll send a one-time code to sign in."
      showBack={false}
    >
      <AppTextField
        label="Email"
        placeholder="you@example.com"
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
        label="Send Login Code"
        icon="mail-outline"
        loading={loading}
        onPress={sendCode}
      />

      <Pressable
        onPress={() => router.push('/(auth)/register')}
        style={{ marginTop: spacing.xl, alignItems: 'center' }}
      >
        <Txt tone="secondary">
          Don't have an account?{'  '}
          <Txt variant="titleSmall" color={t.colors.primary}>
            Sign Up
          </Txt>
        </Txt>
      </Pressable>
    </AuthScaffold>
  );
}
