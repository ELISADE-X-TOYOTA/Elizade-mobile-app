import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkCarImage } from '../src/components/NetworkCarImage';
import { Txt } from '../src/components/Txt';
import { buildComparison, CompareGroup, CompareRow, onlyDifferences } from '../src/domain/compare';
import { vehicleTitle } from '../src/domain/types';
import { useCompareVehicles } from '../src/hooks/useCompareVehicles';
import { useStore } from '../src/store/useStore';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { priceCompact } from '../src/utils/format';

/**
 * Side-by-side vehicle comparison.
 *
 * LAYOUT: the vehicle column headers live OUTSIDE the ScrollView rather than
 * inside it, which is what makes them sticky — you can scroll to the bottom of
 * the spec matrix and still see which column is which car. A phone is too
 * narrow for a label|A|B table, so each spec renders as a full-width label with
 * the two values beneath it.
 */
export default function Compare() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const compare = useStore((s) => s.compare);
  const clearCompare = useStore((s) => s.clearCompare);
  const [diffOnly, setDiffOnly] = useState(false);

  const ids = useMemo(() => compare.map((c) => c.id), [compare]);
  const { vehicles, loading, error, reload } = useCompareVehicles(ids);

  // Emptying the tray from elsewhere leaves nothing to compare — don't strand
  // the user on a blank screen. Falls back to the showroom rather than
  // `back()` alone, which is a no-op on a cold deep-link with no history.
  useEffect(() => {
    if (compare.length > 0) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/shop');
  }, [compare.length]);

  const [a, b] = vehicles;
  const comparison = useMemo(() => (a && b ? buildComparison(a, b) : null), [a, b]);
  const groups = useMemo(
    () => (!comparison ? [] : diffOnly ? onlyDifferences(comparison) : comparison.groups),
    [comparison, diffOnly],
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* ── Header ── */}
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
          >
            <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => {
              clearCompare();
              router.back();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear comparison"
          >
            <Txt variant="titleSmall" tone="secondary">
              Clear
            </Txt>
          </Pressable>
        </View>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.sm }}>
          Compare
        </Txt>
        {comparison ? (
          <Txt tone="secondary">
            {comparison.differenceCount} of {comparison.totalRows} specs differ
            {comparison.unknownCount > 0 ? ` · ${comparison.unknownCount} not published` : ''}
          </Txt>
        ) : (
          <Txt tone="secondary">Side by side, spec for spec.</Txt>
        )}
      </View>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !comparison ? (
        <LoadingState />
      ) : (
        <>
          {/* ── Sticky vehicle columns ── */}
          <View style={[styles.headerRow, { borderBottomColor: t.colors.border }]}>
            <VehicleColumn
              image={a.images[0]}
              title={vehicleTitle(a)}
              trim={a.trim}
              price={a.price}
            />
            <View style={[styles.vs, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
              <Txt variant="labelSmall" tone="tertiary">
                VS
              </Txt>
            </View>
            <VehicleColumn
              image={b.images[0]}
              title={vehicleTitle(b)}
              trim={b.trim}
              price={b.price}
            />
          </View>

          {/* ── Differences toggle ── */}
          <Pressable
            onPress={() => setDiffOnly((v) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: diffOnly }}
            accessibilityLabel="Highlight differences only"
            style={[styles.toggleRow, { borderBottomColor: t.colors.border }]}
          >
            <Ionicons name="funnel-outline" size={16} color={t.colors.textSecondary} />
            <Txt variant="titleSmall" style={{ flex: 1, marginLeft: 8 }}>
              Highlight differences only
            </Txt>
            <Switch on={diffOnly} />
          </Pressable>

          {/* ── Spec matrix ── */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: spacing.screenH,
              paddingTop: spacing.md,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
            showsVerticalScrollIndicator={false}
          >
            {groups.length === 0 ? (
              <View style={[styles.identical, { backgroundColor: t.colors.success + '14' }]}>
                <Ionicons name="checkmark-circle" size={20} color={t.colors.success} />
                <Txt tone="secondary" style={{ flex: 1, marginLeft: 10 }}>
                  These two match on every published spec. Turn the filter off to see the full table.
                </Txt>
              </View>
            ) : (
              groups.map((g) => <Group key={g.title} group={g} />)
            )}

            <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: spacing.lg }}>
              Specifications are supplied by Elizade and may vary by production batch. Confirm
              details with a sales consultant before purchase.
            </Txt>
          </ScrollView>
        </>
      )}
    </View>
  );
}

/** One sticky column header: photo, name, trim, price. */
function VehicleColumn({
  image,
  title,
  trim,
  price,
}: {
  image: string;
  title: string;
  trim: string;
  price: number;
}) {
  const t = useTheme();
  return (
    <View style={styles.col}>
      <View style={[styles.colImage, { backgroundColor: t.colors.surfaceAlt }]}>
        <NetworkCarImage uri={image} radius={radius.sm} />
      </View>
      <Txt variant="titleSmall" numberOfLines={2} center style={{ marginTop: 6 }}>
        {title}
      </Txt>
      <Txt variant="bodySmall" tone="secondary" numberOfLines={1} center>
        {trim || '—'}
      </Txt>
      <Txt variant="titleMedium" color={t.colors.accent} center style={{ marginTop: 2 }}>
        {priceCompact(price)}
      </Txt>
    </View>
  );
}

function Group({ group }: { group: CompareGroup }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={styles.groupHead}>
        <Ionicons name={group.icon as keyof typeof Ionicons.glyphMap} size={16} color={t.colors.accent} />
        <Txt variant="titleMedium" style={{ marginLeft: 8 }}>
          {group.title}
        </Txt>
      </View>
      <View style={[styles.groupBody, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
        {group.rows.map((r, i) => (
          <Row key={r.label} row={r} last={i === group.rows.length - 1} />
        ))}
      </View>
    </View>
  );
}

function Row({ row, last }: { row: CompareRow; last: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
        // Differing rows are tinted whether or not the filter is on, so the
        // toggle changes what's listed without changing what "different" looks
        // like.
        row.differs && { backgroundColor: t.colors.accent + '12' },
      ]}
    >
      <View style={styles.rowLabel}>
        {row.differs && <View style={[styles.dot, { backgroundColor: t.colors.accent }]} />}
        <Txt variant="labelSmall" tone="secondary">
          {row.label.toUpperCase()}
        </Txt>
      </View>
      <View style={styles.rowValues}>
        <Cell value={row.a} emphasise={row.differs} />
        <View style={{ width: 10 }} />
        <Cell value={row.b} emphasise={row.differs} />
      </View>
    </View>
  );
}

/**
 * A single value. A missing spec is rendered as an explicit "Not specified"
 * rather than a blank cell — an empty space reads as an oversight, and in a
 * buying decision "we don't publish this" must not be mistaken for "it doesn't
 * have this".
 */
function Cell({ value, emphasise }: { value: string | null; emphasise: boolean }) {
  const t = useTheme();
  if (value === null) {
    return (
      <Txt variant="bodySmall" tone="tertiary" style={{ flex: 1, fontStyle: 'italic' }}>
        Not specified
      </Txt>
    );
  }
  return (
    <Txt
      variant={emphasise ? 'titleSmall' : 'bodyMedium'}
      color={emphasise ? t.colors.textPrimary : t.colors.textSecondary}
      style={{ flex: 1 }}
    >
      {value}
    </Txt>
  );
}

/** Compact themed switch — RN's Switch can't be styled consistently on Android. */
function Switch({ on }: { on: boolean }) {
  const t = useTheme();
  const track = useAnimatedStyle(() => ({
    backgroundColor: withTiming(on ? t.colors.accent : t.colors.border, { duration: 160 }),
  }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(on ? 18 : 0, { duration: 160 }) }],
  }));
  return (
    <Animated.View style={[styles.track, track]}>
      <Animated.View style={[styles.thumb, { backgroundColor: on ? t.colors.onAccent : t.colors.surface }, thumb]} />
    </Animated.View>
  );
}

function LoadingState() {
  const t = useTheme();
  return (
    <View style={{ padding: spacing.screenH, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{ flex: 1, height: 150, borderRadius: radius.md, backgroundColor: t.colors.surfaceAlt }}
          />
        ))}
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{ height: 62, borderRadius: radius.md, backgroundColor: t.colors.surfaceAlt }}
        />
      ))}
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View style={{ padding: spacing.screenH, alignItems: 'center', marginTop: spacing.xxl }}>
      <Ionicons name="cloud-offline-outline" size={44} color={t.colors.textTertiary} />
      <Txt variant="titleMedium" center style={{ marginTop: spacing.md }}>
        Couldn't load the comparison
      </Txt>
      <Txt tone="secondary" center style={{ marginTop: 4 }}>
        {message}
      </Txt>
      <Pressable onPress={onRetry} style={{ marginTop: spacing.lg }}>
        <Txt variant="titleSmall" color={t.colors.primary}>
          Tap to retry
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  col: { flex: 1 },
  colImage: { height: 78, borderRadius: radius.sm, overflow: 'hidden' },
  vs: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    marginTop: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenH,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  track: { width: 42, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  thumb: { width: 18, height: 18, borderRadius: 9 },
  groupHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  groupBody: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  row: { paddingHorizontal: 12, paddingVertical: 10 },
  rowLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  rowValues: { flexDirection: 'row', alignItems: 'flex-start' },
  identical: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
