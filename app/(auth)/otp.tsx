import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { NativeSyntheticEvent, TextInput, TextInputKeyPressEventData, View } from 'react-native';
import { AuthScaffold } from '../../src/components/AuthScaffold';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Txt } from '../../src/components/Txt';
import { verifyOtp } from '../../src/data/authRepository';
import { useStore } from '../../src/store/useStore';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';

const LEN = 6;

export default function Otp() {
  const t = useTheme();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const inputs = useRef<(TextInput | null)[]>([]);
  const code = digits.join('');

  const onChange = (i: number, v: string) => {
    const clean = v.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < LEN - 1) inputs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const verify = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const user = await verifyOtp({ email, code });
      setCurrentUser(user);
      router.replace('/(tabs)/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title="Verify Code" subtitle={`Enter the 6-digit code sent to\n${email ?? 'your email'}.`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={d}
            onChangeText={(v) => onChange(i, v)}
            onKeyPress={(e) => onKey(i, e)}
            keyboardType="number-pad"
            maxLength={1}
            style={[
              t.type.headlineSmall,
              {
                width: 48,
                height: 56,
                textAlign: 'center',
                borderRadius: radius.md,
                borderWidth: 1,
                color: t.colors.textPrimary,
                borderColor: error ? t.colors.error : d ? t.colors.primary : t.colors.border,
                backgroundColor: d ? t.colors.primary + '14' : t.colors.surfaceAlt,
              },
            ]}
          />
        ))}
      </View>

      {error ? (
        <Txt variant="bodySmall" color={t.colors.error} style={{ marginTop: 10 }}>
          {error}
        </Txt>
      ) : null}

      <View style={{ height: spacing.xl }} />
      <PrimaryButton label="Verify" loading={loading} disabled={code.length < LEN} onPress={verify} />
      <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <Txt tone="secondary">
          Didn't receive it?{'  '}
          <Txt variant="titleSmall" color={t.colors.primary}>
            Resend in 0:42
          </Txt>
        </Txt>
      </View>
    </AuthScaffold>
  );
}
