import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeSyntheticEvent, Pressable, TextInput, TextInputKeyPressEventData, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { AuthScaffold } from '../../src/components/AuthScaffold';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Txt } from '../../src/components/Txt';
import { requestOtp, verifyOtp } from '../../src/data/authRepository';
import { useStore } from '../../src/store/useStore';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';

const LEN = 6;
/** Seconds before "Resend code" becomes available again. */
const RESEND_SECONDS = 60;

export default function Otp() {
  const t = useTheme();
  const { email, purpose } = useLocalSearchParams<{ email?: string; purpose?: string }>();
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const inputs = useRef<(TextInput | null)[]>([]);
  /** Guards against the auto-submit firing twice for one completed code. */
  const submitted = useRef(false);
  const code = digits.join('');

  // ── Resend countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  // ── Shake on a rejected code ────────────────────────────────────────
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const verify = useCallback(
    async (fullCode: string) => {
      if (!email) {
        setError('Missing email address. Go back and request a new code.');
        return;
      }
      setLoading(true);
      setError(undefined);
      try {
        const user = await verifyOtp({ email, code: fullCode });
        setCurrentUser(user);
        router.replace('/(tabs)/home');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid or expired code');
        shake();
        // Clear so the next attempt starts fresh, and re-arm auto-submit.
        setDigits(Array(LEN).fill(''));
        submitted.current = false;
        inputs.current[0]?.focus();
      } finally {
        setLoading(false);
      }
    },
    [email, setCurrentUser],
  );

  /**
   * Auto-verify the moment the final digit lands — no manual tap needed.
   * Runs in an effect (not the change handler) so it also fires for an
   * SMS/keyboard autofill that populates every box at once.
   */
  useEffect(() => {
    if (code.length === LEN && !submitted.current && !loading) {
      submitted.current = true;
      verify(code);
    }
  }, [code, loading, verify]);

  const onChange = (i: number, v: string) => {
    const cleaned = v.replace(/[^0-9]/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[i] = '';
      setDigits(next);
      return;
    }

    // Handle a pasted / autofilled block by spreading it across the boxes.
    if (cleaned.length > 1) {
      const next = [...digits];
      for (let k = 0; k < cleaned.length && i + k < LEN; k++) next[i + k] = cleaned[k];
      setDigits(next);
      inputs.current[Math.min(i + cleaned.length, LEN - 1)]?.focus();
      return;
    }

    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);
    if (i < LEN - 1) inputs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const resend = async () => {
    if (secondsLeft > 0 || !email) return;
    setResending(true);
    setError(undefined);
    try {
      await requestOtp({ email, purpose: purpose === 'register' ? 'register' : 'login' });
      setDigits(Array(LEN).fill(''));
      submitted.current = false;
      setSecondsLeft(RESEND_SECONDS);
      inputs.current[0]?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the code');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScaffold
      title="Verify Code"
      subtitle={`Enter the 6-digit code sent to ${email ?? 'your email'}`}
      compactSubtitle
    >
      <Animated.View style={[{ flexDirection: 'row', justifyContent: 'space-between' }, shakeStyle]}>
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
            // One-time-code autofill: iOS reads it from Messages, Android from
            // SMS Retriever — both deliver the whole code to the first box.
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus={i === 0}
            editable={!loading}
            maxLength={i === 0 ? LEN : 1}
            selectTextOnFocus
            accessibilityLabel={`Digit ${i + 1}`}
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
      </Animated.View>

      {error ? (
        <Txt variant="bodySmall" color={t.colors.error} style={{ marginTop: 10 }}>
          {error}
        </Txt>
      ) : (
        <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: 10 }}>
          {loading ? 'Verifying…' : 'Verification starts automatically once all six digits are in.'}
        </Txt>
      )}

      <View style={{ height: spacing.xl }} />
      {/* Kept as an explicit fallback — auto-verify handles the happy path. */}
      <PrimaryButton
        label={loading ? 'Verifying' : 'Verify'}
        loading={loading}
        disabled={code.length < LEN}
        onPress={() => verify(code)}
      />

      <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        {secondsLeft > 0 ? (
          <Txt tone="secondary">
            Didn't receive it?{'  '}
            <Txt variant="titleSmall" tone="tertiary">
              Resend in {mmss}
            </Txt>
          </Txt>
        ) : (
          <Pressable onPress={resend} disabled={resending} hitSlop={8}>
            <Txt tone="secondary">
              Didn't receive it?{'  '}
              <Txt variant="titleSmall" color={t.colors.primary}>
                {resending ? 'Sending…' : 'Resend code'}
              </Txt>
            </Txt>
          </Pressable>
        )}
      </View>
    </AuthScaffold>
  );
}
