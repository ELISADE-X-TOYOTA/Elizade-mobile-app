import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Skeleton } from '../src/components/Skeleton';
import { Txt } from '../src/components/Txt';
import { bookTestDrive } from '../src/data/salesRepository';
import { firstOpenSlot, isDayFull, isSlotPast, slotLabel, SLOTS, slotTime } from '../src/domain/booking';
import { vehicleTitle } from '../src/domain/types';
import { useBranches } from '../src/hooks/useBranches';
import { useVehicle } from '../src/hooks/useVehicles';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { tint } from '../src/theme/colors';

/**
 * Book a test drive for a catalogue vehicle.
 * Route: `/book-test-drive?vehicleId=...`
 */
export default function BookTestDrive() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  const { vehicle, loading: vehicleLoading, error: vehicleError } = useVehicle(vehicleId ?? '');
  const { branches, loading: branchesLoading } = useBranches({ showroomsOnly: true });

  const [showroom, setShowroom] = useState(0);
  const [dateIdx, setDateIdx] = useState(1);
  const [slot, setSlot] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [reference, setReference] = useState<string>();

  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86_400_000)), []);

  const slotPast = (dIdx: number, sIdx: number) => isSlotPast(dates[dIdx], sIdx);
  const dayFull = (dIdx: number) => isDayFull(dates[dIdx]);

  const submit = async () => {
    if (!vehicle) {
      setError('Vehicle not found.');
      return;
    }
    const branch = branches[showroom];
    if (!branch) {
      setError('Select a showroom to continue.');
      return;
    }
    // Backstop: the slot could have lapsed while the form sat open.
    if (slotPast(dateIdx, slot)) {
      setError('That time has already passed. Pick a later slot.');
      return;
    }
    setLoading(true);
    setError(undefined);
    const at = slotTime(dates[dateIdx], slot);
    try {
      const res = await bookTestDrive({
        vehicleId: vehicle.id,
        branchId: branch.id,
        scheduledAt: at.toISOString(),
      });
      setReference(res.reference);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not book this test drive.');
    } finally {
      setLoading(false);
    }
  };

  if (done && vehicle) {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent', paddingHorizontal: spacing.screenH }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View entering={ZoomIn.duration(500)} style={[styles.successIcon, { backgroundColor: tint(t.colors.success, 0.12) }]}>
            <Ionicons name="checkmark-circle" size={72} color={t.colors.successText} />
          </Animated.View>
          <Txt variant="headlineLarge" center style={{ marginTop: spacing.xl }}>{tr('testDrive.booked')}</Txt>
          <Txt variant="bodyLarge" tone="secondary" center style={{ marginTop: spacing.sm }}>
            Your test drive of the {vehicleTitle(vehicle)} at {branches[showroom]?.name ?? 'Elizade'} is requested.
            Our team will confirm shortly.
          </Txt>
          {reference ? (
            <View style={[styles.receipt, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
              <Txt variant="bodySmall" tone="secondary">{tr('common.reference')}</Txt>
              <Txt variant="titleMedium">{reference}</Txt>
            </View>
          ) : null}
        </View>
        <View style={{ paddingBottom: insets.bottom + spacing.md, gap: 10 }}>
          <PrimaryButton label={tr('testDrive.viewBookings')} icon="calendar" onPress={() => router.replace('/(tabs)/bookings')} />
          <PrimaryButton label={tr('common.done')} variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>{tr('testDrive.title')}</Txt>
        {vehicle ? (
          <Txt tone="secondary" style={{ marginTop: 4 }}>
            {vehicleTitle(vehicle)} · {vehicle.trim}
          </Txt>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {vehicleLoading ? (
          <Skeleton height={120} radius={radius.md} />
        ) : vehicleError || !vehicle ? (
          <Txt color={t.colors.errorText}>{vehicleError ?? 'Vehicle not found.'}</Txt>
        ) : (
          <>
            <Label text="Showroom" />
            {branchesLoading && branches.length === 0 ? (
              <Skeleton height={64} radius={radius.md} />
            ) : branches.length === 0 ? (
              <Txt tone="secondary">{tr('testDrive.noShowrooms')}</Txt>
            ) : (
              branches.map((s, i) => (
                <SelectRow
                  key={s.id}
                  icon="storefront-outline"
                  title={s.name}
                  subtitle={`${s.city}, ${s.state}`}
                  selected={showroom === i}
                  onPress={() => setShowroom(i)}
                />
              ))
            )}

            <Label text="Date" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {dates.map((d, i) => {
                const selected = dateIdx === i;
                // Today drops off the picker once its last slot has passed.
                const full = dayFull(i);
                return (
                  <Pressable
                    key={i}
                    disabled={full}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: full }}
                    accessibilityLabel={d.toLocaleDateString('en', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                    onPress={() => {
                      setDateIdx(i);
                      // Moving to today can strand the selection on a lapsed
                      // slot — pull it forward to the first one still bookable.
                      if (slotPast(i, slot)) {
                        const next = firstOpenSlot(dates[i]);
                        if (next >= 0) setSlot(next);
                      }
                    }}
                    style={[
                      styles.dateChip,
                      {
                        backgroundColor: selected ? t.colors.primary : t.colors.surfaceAlt,
                        borderColor: selected ? t.colors.primary : t.colors.border,
                        opacity: full ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Txt variant="labelSmall" color={selected ? t.colors.onPrimary : t.colors.textSecondary}>
                      {d.toLocaleDateString('en', { weekday: 'short' })}
                    </Txt>
                    <Txt variant="titleMedium" color={selected ? t.colors.onPrimary : t.colors.textPrimary}>
                      {d.getDate()}
                    </Txt>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Label text="Time" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SLOTS.map((s, i) => {
                const selected = slot === i;
                const past = slotPast(dateIdx, i);
                const label = slotLabel(s);
                return (
                  <Pressable
                    key={label}
                    disabled={past}
                    onPress={() => setSlot(i)}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: past }}
                    accessibilityLabel={past ? `${label}, no longer available` : label}
                    style={[
                      styles.slot,
                      {
                        backgroundColor: selected ? t.colors.primary : t.colors.surfaceAlt,
                        borderColor: selected ? t.colors.primary : t.colors.border,
                        opacity: past ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Txt
                      variant="titleSmall"
                      color={
                        selected
                          ? t.colors.onPrimary
                          : past
                            ? t.colors.textTertiary
                            : t.colors.textPrimary
                      }
                      style={past ? { textDecorationLine: 'line-through' } : undefined}
                    >
                      {label}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: spacing.md }}>
                {error}
              </Txt>
            ) : null}

            <View style={{ height: spacing.xl }} />
            <PrimaryButton
              label={tr('service.confirmTestDrive')}
              icon="car-sport"
              loading={loading}
              disabled={!vehicle || branches.length === 0}
              onPress={submit}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Txt variant="titleMedium" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
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
  const { t: tr } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.selectRow, { backgroundColor: t.colors.surfaceAlt, borderColor: selected ? t.colors.primary : t.colors.border }]}
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

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selectRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.md, borderWidth: 1, marginBottom: 8 },
  dateChip: { width: 56, height: 64, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  slot: { paddingHorizontal: 16, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  receipt: {
    marginTop: spacing.xl,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 180,
  },
});
