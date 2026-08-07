import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Skeleton } from '../src/components/Skeleton';
import { Txt } from '../src/components/Txt';
import { bookTestDrive } from '../src/data/salesRepository';
import { vehicleTitle } from '../src/domain/types';
import { useBranches } from '../src/hooks/useBranches';
import { useVehicle } from '../src/hooks/useVehicles';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';

const TIME_SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM'];
const SLOT_HOURS = [9, 10, 12, 14, 16];

/**
 * Book a test drive for a catalogue vehicle.
 * Route: `/book-test-drive?vehicleId=...`
 */
export default function BookTestDrive() {
  const t = useTheme();
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
    setLoading(true);
    setError(undefined);
    const at = new Date(dates[dateIdx]);
    at.setHours(SLOT_HOURS[slot] ?? 9, 0, 0, 0);
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
          <Animated.View entering={ZoomIn.duration(500)} style={[styles.successIcon, { backgroundColor: t.colors.success + '1F' }]}>
            <Ionicons name="checkmark-circle" size={72} color={t.colors.success} />
          </Animated.View>
          <Txt variant="headlineLarge" center style={{ marginTop: spacing.xl }}>
            Test Drive Booked!
          </Txt>
          <Txt variant="bodyLarge" tone="secondary" center style={{ marginTop: spacing.sm }}>
            Your test drive of the {vehicleTitle(vehicle)} at {branches[showroom]?.name ?? 'Elizade'} is requested.
            Our team will confirm shortly.
          </Txt>
          {reference ? (
            <View style={[styles.receipt, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
              <Txt variant="bodySmall" tone="secondary">
                Reference
              </Txt>
              <Txt variant="titleMedium">{reference}</Txt>
            </View>
          ) : null}
        </View>
        <View style={{ paddingBottom: insets.bottom + spacing.md, gap: 10 }}>
          <PrimaryButton label="View my bookings" icon="calendar" onPress={() => router.replace('/(tabs)/bookings')} />
          <PrimaryButton label="Done" variant="outline" onPress={() => router.back()} />
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
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          Book a Test Drive
        </Txt>
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
          <Txt color={t.colors.error}>{vehicleError ?? 'Vehicle not found.'}</Txt>
        ) : (
          <>
            <Label text="Showroom" />
            {branchesLoading && branches.length === 0 ? (
              <Skeleton height={64} radius={radius.md} />
            ) : branches.length === 0 ? (
              <Txt tone="secondary">No showrooms available right now. Please try again later.</Txt>
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

            {error ? (
              <Txt variant="bodySmall" color={t.colors.error} style={{ marginTop: spacing.md }}>
                {error}
              </Txt>
            ) : null}

            <View style={{ height: spacing.xl }} />
            <PrimaryButton
              label="Confirm Test Drive"
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
