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

/** All-black splash: the big Elizade wordmark scales in, a car drives across a
 *  yellow "road", then it routes to onboarding. */
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
        <Image source={require('../assets/elizade-logo.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(600).duration(600)}>
        <Txt variant="bodyLarge" color="rgba(255,255,255,0.85)" style={{ marginTop: 8, letterSpacing: 0.5 }}>
          Drive the Extraordinary
        </Txt>
      </Animated.View>

      <View style={styles.silhouette}>
        <Animated.View style={carStyle}>
          <MaterialCommunityIcons name="car-sports" size={46} color="rgba(255,255,255,0.95)" />
        </Animated.View>
        <View style={styles.roadTrack}>
          <Animated.View style={[styles.roadFill, roadStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  logo: { width: 320, height: 150 },
  silhouette: { width: 240, marginTop: 56, alignItems: 'center' },
  roadTrack: {
    height: 4,
    width: '100%',
    marginTop: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  roadFill: { height: 4, backgroundColor: brand.accent, borderRadius: 4 },
});
