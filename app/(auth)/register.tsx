import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import {
  ActivityIndicator,
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
import { SendingOverlay } from '../../src/components/SendingOverlay';
import { Toast, ToastState } from '../../src/components/Toast';
import { Txt } from '../../src/components/Txt';
import { APP } from '../../src/constants/app';
import { requestOtp, verifyOtp } from '../../src/data/authRepository';
import { EmailAvailabilityResult, useEmailAvailability } from '../../src/hooks/useEmailAvailability';
import { useStore } from '../../src/store/useStore';
import { useWatchlistStore } from '../../src/store/useWatchlistStore';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { cleanEmail, cleanName, cleanPhone, isValidEmail, isValidName } from '../../src/utils/sanitize';
import { solid, tint } from '../../src/theme/colors';

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

/** Minimum time the sending animation stays up, so a fast response doesn't flash. */
const MIN_ANIMATION_MS = 1100;

/** OTP length — must match the backend's OTP_LENGTH. */
const LEN = 6;
/** Seconds before "Resend code" becomes available again. */
const RESEND_SECONDS = 60;

/** Multi-step registration wizard with a progress bar. */
export default function Register() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const loadWatchlist = useWatchlistStore((s) => s.load);

  const [step, setStep] = useState<Step>('name');
  // Captured separately rather than splitting one field on a space: that lost
  // the surname for single-word entries and mangled multi-part names.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState<string[]>(Array(LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string>();
  const [otpError, setOtpError] = useState(false);
  const [done, setDone] = useState(false);

  const index = ORDER.indexOf(step);
  const joinedCode = code.join('');
  /** Guards against auto-submit firing twice for one completed code. */
  const submitted = useRef(false);
  const otpBoxesRef = useRef<OtpBoxesHandle>(null);

  // ── Resend countdown (OTP step only) ───────────────────────────────────
  useEffect(() => {
    if (step !== 'otp' || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [step, secondsLeft]);

  const resendMmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

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

  const namesValid = isValidName(firstName) && isValidName(lastName);

  /** Verify the code and finish registration. Shared by auto-submit and the
   *  explicit button, so both paths behave identically. */
  const verifyCode = useCallback(
    async (fullCode: string) => {
      setLoading(true);
      try {
        // In mock mode, demonstrate the invalid-code path locally.
        if (DEMO_MODE && fullCode !== DEMO_OTP) throw new Error('invalid');
        const user = await verifyOtp({
          email,
          code: fullCode,
          profile: { firstName, lastName, email, phone },
        });
        setCurrentUser(user);
        loadWatchlist().catch(() => {});
        setDone(true);
      } catch {
        setOtpError(true);
        shake();
        // Clear so the next attempt starts fresh, and re-arm auto-submit.
        setCode(Array(LEN).fill(''));
        submitted.current = false;
      } finally {
        setLoading(false);
      }
    },
    [email, firstName, lastName, phone, setCurrentUser, loadWatchlist],
  );

  const resend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setResendError(undefined);
    try {
      await requestOtp({ email, purpose: 'register', firstName, lastName, otherName });
      setCode(Array(LEN).fill(''));
      submitted.current = false;
      setOtpError(false);
      setSecondsLeft(RESEND_SECONDS);
      otpBoxesRef.current?.focusFirst();
    } catch (e) {
      setResendError(e instanceof Error ? e.message : 'Could not resend the code');
    } finally {
      setResending(false);
    }
  };

  /**
   * Auto-verify the moment the sixth digit lands — no manual tap needed.
   * Runs in an effect rather than the keystroke handler so it also fires when
   * autofill populates every box at once.
   */
  useEffect(() => {
    if (step === 'otp' && joinedCode.length === LEN && !submitted.current && !loading) {
      submitted.current = true;
      verifyCode(joinedCode);
    }
  }, [step, joinedCode, loading, verifyCode]);
  // Live format + availability check while the user types on the email step.
  const emailCheck = useEmailAvailability(step === 'email' ? email : '');

  const next = async () => {
    setError(undefined);
    switch (step) {
      case 'name':
        if (!isValidName(firstName)) return setError('Please enter your first name');
        if (!isValidName(lastName)) return setError('Please enter your last name');
        return setStep('email');
      case 'email':
        if (!isValidEmail(email)) return setError('Enter a valid email');
        return setStep('phone');
      case 'phone': {
        setSending(true);
        const startedAt = Date.now();
        try {
          await requestOtp({ email, purpose: 'register', firstName, lastName, otherName });
          // Hold the animation briefly so the transition reads as deliberate.
          const elapsed = Date.now() - startedAt;
          if (elapsed < MIN_ANIMATION_MS) {
            await new Promise((r) => setTimeout(r, MIN_ANIMATION_MS - elapsed));
          }
          setSending(false);
          submitted.current = false;
          setSecondsLeft(RESEND_SECONDS);
          setResendError(undefined);
          setStep('otp');
        } catch (e) {
          setSending(false);
          const msg = e instanceof Error ? e.message : 'Could not send code';
          // 409 from the backend: this email is already registered. Informational
          // only — the user is returned to the email step to edit it, so the
          // toast needs no action of its own.
          if (/already exists/i.test(msg)) {
            setToast({
              tone: 'error',
              title: 'This email is already registered',
              message: 'Please use another email or return to login.',
            });
            setStep('email');
          } else {
            setToast({ tone: 'error', title: "Couldn't send your code", message: msg });
          }
        }
        return;
      }
      case 'otp': {
        if (joinedCode.length < LEN) return;
        submitted.current = true;
        await verifyCode(joinedCode);
        return;
      }
    }
  };

  if (done) {
    return <Success firstName={firstName || 'there'} onDone={() => router.replace('/(tabs)/home')} />;
  }

  const ctaLabel =
    step === 'otp' ? 'Verify & Create Account' : step === 'phone' ? 'Continue' : 'Continue';
  const ctaDisabled =
    (step === 'name' && !namesValid) ||
    (step === 'email' && !emailCheck.eligible) ||
    (step === 'otp' && joinedCode.length < LEN);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
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
                title={tr('auth.nameTitle')}
                subtitle={tr('auth.nameSubtitle')}
              >
                <View style={{ gap: spacing.lg }}>
                  <AppTextField
                    label={tr('auth.firstName')}
                    placeholder={tr('auth.firstNamePlaceholder')}
                    icon="person-outline"
                    value={firstName}
                    onChangeText={setFirstName}
                    sanitize={cleanName}
                    maxLength={40}
                    autoCapitalize="words"
                  />
                  <AppTextField
                    label={tr('auth.lastName')}
                    placeholder={tr('auth.lastNamePlaceholder')}
                    icon="person-outline"
                    value={lastName}
                    onChangeText={setLastName}
                    sanitize={cleanName}
                    maxLength={40}
                    autoCapitalize="words"
                    error={error}
                  />
                  <AppTextField
                    label={tr('auth.otherName')}
                    placeholder={tr('auth.middleName')}
                    icon="person-outline"
                    value={otherName}
                    onChangeText={setOtherName}
                    sanitize={cleanName}
                    maxLength={40}
                    autoCapitalize="words"
                  />
                </View>
              </StepBody>
            )}

            {step === 'email' && (
              <StepBody title={tr('auth.emailTitle')} subtitle={tr('auth.emailSubtitle')}>
                <AppTextField
                  label={tr('auth.email')}
                  placeholder={tr('auth.emailPlaceholder')}
                  icon="mail-outline"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  sanitize={cleanEmail}
                  maxLength={254}
                  error={emailCheck.status === 'taken' ? emailCheck.reason ?? tr('auth.alreadyRegistered') : error}
                />
                <EmailStatusHint check={emailCheck} />
              </StepBody>
            )}

            {step === 'phone' && (
              <StepBody
                title={tr('auth.phoneTitle')}
                subtitle={tr('auth.phoneSubtitle')}
              >
                <AppTextField
                  label={tr('auth.phoneOptional')}
                  placeholder={tr('auth.phonePlaceholder')}
                  icon="call-outline"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  sanitize={cleanPhone}
                  maxLength={16}
                />
                <Pressable onPress={next} style={{ alignSelf: 'flex-start', marginTop: spacing.md }}>
                  <Txt variant="titleSmall" color={t.colors.primary}>{tr('auth.skipForNow')}</Txt>
                </Pressable>
              </StepBody>
            )}

            {step === 'otp' && (
              <StepBody title={tr('auth.verifyEmailTitle')} subtitle={tr('auth.verifyEmailSubtitle', { email })}>
                <Animated.View style={shakeStyle}>
                  <OtpBoxes
                    ref={otpBoxesRef}
                    value={code}
                    onChange={(v) => {
                      setCode(v);
                      setOtpError(false);
                    }}
                    error={otpError}
                    disabled={loading}
                  />
                </Animated.View>
                {otpError ? (
                  <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: 10 }}>{tr('auth.codeWrong')}</Txt>
                ) : resendError ? (
                  <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: 10 }}>
                    {resendError}
                  </Txt>
                ) : (
                  <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: 10 }}>
                    {loading
                      ? 'Verifying…'
                      : DEMO_MODE
                        ? `Demo code: ${DEMO_OTP}`
                        : 'Verification starts automatically once all six digits are in.'}
                  </Txt>
                )}
                <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
                  {secondsLeft > 0 ? (
                    <Txt tone="secondary">
                      Didn't get it?{'  '}
                      <Txt variant="titleSmall" tone="tertiary">
                        Resend in {resendMmss}
                      </Txt>
                    </Txt>
                  ) : (
                    <Pressable onPress={resend} disabled={resending} hitSlop={8}>
                      <Txt tone="secondary">
                        Didn't get it?{'  '}
                        <Txt variant="titleSmall" color={t.colors.accentText}>
                          {resending ? 'Sending…' : 'Resend code'}
                        </Txt>
                      </Txt>
                    </Pressable>
                  )}
                </View>
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
                <Txt variant="titleSmall" color={t.colors.accentText}>{tr('auth.login')}</Txt>
              </Txt>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      <SendingOverlay visible={sending} email={email} />
      <Toast
        visible={!!toast}
        tone={toast?.tone}
        title={toast?.title ?? ''}
        message={toast?.message}
        onDismiss={() => setToast(null)}
      />
    </View>
  );
}

/** Live feedback under the email field: checking / available / taken. */
function EmailStatusHint({ check }: { check: EmailAvailabilityResult }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  // 'taken' is already surfaced as the field's error, and 'invalid' is left
  // silent so it doesn't nag mid-typing.
  if (check.status === 'checking') {
    return (
      <View style={styles.hintRow}>
        <ActivityIndicator size="small" color={t.colors.textSecondary} />
        <Txt variant="bodySmall" tone="secondary" style={{ marginLeft: 8 }}>{tr('auth.checkingAvailability')}</Txt>
      </View>
    );
  }
  if (check.status === 'available') {
    return (
      <View style={styles.hintRow}>
        <Ionicons name="checkmark-circle" size={16} color={t.colors.successText} />
        <Txt variant="bodySmall" color={t.colors.successText} style={{ marginLeft: 6 }}>{tr('auth.emailAvailable')}</Txt>
      </View>
    );
  }
  return null;
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

export type OtpBoxesHandle = { focusFirst: () => void };

const OtpBoxes = forwardRef<
  OtpBoxesHandle,
  {
    value: string[];
    onChange: (v: string[]) => void;
    error?: boolean;
    disabled?: boolean;
  }
>(function OtpBoxes({ value, onChange, error, disabled }, ref) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const refs = useRef<(TextInput | null)[]>([]);

  useImperativeHandle(ref, () => ({
    focusFirst: () => refs.current[0]?.focus(),
  }));

  const set = (i: number, v: string) => {
    const cleaned = v.replace(/[^0-9]/g, '');
    if (!cleaned) {
      const nextVal = [...value];
      nextVal[i] = '';
      onChange(nextVal);
      return;
    }

    // A pasted or autofilled block arrives in one box — spread it across the
    // rest, otherwise the code would be truncated to a single digit.
    if (cleaned.length > 1) {
      const nextVal = [...value];
      for (let k = 0; k < cleaned.length && i + k < LEN; k++) nextVal[i + k] = cleaned[k];
      onChange(nextVal);
      refs.current[Math.min(i + cleaned.length, LEN - 1)]?.focus();
      return;
    }

    const nextVal = [...value];
    nextVal[i] = cleaned;
    onChange(nextVal);
    if (i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {value.map((d, i) => (
        <TextInput
          // iOS renders a LIGHT keyboard in dark mode without this.
          keyboardAppearance={t.isDark ? 'dark' : 'light'}
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChangeText={(v) => set(i, v)}
          onKeyPress={(e) => onKey(i, e)}
          keyboardType="number-pad"
          // One-time-code autofill: iOS reads it from Messages, Android from
          // SMS Retriever — both deliver the whole code to the first box.
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus={i === 0}
          editable={!disabled}
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
              borderColor: error ? solid(t.colors.error) : d ? t.colors.primary : t.colors.border,
              backgroundColor: d ? t.colors.primary + '14' : t.colors.surfaceAlt,
            },
          ]}
        />
      ))}
    </View>
  );
});

function Success({ firstName, onDone }: { firstName: string; onDone: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingHorizontal: spacing.screenH }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          entering={ZoomIn.duration(500)}
          style={[styles.successIcon, { backgroundColor: tint(t.colors.success, 0.12) }]}
        >
          <Ionicons name="checkmark-circle" size={72} color={t.colors.successText} />
        </Animated.View>
        <Txt variant="headlineLarge" center style={{ marginTop: spacing.xl }}>
          You're all set, {firstName}!
        </Txt>
        <Txt variant="bodyLarge" tone="secondary" center style={{ marginTop: spacing.sm }}>{tr('auth.accountReady')}</Txt>
      </View>
      <View style={{ paddingBottom: insets.bottom + spacing.md }}>
        <PrimaryButton label={tr('auth.getStarted')} icon="arrow-forward" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hintRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, minHeight: 20 },
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
