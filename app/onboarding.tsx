import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Txt } from '../src/components/Txt';
import { spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';

const { width } = Dimensions.get('window');

/**
 * The three pillars of Elizade Connect — Shop, Service, Ownership. Icons match
 * the tabs each slide introduces, so onboarding previews the real navigation.
 */
const SLIDES = [
  {
    icon: 'car-sport' as const,
    headline: 'Find Your Next Toyota',
    description: 'Browse verified new Toyota, Jetour & JAC vehicles from Elizade showrooms.',
  },
  {
    icon: 'construct' as const,
    headline: 'Service Made Simple',
    description: 'Book, track and get reminders for every service at any Elizade centre.',
  },
  {
    icon: 'shield-checkmark' as const,
    headline: 'Own With Confidence',
    description: 'Digital warranty, recalls and support in one place.',
  },
];

export default function Onboarding() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const isLast = page === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  const next = () => {
    if (isLast) router.replace('/(auth)/register');
    else ref.current?.scrollTo({ x: width * (page + 1), animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingTop: insets.top }}>
      <Pressable
        onPress={() => router.replace('/(auth)/login')}
        style={{ alignSelf: 'flex-end', padding: spacing.md }}
      >
        <Txt variant="titleSmall" tone="secondary">{tr('common.skip')}</Txt>
      </Pressable>

      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <View key={s.headline} style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
            <LinearGradient colors={t.gradients.accent} style={styles.art}>
              <View style={styles.artDot} />
              <Ionicons name={s.icon} size={96} color={t.colors.onAccent} />
            </LinearGradient>
            <Txt variant="headlineLarge" center style={{ marginTop: spacing.xxxl }}>
              {s.headline}
            </Txt>
            <Txt variant="bodyLarge" tone="secondary" center style={{ marginTop: spacing.md }}>
              {s.description}
            </Txt>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.screenH, paddingBottom: insets.bottom + spacing.xl }}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === page ? 26 : 8,
                  backgroundColor: i === page ? t.colors.primary : t.colors.border,
                },
              ]}
            />
          ))}
        </View>
        <View style={{ height: spacing.xl }} />
        <PrimaryButton
          label={isLast ? 'Create Account' : 'Get Started'}
          icon={isLast ? 'person-add' : undefined}
          variant="accent"
          onPress={next}
        />
        {isLast ? (
          <Pressable onPress={() => router.replace('/(auth)/login')} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
            <Txt tone="secondary">
              Already have an account?{'  '}
              <Txt variant="titleSmall" color={t.colors.primary}>{tr('auth.login')}</Txt>
            </Txt>
          </Pressable>
        ) : (
          <View style={{ height: 44 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  art: {
    width: 260,
    height: 260,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D89A00',
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
  artDot: {
    position: 'absolute',
    right: 24,
    top: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
