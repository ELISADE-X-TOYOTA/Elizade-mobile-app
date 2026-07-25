import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import Animated, {
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextField } from '../../src/components/AppTextField';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Txt } from '../../src/components/Txt';
import { APP } from '../../src/constants/app';
import { requestOtp, verifyOtp } from '../../src/data/authRepository';
import { useStore } from '../../src/store/useStore';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { cleanEmail, cleanName, cleanPhone, isValidEmail, isValidName } from '../../src/utils/sanitize';

/**
 * Offline-demo code, used ONLY when running against mock data in a dev build.
 * SECURITY: gated on `__DEV__ && APP.useMock` so no client-side bypass and no
 * hint text can ever ship in a production binary — release builds always
 * verify the code server-side.
 */
const DEMO_MODE = __DEV__ && APP.useMock;
const DEMO_OTP = '123456';

type Step = 'name' | 'email' | 'phone' | 'otp';
const ORDER: Step[] = ['name', 'email', 'phone', 'otp'];

/** Multi-step registration wizard with a progress bar. */
export default function Register() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [otpError, setOtpError] = useState(false);
  const [done, setDone] = useState(false);

  const index = ORDER.indexOf(step);
  const joinedCode = code.join('');

  // Animated progress fill.
  const progress = useSharedValue(0.25);
  useEffect(() => {
    progress.value = withTiming((index + 1) / ORDER.length, { duration: 350 });
  }, [index, progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  // Shake on invalid OTP.
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const shake = () =>
    (shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    ));

  const goBack = () => {
    setError(undefined);
    if (index > 0) setStep(ORDER[index - 1]);
    else router.canGoBack() ? router.back() : router.replace('/(auth)/login');
  };

  // Android hardware back → step backward instead of leaving the flow.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (done) return false;
      if (index > 0) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  });

  const firstName = name.split(' ')[0];
  const lastName = name.split(' ').slice(1).join(' ');

  const next = async () => {
    setError(undefined);
    switch (step) {
      case 'name':
        if (!isValidName(name)) return setError('Please enter your full name');
        return setStep('email');
      case 'email':
        if (!isValidEmail(email)) return setError('Enter a valid email');
        return setStep('phone');
      case 'phone': {
        // Request a one-time code (sent to the phone by the backend).
        setLoading(true);
        try {
          await requestOtp({ phone, email, purpose: 'register', firstName, lastName });
          setStep('otp');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not send code');
        } finally {
          setLoading(false);
        }
        return;
      }
      case 'otp': {
        if (joinedCode.length < 6) return;
        setLoading(true);
        try {
          // In mock mode, demonstrate the invalid-code path locally.
          if (DEMO_MODE && joinedCode !== DEMO_OTP) throw new Error('invalid');
          const user = await verifyOtp({
            phone,
            email,
            code: joinedCode,
            profile: { firstName, lastName, email, phone },
          });
          setCurrentUser(user);
          setDone(true);
        } catch {
          setOtpError(true);
          shake();
        } finally {
          setLoading(false);
        }
        return;
      }
    }
  };

  if (done) {
    return <Success firstName={name.split(' ')[0] || 'there'} onDone={() => router.replace('/(tabs)/home')} />;
  }

  const ctaLabel =
    step === 'otp' ? 'Verify & Create Account' : step === 'phone' ? 'Continue' : 'Continue';
  const ctaDisabled =
    (step === 'name' && !isValidName(name)) ||
    (step === 'email' && !isValidEmail(email)) ||
    (step === 'otp' && joinedCode.length < 6);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header: back + progress */}
        <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
          <Pressable
            onPress={goBack}
            style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
          >
            <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
          </Pressable>

          <View style={{ marginTop: spacing.lg }}>
            <View style={[styles.track, { backgroundColor: t.colors.surfaceAlt }]}>
              <Animated.View style={fillStyle}>
                <LinearGradient
                  colors={t.gradients.accent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.fill}
                />
              </Animated.View>
            </View>
            <Txt variant="labelSmall" tone="secondary" style={{ marginTop: 8 }}>
              Step {index + 1} of {ORDER.length}
            </Txt>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.screenH, paddingTop: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View key={step} entering={FadeInRight.duration(280)}>
            {step === 'name' && (
              <StepBody
                title="What's your name?"
                subtitle="Tell us who you are so we can personalise your Elizade experience."
              >
                <AppTextField
                  label="Full Name"
                  placeholder="John Adewale"
                  icon="person-outline"
                  value={name}
                  onChangeText={setName}
                  sanitize={cleanName}
                  maxLength={80}
                  autoCapitalize="words"
                  error={error}
                />
              </StepBody>
            )}

            {step === 'email' && (
              <StepBody title="Your email address" subtitle="We'll send a one-time code here to verify it's you.">
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
              </StepBody>
            )}

            {step === 'phone' && (
              <StepBody
                title="Phone number"
                subtitle="Optional — we'll use it for booking updates and pickup coordination."
              >
                <AppTextField
                  label="Phone (optional)"
                  placeholder="+234 800 000 0000"
                  icon="call-outline"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  sanitize={cleanPhone}
                  maxLength={16}
                />
                <Pressable onPress={next} style={{ alignSelf: 'flex-start', marginTop: spacing.md }}>
                  <Txt variant="titleSmall" color={t.colors.primary}>
                    Skip for now
                  </Txt>
                </Pressable>
              </StepBody>
            )}

            {step === 'otp' && (
              <StepBody title="Verify your email" subtitle={`Enter the 6-digit code we sent to ${email}.`}>
                <Animated.View style={shakeStyle}>
                  <OtpBoxes
                    value={code}
                    onChange={(v) => {
                      setCode(v);
                      setOtpError(false);
                    }}
                    error={otpError}
                  />
                </Animated.View>
                {otpError ? (
                  <Txt variant="bodySmall" color={t.colors.error} style={{ marginTop: 10 }}>
                    That code isn't right. Please try again.
                  </Txt>
                ) : DEMO_MODE ? (
                  <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: 10 }}>
                    Demo code: {DEMO_OTP}
                  </Txt>
                ) : null}
                <Pressable style={{ marginTop: spacing.md }}>
                  <Txt tone="secondary">
                    Didn't get it?{'  '}
                    <Txt variant="titleSmall" color={t.colors.primary}>
                      Resend code
                    </Txt>
                  </Txt>
                </Pressable>
              </StepBody>
            )}
          </Animated.View>
        </ScrollView>

        {/* Footer CTA */}
        <View style={{ paddingHorizontal: spacing.screenH, paddingBottom: insets.bottom + spacing.md }}>
          <PrimaryButton label={ctaLabel} loading={loading} disabled={ctaDisabled} onPress={next} />
          {step === 'name' && (
            <Pressable onPress={() => router.replace('/(auth)/login')} style={{ marginTop: spacing.md, alignItems: 'center' }}>
              <Txt tone="secondary">
                Already have an account?{'  '}
                <Txt variant="titleSmall" color={t.colors.primary}>
                  Login
                </Txt>
              </Txt>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function StepBody({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View>
      <Txt variant="headlineMedium">{title}</Txt>
      <Txt variant="bodyLarge" tone="secondary" style={{ marginTop: spacing.xs, marginBottom: spacing.xl }}>
        {subtitle}
      </Txt>
      {children}
    </View>
  );
}

function OtpBoxes({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  error?: boolean;
}) {
  const t = useTheme();
  const refs = useRef<(TextInput | null)[]>([]);

  const set = (i: number, v: string) => {
    const clean = v.replace(/[^0-9]/g, '').slice(-1);
    const nextVal = [...value];
    nextVal[i] = clean;
    onChange(nextVal);
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {value.map((d, i) => (
        <TextInput
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChangeText={(v) => set(i, v)}
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
  );
}

function Success({ firstName, onDone }: { firstName: string; onDone: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background, paddingHorizontal: spacing.screenH }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          entering={ZoomIn.duration(500)}
          style={[styles.successIcon, { backgroundColor: t.colors.success + '1F' }]}
        >
          <Ionicons name="checkmark-circle" size={72} color={t.colors.success} />
        </Animated.View>
        <Txt variant="headlineLarge" center style={{ marginTop: spacing.xl }}>
          You're all set, {firstName}!
        </Txt>
        <Txt variant="bodyLarge" tone="secondary" center style={{ marginTop: spacing.sm }}>
          Your Elizade account is verified and ready. Time to find your next ride.
        </Txt>
      </View>
      <View style={{ paddingBottom: insets.bottom + spacing.md }}>
        <PrimaryButton label="Get Started" icon="arrow-forward" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  successIcon: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
});
