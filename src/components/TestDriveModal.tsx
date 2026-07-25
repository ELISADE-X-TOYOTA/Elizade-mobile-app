import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHOWROOMS } from '../data/mock';
import { Vehicle, vehicleTitle } from '../domain/types';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { price } from '../utils/format';
import { PrimaryButton } from './PrimaryButton';
import { Txt } from './Txt';

export type SalesMode = 'testdrive' | 'reserve';

interface Props {
  visible: boolean;
  vehicle: Vehicle;
  mode: SalesMode;
  onClose: () => void;
}

const TIME_SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM'];

/** Test-drive scheduling and reservation-with-deposit flow for Elizade sales. */
export function TestDriveModal({ visible, vehicle, mode, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [showroom, setShowroom] = useState(0);
  const [dateIdx, setDateIdx] = useState(0);
  const [slot, setSlot] = useState(0);
  const [done, setDone] = useState(false);

  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86_400_000)), []);
  const deposit = Math.max(2_000_000, Math.round((vehicle.price * 0.05) / 100_000) * 100_000);

  const close = () => {
    onClose();
    setTimeout(() => setDone(false), 250);
  };

  const isTestDrive = mode === 'testdrive';
  const title = isTestDrive ? 'Book a Test Drive' : 'Reserve Vehicle';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={[styles.handle, { backgroundColor: t.colors.border }]} />

          {done ? (
            <Success mode={mode} vehicle={vehicle} showroom={SHOWROOMS[showroom].name} deposit={deposit} onDone={close} />
          ) : (
            <>
              <Txt variant="titleLarge" style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>
                {title}
              </Txt>
              <Txt tone="secondary" style={{ paddingHorizontal: spacing.lg, marginTop: 2 }}>
                {vehicleTitle(vehicle)} · {vehicle.trim}
              </Txt>

              <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
                <Label text="Showroom" />
                {SHOWROOMS.map((s, i) => (
                  <SelectRow
                    key={s.id}
                    icon="storefront-outline"
                    title={s.name}
                    subtitle={`${s.city}, ${s.state}`}
                    selected={showroom === i}
                    onPress={() => setShowroom(i)}
                  />
                ))}

                {isTestDrive ? (
                  <>
                    <Label text="Date" />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {dates.map((d, i) => (
                        <Pressable
                          key={i}
                          onPress={() => setDateIdx(i)}
                          style={[
                            styles.dateChip,
                            {
                              backgroundColor: dateIdx === i ? t.colors.primary : t.colors.surfaceAlt,
                              borderColor: dateIdx === i ? t.colors.primary : t.colors.border,
                            },
                          ]}
                        >
                          <Txt variant="labelSmall" color={dateIdx === i ? t.colors.onPrimary : t.colors.textSecondary}>
                            {d.toLocaleDateString('en', { weekday: 'short' })}
                          </Txt>
                          <Txt variant="titleMedium" color={dateIdx === i ? t.colors.onPrimary : t.colors.textPrimary}>
                            {d.getDate()}
                          </Txt>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <Label text="Time" />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {TIME_SLOTS.map((time, i) => (
                        <Pressable
                          key={time}
                          onPress={() => setSlot(i)}
                          style={[
                            styles.slot,
                            {
                              backgroundColor: slot === i ? t.colors.primary : t.colors.surfaceAlt,
                              borderColor: slot === i ? t.colors.primary : t.colors.border,
                            },
                          ]}
                        >
                          <Txt variant="titleSmall" color={slot === i ? t.colors.onPrimary : t.colors.textPrimary}>
                            {time}
                          </Txt>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Label text="Refundable deposit" />
                    <View style={[styles.depositCard, { backgroundColor: t.colors.surfaceAlt }]}>
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodySmall" tone="secondary">
                          Holding deposit (5%)
                        </Txt>
                        <Txt variant="headlineSmall" color={t.colors.primary}>
                          {price(deposit)}
                        </Txt>
                        <Txt variant="bodySmall" tone="secondary" style={{ marginTop: 4 }}>
                          Reserves this vehicle for 7 days. Fully deductible from the final price.
                        </Txt>
                      </View>
                    </View>
                    <View style={[styles.payRow, { backgroundColor: t.colors.surfaceAlt }]}>
                      <Ionicons name="card" size={22} color={t.colors.primary} />
                      <Txt variant="titleSmall" style={{ flex: 1, marginLeft: 12 }}>
                        Visa •••• 4242
                      </Txt>
                      <Txt variant="titleSmall" color={t.colors.primary}>
                        Change
                      </Txt>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>
                <PrimaryButton
                  label={isTestDrive ? 'Confirm Test Drive' : `Pay Deposit · ${price(deposit)}`}
                  icon={isTestDrive ? 'car-sport' : 'lock-closed'}
                  onPress={() => setDone(true)}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Txt variant="titleMedium" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      {text}
    </Txt>
  );
}

function SelectRow({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.selectRow,
        { backgroundColor: t.colors.surfaceAlt, borderColor: selected ? t.colors.primary : t.colors.border },
      ]}
    >
      <Ionicons name={icon} size={20} color={t.colors.primary} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Txt variant="titleSmall">{title}</Txt>
        <Txt variant="bodySmall" tone="secondary">
          {subtitle}
        </Txt>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? t.colors.primary : t.colors.textTertiary}
      />
    </Pressable>
  );
}

function Success({
  mode,
  vehicle,
  showroom,
  deposit,
  onDone,
}: {
  mode: SalesMode;
  vehicle: Vehicle;
  showroom: string;
  deposit: number;
  onDone: () => void;
}) {
  const t = useTheme();
  const ref = `ELZ-${(Date.now() % 10000).toString().padStart(4, '0')}`;
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center' }}>
      <Animated.View entering={ZoomIn.duration(500)} style={[styles.successIcon, { backgroundColor: t.colors.success + '1F' }]}>
        <Ionicons name="checkmark-circle" size={64} color={t.colors.success} />
      </Animated.View>
      <Txt variant="headlineMedium" style={{ marginTop: 24 }}>
        {mode === 'testdrive' ? 'Test Drive Booked!' : 'Vehicle Reserved!'}
      </Txt>
      <Txt tone="secondary" center style={{ marginTop: 8 }}>
        {mode === 'testdrive'
          ? `Your test drive of the ${vehicleTitle(vehicle)} at ${showroom} is confirmed. Our team will be in touch shortly.`
          : `The ${vehicleTitle(vehicle)} is held for you at ${showroom} for 7 days. A confirmation has been sent to your email.`}
      </Txt>
      <View style={[styles.receipt, { backgroundColor: t.colors.surfaceAlt }]}>
        <View>
          <Txt variant="bodySmall" tone="secondary">
            Reference
          </Txt>
          <Txt variant="titleMedium">{ref}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt variant="bodySmall" tone="secondary">
            {mode === 'testdrive' ? 'Vehicle' : 'Deposit Paid'}
          </Txt>
          <Txt variant="titleMedium" color={t.colors.primary}>
            {mode === 'testdrive' ? vehicle.make : price(deposit)}
          </Txt>
        </View>
      </View>
      <View style={{ height: 24 }} />
      <PrimaryButton label="Done" onPress={onDone} style={{ width: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  selectRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.md, borderWidth: 1, marginBottom: 8 },
  dateChip: { width: 56, height: 64, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  slot: { paddingHorizontal: 16, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  depositCard: { flexDirection: 'row', padding: 16, borderRadius: radius.md },
  payRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.md, marginTop: 12 },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  receipt: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: radius.md, marginTop: 20, width: '100%' },
});
