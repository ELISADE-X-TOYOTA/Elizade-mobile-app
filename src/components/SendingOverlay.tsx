import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';
import { solid } from '../theme/colors';

interface Props {
  visible: boolean;
  /** Address the code is going to, echoed back for reassurance. */
  email?: string;
  message?: string;
}

/**
 * Full-screen "sending your code" animation.
 *
 * The Elizade mark pulses inside an expanding halo while an envelope drifts
 * upward — a deliberate beat that covers the request latency and makes the
 * hand-off to the OTP screen feel intentional rather than abrupt.
 *
 * All animation runs on the UI thread via Reanimated, so it stays smooth even
 * while JS is busy parsing the response.
 */
export function SendingOverlay({ visible, email, message = 'Sending your code' }: Props) {
  const t = useTheme();

  const pulse = useSharedValue(1);
  const halo = useSharedValue(0);
  const mail = useSharedValue(0);
  const dots = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      // Reset so a second send replays from the start.
      cancelAnimation(pulse);
      cancelAnimation(halo);
      cancelAnimation(mail);
      cancelAnimation(dots);
      pulse.value = 1;
      halo.value = 0;
      mail.value = 0;
      dots.value = 0;
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 620, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 620, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );

    halo.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false);

    // Envelope lifts off and fades, on a slight delay behind the halo.
    mail.value = withDelay(
      250,
      withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }), -1, false),
    );

    dots.value = withRepeat(withTiming(3, { duration: 1200, easing: Easing.linear }), -1, false);
  }, [visible, pulse, halo, mail, dots]);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + halo.value * 0.9 }],
    opacity: (1 - halo.value) * 0.5,
  }));

  const mailStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -mail.value * 46 }, { scale: 0.85 + mail.value * 0.2 }],
    opacity: mail.value < 0.15 ? mail.value / 0.15 : 1 - (mail.value - 0.15) / 0.85,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: t.colors.background }]}>
        <Animated.View entering={FadeIn.duration(220)} style={styles.stage}>
          {/* Expanding halo behind the mark */}
          <Animated.View
            style={[styles.halo, { borderColor: solid(t.colors.accent) }, haloStyle]}
            pointerEvents="none"
          />

          {/* Envelope drifting up out of the mark */}
          <Animated.View style={[styles.mail, mailStyle]} pointerEvents="none">
            <Ionicons name="mail" size={26} color={t.colors.accentText} />
          </Animated.View>

          {/*
            No backdrop container — the mark sits directly on the screen inside
            the halo. `elizade-wordmark.png` is the alpha-cut asset, so nothing
            boxes it in; `elizade-logo.png` is a JPEG (no alpha) and would
            reintroduce a black block here.
          */}
          <Animated.View style={[styles.logoWrap, logoStyle]}>
            <Image
              source={require('../../assets/elizade-wordmark.png')}
              style={styles.logo}
              contentFit="contain"
              transition={0}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).duration(400)} style={styles.copy}>
          <Txt variant="headlineSmall" center>
            {message}
          </Txt>
          {email ? (
            <Txt tone="secondary" center style={{ marginTop: 6 }} numberOfLines={1}>
              to {email}
            </Txt>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Diameter of the expanding halo ring. */
const HALO = 150;
/**
 * Wordmark width. The asset is now cropped to the glyphs, so this is the mark's
 * real on-screen width — unlike the old square logo, where `contain` fitted the
 * 1024×1024 canvas and rendered the wordmark itself at roughly 22px across.
 */
const MARK_W = 132;
/** Intrinsic aspect of elizade-wordmark.png (442×143). */
const MARK_ASPECT = 442 / 143;

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.screenH },
  stage: { width: HALO, height: HALO, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    borderWidth: 2,
  },
  // Sizing/animation wrapper only — no fill, no clipping.
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: MARK_W, aspectRatio: MARK_ASPECT },
  mail: { position: 'absolute', top: -14 },
  copy: { marginTop: spacing.xxl, alignItems: 'center' },
});
