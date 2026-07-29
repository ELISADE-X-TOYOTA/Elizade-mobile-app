import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './PrimaryButton';
import { Txt } from './Txt';

interface Step {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  /** Roughly where the feature sits, so the highlight ring points at it. */
  anchor: 'top-left' | 'top-right' | 'search' | 'bottom';
}

const STEPS: Step[] = [
  {
    icon: 'search',
    title: 'Find your next Toyota',
    body: 'Search by make, model or location, and use filters to narrow by fuel type, transmission or budget.',
    anchor: 'search',
  },
  {
    icon: 'car-sport',
    title: 'Browse the showroom',
    body: 'Tap any vehicle for full specs, then book a test drive, reserve it, or request a quote.',
    anchor: 'bottom',
  },
  {
    icon: 'construct',
    title: 'Service & warranty',
    body: 'Book a service, track it live, view your warranty and get recall alerts — all from the tabs below.',
    anchor: 'bottom',
  },
  {
    icon: 'person-circle',
    title: 'Your profile & garage',
    body: 'Tap your avatar any time to reach your profile, add a photo, and manage the vehicles you own.',
    anchor: 'top-left',
  },
  {
    icon: 'notifications',
    title: 'Stay in the loop',
    body: 'The bell shows service reminders, recall notices and replies from our team.',
    anchor: 'top-right',
  },
];

/**
 * First-run walkthrough of the dashboard.
 *
 * A spotlight ring is positioned near the feature each step describes rather
 * than measuring real layout — it survives screen-size changes and never
 * mis-points if the header reflows. Shown once; see `hasCompletedOnboarding`.
 */
export function OnboardingTour({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const next = () => (isLast ? onDone() : setIndex((i) => i + 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdrop}>
        {/* Spotlight ring near the feature being described */}
        <Animated.View
          key={`ring-${index}`}
          entering={FadeIn.duration(260)}
          style={[styles.ring, ringPosition(step.anchor, insets.top), { borderColor: t.colors.accent }]}
          pointerEvents="none"
        />

        <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Animated.View
            key={`card-${index}`}
            entering={FadeInRight.duration(280)}
            style={[styles.card, { backgroundColor: t.colors.surface }]}
          >
            <View style={styles.headRow}>
              <LinearGradient colors={t.gradients.accent} style={styles.iconWrap}>
                <Ionicons name={step.icon} size={24} color={t.colors.onAccent} />
              </LinearGradient>
              <Pressable onPress={onDone} hitSlop={10} accessibilityLabel="Skip tour">
                <Txt variant="titleSmall" tone="secondary">
                  Skip
                </Txt>
              </Pressable>
            </View>

            <Txt variant="headlineSmall" style={{ marginTop: spacing.md }}>
              {step.title}
            </Txt>
            <Txt tone="secondary" style={{ marginTop: 6 }}>
              {step.body}
            </Txt>

            <View style={styles.footer}>
              <View style={styles.dots}>
                {STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        width: i === index ? 20 : 7,
                        backgroundColor: i === index ? t.colors.primary : t.colors.border,
                      },
                    ]}
                  />
                ))}
              </View>
              <Txt variant="labelSmall" tone="tertiary">
                {index + 1} of {STEPS.length}
              </Txt>
            </View>

            <View style={{ height: spacing.md }} />
            <PrimaryButton
              label={isLast ? "Got it — let's go" : 'Next'}
              icon={isLast ? 'checkmark' : 'arrow-forward'}
              onPress={next}
            />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

/** Approximate on-screen position of each anchor. */
function ringPosition(anchor: Step['anchor'], topInset: number) {
  switch (anchor) {
    case 'top-left':
      return { top: topInset + 6, left: spacing.screenH - 8, width: 64, height: 64, borderRadius: 32 };
    case 'top-right':
      return { top: topInset + 6, right: spacing.screenH - 8, width: 62, height: 62, borderRadius: 31 };
    case 'search':
      return {
        top: topInset + 78,
        left: spacing.screenH - 6,
        right: spacing.screenH - 6,
        height: 70,
        borderRadius: radius.lg,
      };
    default:
      return { bottom: 78, left: 10, right: 10, height: 74, borderRadius: radius.pill };
  }
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  ring: { position: 'absolute', borderWidth: 2.5 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.screenH },
  card: { borderRadius: radius.xl, padding: spacing.lg },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 7, borderRadius: 4 },
});
