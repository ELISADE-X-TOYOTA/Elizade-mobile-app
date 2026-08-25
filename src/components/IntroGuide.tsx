import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './PrimaryButton';
import { Txt } from './Txt';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

/** Three slides covering what the app is for — kept short and concrete. */
const SLIDES: Slide[] = [
  {
    icon: 'car-sport',
    title: 'Discover Vehicles',
    body: 'Browse verified new Toyota, Jetour and JAC vehicles from Elizade showrooms, with full specs, photos and pricing.',
  },
  {
    icon: 'search',
    title: 'Smart Search & Filters',
    body: 'Search by make, model or city, then filter by fuel type, transmission or budget to find the right car fast.',
  },
  {
    icon: 'person-circle',
    title: 'Manage Bookings & Profile',
    body: 'Book test drives and services, track them live, and manage your vehicles, warranty and profile in one place.',
  },
];

/**
 * First-run intro guide: a centred, swipeable card carousel.
 *
 * Deliberately a standard walkthrough rather than a spotlight tour — it does
 * not measure or point at live UI, so it can't drift out of alignment when the
 * dashboard layout changes, and it reads consistently on every screen size.
 *
 * Shown once per account; see `onboardedUserIds` in the store.
 */
export function IntroGuide({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { width: screenW } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  // Card spans the screen minus the page gutter; each slide matches that width
  // so paging lands cleanly on a slide boundary.
  const cardW = Math.min(screenW - spacing.screenH * 2, 420);
  const slideW = cardW - spacing.lg * 2;

  const isLast = index === SLIDES.length - 1;

  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(i, SLIDES.length - 1));
      scrollRef.current?.scrollTo({ x: next * slideW, animated: true });
      setIndex(next);
    },
    [slideW],
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / slideW));
  };

  const finish = () => {
    setIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    onDone();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={finish}>
      <View style={styles.backdrop}>
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={[styles.card, { width: cardW, backgroundColor: t.colors.surface }, t.shadows.elevated]}
        >
          {/* Skip stays available on every slide */}
          <View style={styles.topRow}>
            <Txt variant="labelSmall" tone="tertiary">
              {index + 1} OF {SLIDES.length}
            </Txt>
            <Pressable onPress={finish} hitSlop={10} accessibilityLabel={tr('onboarding.skipIntro')}>
              <Txt variant="titleSmall" tone="secondary">{tr('common.skip')}</Txt>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            // Snap to the slide width, which is narrower than the screen.
            snapToInterval={slideW}
            decelerationRate="fast"
            style={{ width: slideW }}
          >
            {SLIDES.map((s) => (
              <View key={s.title} style={{ width: slideW, alignItems: 'center' }}>
                <LinearGradient colors={t.gradients.accent} style={styles.art}>
                  <Ionicons name={s.icon} size={52} color={t.colors.onAccent} />
                </LinearGradient>

                <Txt variant="headlineSmall" center style={{ marginTop: spacing.lg }}>
                  {s.title}
                </Txt>
                <Txt tone="secondary" center style={{ marginTop: spacing.xs }}>
                  {s.body}
                </Txt>
              </View>
            ))}
          </ScrollView>

          {/* Tappable step indicators */}
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <Pressable
                key={s.title}
                onPress={() => goTo(i)}
                hitSlop={8}
                accessibilityLabel={`Go to step ${i + 1}`}
              >
                <Animated.View
                  key={`dot-${i}-${index === i}`}
                  entering={FadeIn.duration(160)}
                  style={[
                    styles.dot,
                    {
                      width: i === index ? 22 : 7,
                      backgroundColor: i === index ? t.colors.primary : t.colors.border,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>

          <PrimaryButton
            label={isLast ? 'Get Started' : 'Next'}
            icon={isLast ? 'checkmark' : 'arrow-forward'}
            onPress={() => (isLast ? finish() : goTo(index + 1))}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenH,
  },
  card: { borderRadius: radius.xl, padding: spacing.lg },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  art: { width: 108, height: 108, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginVertical: spacing.lg,
  },
  dot: { height: 7, borderRadius: 4 },
});
