import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

/** Height of the floating tab bar, so the tray docks above rather than over it. */
const TAB_BAR_H = 66;

export function CompareTray() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const compare = useStore((s) => s.compare);
  const removeFromCompare = useStore((s) => s.removeFromCompare);
  const clearCompare = useStore((s) => s.clearCompare);
  const swapNotice = useStore((s) => s.swapNotice);
  const dismissSwapNotice = useStore((s) => s.dismissSwapNotice);

  // Above the early return — hooks must run on every render.
  useEffect(() => {
    if (!swapNotice) return;
    const id = setTimeout(dismissSwapNotice, 2600);
    return () => clearTimeout(id);
  }, [swapNotice, dismissSwapNotice]);

  if (!isShowroomRoute(pathname) || compare.length === 0) return null;

  const onTabScreen = pathname === '/shop';
  const bottom =
    (insets.bottom > 0 ? insets.bottom : 12) + (onTabScreen ? TAB_BAR_H + 10 : spacing.md);
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
            accessibilityLabel="Clear comparison"
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
              <EmptySlot key={`empty-${i}`} />
            ),
          )}
        </View>

        <Pressable
          onPress={() => router.push('/compare')}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          accessibilityLabel="Open side-by-side comparison"
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
          >
            Compare
          </Txt>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function Slot({ entry, onRemove }: { entry: CompareEntry; onRemove: () => void }) {
  const t = useTheme();
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

function EmptySlot() {
  const t = useTheme();
  return (
    <View style={[styles.slot, styles.empty, { borderColor: t.colors.border }]}>
      <Ionicons name="add" size={17} color={t.colors.textTertiary} />
      <Txt variant="bodySmall" tone="tertiary" numberOfLines={1} style={{ marginLeft: 6, flex: 1 }}>
        Pick a second car
      </Txt>
    </View>
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
