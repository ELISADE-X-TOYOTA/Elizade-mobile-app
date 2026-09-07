import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMPARE_LIMIT, CompareEntry, useStore } from '../store/useStore';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { priceCompact } from '../utils/format';
import { trayBottomOffset } from '../utils/trayLayout';
import { Txt } from './Txt';
import { solid } from '../theme/colors';

/**
 * Routes that own a comparison flow. The tray is mounted once at the root so a
 * selection survives navigating from the grid into a car's details, but it must
 * not follow the user into Service, Support or Profile — a dock hovering over
 * an unrelated screen is clutter, and on tab screens it would also cover the
 * tab bar's own controls.
 */
function isShowroomRoute(path: string): boolean {
  // `/compare` is excluded on purpose: that screen shows both vehicles in
  // full, so a dock repeating them would only steal room from the matrix.
  return path === '/shop' || path.startsWith('/car/');
}

export function CompareTray() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const compare = useStore((s) => s.compare);
  const removeFromCompare = useStore((s) => s.removeFromCompare);
  const clearCompare = useStore((s) => s.clearCompare);
  const swapNotice = useStore((s) => s.swapNotice);
  const dismissSwapNotice = useStore((s) => s.dismissSwapNotice);
  const stickyBarHeight = useStore((s) => s.stickyBarHeight);

  // Above the early return — hooks must run on every render.
  useEffect(() => {
    if (!swapNotice) return;
    const id = setTimeout(dismissSwapNotice, 2600);
    return () => clearTimeout(id);
  }, [swapNotice, dismissSwapNotice]);

  if (!isShowroomRoute(pathname) || compare.length === 0) return null;

  const onTabScreen = pathname === '/shop';
  /*
    What the tray has to clear differs by screen: the floating tab bar in the
    grid, and a car's own sticky action bar on its details page — which the
    tray used to sit on top of, putting Reserve and Test Drive underneath the
    dock. The arithmetic lives in `trayLayout` because it is pure, easy to get
    wrong by an invisible ~34pt, and impossible to catch with a typecheck.
  */
  const bottom = trayBottomOffset({
    onTabScreen,
    safeAreaBottom: insets.bottom,
    stickyBarHeight,
  });
  const ready = compare.length === COMPARE_LIMIT;

  return (
    <Animated.View
      entering={SlideInDown.duration(260)}
      exiting={SlideOutDown.duration(200)}
      style={[styles.wrap, { bottom }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.tray,
          { backgroundColor: t.colors.surface, borderColor: t.colors.border },
          t.shadows.elevated,
        ]}
      >
        <View style={styles.header}>
          <Ionicons
            name={swapNotice ? 'swap-horizontal' : 'git-compare-outline'}
            size={16}
            // Sits on `surface` — white in light mode, where the brand gold is
            // 1.85:1. `accentText` is the readable counterpart.
            color={t.colors.accentText}
          />
          <Txt variant="labelSmall" tone="secondary" style={{ flex: 1, marginLeft: 6 }} numberOfLines={1}>
            {swapNotice
              ? `SWAPPED OUT ${swapNotice.toUpperCase()}`
              : ready
                ? 'READY TO COMPARE'
                : `SELECT ${COMPARE_LIMIT - compare.length} MORE TO COMPARE`}
          </Txt>
          <Pressable
            onPress={clearCompare}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={tr('compare.clearComparison')}
          >
            <Txt variant="labelSmall" tone="secondary">
              CLEAR
            </Txt>
          </Pressable>
        </View>

        <View style={styles.slots}>
          {Array.from({ length: COMPARE_LIMIT }).map((_, i) =>
            compare[i] ? (
              <Slot key={compare[i].id} entry={compare[i]} onRemove={() => removeFromCompare(compare[i].id)} />
            ) : (
              // On a car's details page the only compare buttons are back in
              // the grid, so the empty slot has somewhere to send you. In the
              // grid itself they are already on screen, so it stays a hint —
              // see EmptySlot.
              <EmptySlot
                key={`empty-${i}`}
                onPress={onTabScreen ? undefined : () => router.push('/(tabs)/shop')}
              />
            ),
          )}
        </View>

        <Pressable
          onPress={() => router.push('/compare')}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          accessibilityLabel={tr('compare.openComparison')}
          style={[
            styles.cta,
            { backgroundColor: ready ? solid(t.colors.accent) : t.colors.surfaceAlt },
          ]}
        >
          <Ionicons
            name="git-compare"
            size={17}
            color={ready ? t.colors.onAccent : t.colors.textTertiary}
          />
          <Txt
            variant="titleSmall"
            color={ready ? t.colors.onAccent : t.colors.textTertiary}
            style={{ marginLeft: 7 }}
          >{tr('compare.title')}</Txt>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function Slot({ entry, onRemove }: { entry: CompareEntry; onRemove: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition.duration(200)}
      style={[styles.slot, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
    >
      <Image
        source={entry.image ? { uri: entry.image } : undefined}
        style={styles.thumb}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Txt variant="labelSmall" numberOfLines={1}>
          {entry.title}
        </Txt>
        <Txt variant="bodySmall" tone="secondary" numberOfLines={1}>
          {priceCompact(entry.price)}
        </Txt>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${entry.title}`}
        style={[styles.remove, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
      >
        <Ionicons name="close" size={13} color={t.colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * The second slot, before a second car is chosen.
 *
 * THIS WAS A DEAD END. It rendered a `+` and "Pick a second car" behind a
 * dashed border — an add affordance in every visual respect — as a plain
 * `View` with no handler. And it is the ONLY route onward from a car's
 * details page: the compare buttons live on the grid's cards, so a customer
 * who staged one car there was told to pick a second, given something that
 * looked like the way to do it, and got nothing. The "Compare" button below
 * stays disabled until two are staged, so that did nothing either. Two dead
 * controls, one after the other, which is exactly how it was reported.
 *
 * `onPress` is OPTIONAL on purpose. In the showroom grid the compare buttons
 * are already on screen, so there is nowhere to send anyone and this is a
 * status hint, not a control — it renders as plain text with no button role.
 * Wiring it there to navigate to the page you are already on would just be a
 * different dead button.
 */
function EmptySlot({ onPress }: { onPress?: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();

  const content = (
    <>
      <Ionicons name="add" size={17} color={t.colors.textTertiary} />
      <Txt variant="bodySmall" tone="tertiary" numberOfLines={1} style={{ marginLeft: 6, flex: 1 }}>{tr('compare.pickSecond')}</Txt>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.slot, styles.empty, { borderColor: t.colors.border }]}>{content}</View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tr('compare.pickSecond')}
      style={({ pressed }) => [
        styles.slot,
        styles.empty,
        { borderColor: pressed ? t.colors.accentText : t.colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.screenH, right: spacing.screenH },
  tray: { borderRadius: radius.lg, borderWidth: 1, padding: 10 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 },
  slots: { flexDirection: 'row', gap: 8 },
  slot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 50,
  },
  empty: { borderStyle: 'dashed', justifyContent: 'center', paddingHorizontal: 10 },
  thumb: { width: 40, height: 34, borderRadius: radius.sm },
  remove: { width: 21, height: 21, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: radius.md,
    marginTop: 9,
  },
});
