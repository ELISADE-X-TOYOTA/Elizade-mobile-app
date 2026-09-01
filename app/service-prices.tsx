import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../src/components/Skeleton';
import { Txt } from '../src/components/Txt';
import { APP } from '../src/constants/app';
import {
  PriceBoard,
  PriceGroup,
  fetchPriceBoard,
  priceKey,
} from '../src/data/priceBoardRepository';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { solid } from '../src/theme/colors';

const GROUP_ORDER: PriceGroup[] = ['periodic', 'chassis', 'engine'];

/**
 * Published service prices.
 *
 * The showroom board is a 9-column grid of model × mileage band. That cannot
 * be read on a phone, so the two axes become pickers and the body is a plain
 * priced list — the same data, one cell of the grid at a time.
 */
export default function ServicePrices() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();

  const [board, setBoard] = useState<PriceBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [model, setModel] = useState('');
  const [band, setBand] = useState<number | null>(null);

  /*
    Second line of defence behind the Service tab's hidden entry point.

    A route file exists whether or not anything links to it, and expo-router
    resolves deep links straight to it. Without this, `elizade://service-prices`
    would open an unreleased screen.
  */
  useEffect(() => {
    if (!APP.servicePrices) router.replace('/(tabs)/service');
  }, []);

  useEffect(() => {
    if (!APP.servicePrices) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPriceBoard();
        if (cancelled) return;
        setBoard(data);
        setModel((m) => m || data.models[0] || '');
        setBand((b) => (b !== null ? b : (data.mileageBandsKm[0] ?? null)));
        setError(undefined);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const money = useMemo(() => {
    const currency = board?.currency || 'NGN';
    return (value: number) =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(value);
  }, [board?.currency]);

  /** Periodic work is banded by distance; chassis and engine are flat (band 0). */
  const priceFor = (code: string, group: PriceGroup): number | null => {
    if (!board || !model) return null;
    const lookupBand = group === 'periodic' ? (band ?? 0) : 0;
    return board.prices.get(priceKey(model, code, lookupBand)) ?? null;
  };

  const sections = useMemo(() => {
    if (!board) return [];
    return GROUP_ORDER.map((group) => ({
      group,
      rows: board.items.filter((i) => i.group === group),
    })).filter((s) => s.rows.length > 0);
  }, [board]);

  if (!APP.servicePrices) return null;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View
        style={{
          paddingTop: insets.top + spacing.xs,
          paddingHorizontal: spacing.screenH,
          paddingBottom: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          {tr('servicePrices.title')}
        </Txt>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.screenH,
          paddingTop: spacing.sm,
          paddingBottom: 60,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <>
            <Skeleton height={44} radius={radius.lg} />
            <Skeleton height={220} radius={radius.xl} />
          </>
        ) : error ? (
          <Txt tone="secondary">{tr('servicePrices.loadError', { message: error })}</Txt>
        ) : !board?.hasPrices ? (
          <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <Txt variant="titleMedium">{tr('servicePrices.notPublished')}</Txt>
            <Txt tone="secondary" style={{ marginTop: 6 }}>
              {tr('servicePrices.notPublishedBody')}
            </Txt>
          </View>
        ) : (
          <>
            <Chips
              label={tr('servicePrices.model')}
              values={board.models}
              selected={model}
              onSelect={setModel}
            />

            <Chips
              label={tr('servicePrices.mileage')}
              values={board.mileageBandsKm}
              selected={band}
              onSelect={setBand}
              format={(km) => tr('servicePrices.km', { km: Number(km).toLocaleString('en-NG') })}
            />

            {sections.map(({ group, rows }) => (
              <View key={group} style={{ gap: 8 }}>
                <Txt variant="titleSmall" tone="secondary" style={styles.sectionHeading}>
                  {tr(`servicePrices.group.${group}`)}
                </Txt>
                <View
                  style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, padding: 0 }]}
                >
                  {rows.map((item, index) => {
                    const price = priceFor(item.code, item.group);
                    return (
                      <View
                        key={item.code}
                        style={[
                          styles.row,
                          index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.border },
                        ]}
                      >
                        <Txt style={{ flex: 1 }}>{item.name}</Txt>
                        {/* A dash, never a blank and never zero: an unpriced
                            cell must not read as "included" or "free". */}
                        <Txt variant="titleSmall" color={price === null ? t.colors.textSecondary : undefined}>
                          {price === null ? '—' : money(price)}
                        </Txt>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            <Txt variant="bodySmall" tone="secondary" style={{ marginTop: spacing.sm }}>
              {board.disclaimer ?? tr('servicePrices.disclaimer')}
            </Txt>
            {board.priceInclusive ? (
              <Txt variant="labelSmall" tone="secondary">{tr('servicePrices.inclusive')}</Txt>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Horizontal single-select. Used for both axes of the board. */
function Chips<T extends string | number>({
  label,
  values,
  selected,
  onSelect,
  format,
}: {
  label: string;
  values: T[];
  selected: T | null;
  onSelect: (value: T) => void;
  format?: (value: T) => string;
}) {
  const t = useTheme();
  if (values.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="labelSmall" tone="secondary">{label}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {values.map((value) => {
          const active = value === selected;
          return (
            <Pressable
              key={String(value)}
              onPress={() => onSelect(value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? solid(t.colors.accent) : t.colors.surface,
                  borderColor: active ? solid(t.colors.accent) : t.colors.border,
                },
              ]}
            >
              <Txt variant="titleSmall" color={active ? t.colors.onAccent : undefined}>
                {format ? format(value) : String(value)}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, gap: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  sectionHeading: { textTransform: 'uppercase', letterSpacing: 0.6 },
});
