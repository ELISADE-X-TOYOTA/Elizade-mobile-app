import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { price } from '../utils/format';
import { Txt } from './Txt';

interface Props {
  visible: boolean;
  vehiclePrice: number;
  vehicleTitle: string;
  onClose: () => void;
}

const DOWN_PCTS = [10, 20, 30, 40];
const TENORS = [12, 24, 36, 48, 60];

/** Vehicle financing calculator — monthly repayment from deposit, tenor & rate. */
export function FinancingModal({ visible, vehiclePrice, vehicleTitle, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [downPct, setDownPct] = useState(20);
  const [tenor, setTenor] = useState(36);
  const [rate, setRate] = useState(15);

  const calc = useMemo(() => {
    const down = (vehiclePrice * downPct) / 100;
    const principal = vehiclePrice - down;
    const r = rate / 100 / 12;
    const monthly = r === 0 ? principal / tenor : (principal * r * (1 + r) ** tenor) / ((1 + r) ** tenor - 1);
    const totalPayable = monthly * tenor + down;
    const totalInterest = monthly * tenor - principal;
    return { down, principal, monthly, totalPayable, totalInterest };
  }, [vehiclePrice, downPct, tenor, rate]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={[styles.handle, { backgroundColor: t.colors.border }]} />
          <Txt variant="titleLarge" style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>
            Financing Calculator
          </Txt>
          <Txt tone="secondary" style={{ paddingHorizontal: spacing.lg, marginTop: 2 }}>
            {vehicleTitle} · {price(vehiclePrice)}
          </Txt>

          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
            {/* Result */}
            <View style={[styles.result, { backgroundColor: t.colors.primary }]}>
              <Txt variant="labelSmall" color={t.colors.onPrimary} style={{ opacity: 0.7 }}>
                ESTIMATED MONTHLY REPAYMENT
              </Txt>
              <Txt variant="displayMedium" color={t.colors.onPrimary} style={{ marginTop: 2 }}>
                {price(calc.monthly)}
              </Txt>
              <Txt variant="bodySmall" color={t.colors.onPrimary} style={{ opacity: 0.75, marginTop: 4 }}>
                for {tenor} months · {price(calc.down)} down
              </Txt>
            </View>

            <Label text="Down payment" trailing={`${downPct}% · ${price(calc.down)}`} />
            <Chips options={DOWN_PCTS.map((p) => ({ value: p, label: `${p}%` }))} value={downPct} onChange={setDownPct} />

            <Label text="Tenor" trailing={`${tenor} months`} />
            <Chips options={TENORS.map((m) => ({ value: m, label: `${m}m` }))} value={tenor} onChange={setTenor} />

            <Label text="Interest rate (p.a.)" trailing={`${rate.toFixed(1)}%`} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Stepper icon="remove" onPress={() => setRate((v) => Math.max(5, +(v - 0.5).toFixed(1)))} />
              <View style={[styles.rateBox, { backgroundColor: t.colors.surfaceAlt }]}>
                <Txt variant="headlineSmall">{rate.toFixed(1)}%</Txt>
              </View>
              <Stepper icon="add" onPress={() => setRate((v) => Math.min(30, +(v + 0.5).toFixed(1)))} />
            </View>

            {/* Breakdown */}
            <View style={[styles.breakdown, { backgroundColor: t.colors.surfaceAlt }]}>
              <Row label="Vehicle price" value={price(vehiclePrice)} />
              <Row label="Down payment" value={`- ${price(calc.down)}`} />
              <Row label="Loan principal" value={price(calc.principal)} />
              <Row label="Total interest" value={price(calc.totalInterest)} />
              <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
              <Row label="Total payable" value={price(calc.totalPayable)} bold />
            </View>

            <Txt variant="labelSmall" tone="tertiary" style={{ marginTop: spacing.md }}>
              Estimate only. Final terms are subject to Elizade Finance approval.
            </Txt>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Label({ text, trailing }: { text: string; trailing?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm }}>
      <Txt variant="titleMedium" style={{ flex: 1 }}>
        {text}
      </Txt>
      {trailing && (
        <Txt variant="titleSmall" color={t.colors.primary}>
          {trailing}
        </Txt>
      )}
    </View>
  );
}

function Chips({ options, value, onChange }: { options: { value: number; label: string }[]; value: number; onChange: (v: number) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.chip, { backgroundColor: active ? t.colors.primary : t.colors.surfaceAlt, borderColor: active ? t.colors.primary : t.colors.border }]}
          >
            <Txt variant="titleSmall" color={active ? t.colors.onPrimary : t.colors.textPrimary}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.stepper, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
      <Ionicons name={icon} size={22} color={t.colors.primary} />
    </Pressable>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Txt variant={bold ? 'titleMedium' : 'bodyMedium'} tone={bold ? 'primary' : 'secondary'}>
        {label}
      </Txt>
      <Txt variant={bold ? 'titleLarge' : 'titleSmall'} color={bold ? t.colors.primary : undefined}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  result: { borderRadius: radius.lg, padding: spacing.lg },
  chip: { paddingHorizontal: 16, height: 42, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepper: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rateBox: { flex: 1, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  breakdown: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  divider: { height: 1, marginVertical: 8 },
});
