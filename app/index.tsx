import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Txt } from '../src/components/Txt';
import { brand } from '../src/theme/colors';

/**
 * All-black launch screen for Elizade Connect.
 *
 * Identity per the platform concept: the official digital home for every
 * Elizade customer — buying, owning and servicing a vehicle. The wordmark is
 * completed by "CONNECT", the three pillars sit under it, and the authorised
 * marques are credited at the foot. A car drives across a yellow road while
 * the app boots, then it routes to onboarding.
 */
export default function Splash() {
  const scale = useSharedValue(0.7);
  const road = useSharedValue(0);
  const carX = useSharedValue(-120);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 700 });
    carX.value = withDelay(700, withTiming(0, { duration: 900 }));
    road.value = withDelay(700, withTiming(1, { duration: 1000 }));
    const timer = setTimeout(() => router.replace('/onboarding'), 2600);
    return () => clearTimeout(timer);
  }, [scale, road, carX]);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const carStyle = useAnimatedStyle(() => ({ transform: [{ translateX: carX.value }] }));
  const roadStyle = useAnimatedStyle(() => ({ width: `${road.value * 100}%` }));

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(500)} style={logoStyle}>
        <Image source={require('../assets/elizade-wordmark.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      {/* Completes the platform wordmark: Elizade → CONNECT */}
      <Animated.View entering={FadeIn.delay(450).duration(600)}>
        <Txt variant="titleMedium" color={brand.accent} style={styles.connect}>
          CONNECT
        </Txt>
      </Animated.View>

      {/* The three pillars of the platform */}
      <Animated.View entering={FadeInUp.delay(700).duration(600)}>
        <Txt variant="bodyLarge" color="rgba(255,255,255,0.85)" style={styles.tagline}>
          Buy · Own · Service
        </Txt>
      </Animated.View>

      <View style={styles.silhouette}>
        <Animated.View style={carStyle}>
          <MaterialCommunityIcons name="car-side" size={46} color="rgba(255,255,255,0.95)" />
        </Animated.View>
        <View style={styles.roadTrack}>
          <Animated.View style={[styles.roadFill, roadStyle]} />
        </View>
      </View>

      {/* Authorised marques — grounds the app in the real dealership */}
      <Animated.View entering={FadeIn.delay(1300).duration(700)} style={styles.footer}>
        <Txt variant="labelSmall" color="rgba(255,255,255,0.5)" style={styles.marques}>
          TOYOTA · JETOUR · JAC
        </Txt>
        <Txt variant="labelSmall" color="rgba(255,255,255,0.32)" style={styles.authorised}>
          Authorised Distributor · Elizade Nigeria Limited
        </Txt>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  // Cropped transparent wordmark (442x143) — height follows the intrinsic
  // aspect so the mark fills the width instead of being letterboxed inside a
  // square canvas the way the old logo asset was.
  logo: { width: 300, aspectRatio: 442 / 143 },
  connect: { letterSpacing: 8, marginTop: -6 },
  tagline: { marginTop: 14, letterSpacing: 0.5 },
  silhouette: { width: 240, marginTop: 48, alignItems: 'center' },
  roadTrack: {
    height: 4,
    width: '100%',
    marginTop: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  roadFill: { height: 4, backgroundColor: brand.accent, borderRadius: 4 },
  footer: { position: 'absolute', bottom: 48, alignItems: 'center' },
  marques: { letterSpacing: 2.5 },
  authorised: { marginTop: 6, letterSpacing: 0.3 },
});
