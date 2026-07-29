import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextField } from '../src/components/AppTextField';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Txt } from '../src/components/Txt';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { price } from '../src/utils/format';
import { submitTradeIn } from '../src/data/salesRepository';
import { clean, cleanDigits, cleanName } from '../src/utils/sanitize';

const CONDITIONS = [
  {
    key: 'excellent',
    label: 'Excellent',
    factor: 1.0,
    // The API requires a meaningful note (min 10 chars), so each option
    // carries a description the assessor can actually act on.
    note: 'Excellent condition — full service history, no known faults or bodywork damage.',
  },
  {
    key: 'good',
    label: 'Good',
    factor: 0.85,
    note: 'Good condition — regularly serviced, minor cosmetic wear consistent with age.',
  },
  {
    key: 'fair',
    label: 'Fair',
    factor: 0.7,
    note: 'Fair condition — road-worthy but needs attention; visible wear and/or minor faults.',
  },
];

export default function TradeIn() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [condition, setCondition] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const estimate = useMemo(() => {
    const y = parseInt(year, 10);
    const km = parseInt(mileage.replace(/\D/g, ''), 10);
    if (!y || !km || y < 1990) return null;
    const age = Math.max(0, new Date().getFullYear() - y);
    const raw = 28_000_000 - age * 2_200_000 - (km / 1000) * 55_000;
    const base = Math.max(1_500_000, raw) * CONDITIONS[condition].factor;
    return { low: base * 0.92, high: base * 1.08 };
  }, [year, mileage, condition]);

  const valid = make.trim() && model.trim() && estimate;

  const submit = async () => {
    setLoading(true);
    setError(undefined);
    try {
      await submitTradeIn({
        make: cleanName(make),
        model: clean(model, 60),
        year: parseInt(year, 10),
        mileage: parseInt(mileage.replace(/\D/g, ''), 10),
        conditionNotes: CONDITIONS[condition].note,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit for valuation.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.background, paddingHorizontal: spacing.screenH }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View entering={ZoomIn.duration(500)} style={[styles.successIcon, { backgroundColor: t.colors.success + '1F' }]}>
            <Ionicons name="cash" size={64} color={t.colors.success} />
          </Animated.View>
          <Txt variant="headlineLarge" center style={{ marginTop: spacing.xl }}>
            Valuation Requested
          </Txt>
          <Txt variant="bodyLarge" tone="secondary" center style={{ marginTop: spacing.sm }}>
            An Elizade specialist will confirm your {make} {model} trade-in value after a quick physical inspection.
          </Txt>
          {estimate && (
            <Txt variant="titleMedium" color={t.colors.primary} style={{ marginTop: spacing.md }}>
              Indicative: {price(estimate.low)} – {price(estimate.high)}
            </Txt>
          )}
        </View>
        <View style={{ paddingBottom: insets.bottom + spacing.md }}>
          <PrimaryButton label="Done" icon="arrow-forward" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          Trade-in Valuation
        </Txt>
        <Txt tone="secondary">Tell us about your current vehicle for an instant estimate.</Txt>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg }}>
          <AppTextField label="Make" placeholder="e.g. Toyota" icon="car-outline" value={make} onChangeText={setMake} sanitize={cleanName} maxLength={40} autoCapitalize="words" />
          <AppTextField label="Model" placeholder="e.g. Corolla" icon="car-sport-outline" value={model} onChangeText={setModel} sanitize={cleanName} maxLength={40} autoCapitalize="words" />
          <AppTextField label="Year" placeholder="e.g. 2018" icon="calendar-outline" keyboardType="number-pad" value={year} onChangeText={setYear} sanitize={(v) => cleanDigits(v, 4)} maxLength={4} />
          <AppTextField label="Mileage (km)" placeholder="e.g. 85000" icon="speedometer-outline" keyboardType="number-pad" value={mileage} onChangeText={setMileage} sanitize={(v) => cleanDigits(v, 7)} maxLength={7} />
        </View>

        <Txt variant="titleSmall" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
          Condition
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {CONDITIONS.map((c, i) => {
            const active = condition === i;
            return (
              <Pressable
                key={c.key}
                onPress={() => setCondition(i)}
                style={[styles.condChip, { backgroundColor: active ? t.colors.primary : t.colors.surfaceAlt, borderColor: active ? t.colors.primary : t.colors.border }]}
              >
                <Txt variant="titleSmall" color={active ? t.colors.onPrimary : t.colors.textPrimary}>
                  {c.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        {/* Estimate */}
        {estimate && (
          <View style={[styles.estimate, { backgroundColor: t.colors.primary }]}>
            <Txt variant="labelSmall" color={t.colors.onPrimary} style={{ opacity: 0.7 }}>
              ESTIMATED TRADE-IN VALUE
            </Txt>
            <Txt variant="headlineMedium" color={t.colors.onPrimary} style={{ marginTop: 2 }}>
              {price(estimate.low)} – {price(estimate.high)}
            </Txt>
            <Txt variant="bodySmall" color={t.colors.onPrimary} style={{ opacity: 0.75, marginTop: 4 }}>
              Final value confirmed after inspection
            </Txt>
          </View>
        )}

        <Pressable style={[styles.attach, { borderColor: t.colors.border }]}>
          <Ionicons name="camera-outline" size={20} color={t.colors.primary} />
          <Txt variant="titleSmall" color={t.colors.primary} style={{ marginLeft: 8 }}>
            Add photos of your vehicle
          </Txt>
        </Pressable>

        {error ? (
          <Txt variant="bodySmall" color={t.colors.error} style={{ marginTop: spacing.md }}>
            {error}
          </Txt>
        ) : null}

        <View style={{ height: spacing.xl }} />
        <PrimaryButton label="Submit for Assessment" icon="cash-outline" loading={loading} disabled={!valid} onPress={submit} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  condChip: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  estimate: { borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg },
  attach: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', marginTop: spacing.lg },
  successIcon: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
});
