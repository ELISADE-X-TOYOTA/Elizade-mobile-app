import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Txt } from '../src/components/Txt';
import { createAppointment } from '../src/data/serviceRepository';
import { useBranches } from '../src/hooks/useBranches';
import { useOwnedVehicles } from '../src/hooks/useGarage';
import { SERVICE_TYPE_META, ServiceType } from '../src/domain/types';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { cleanText } from '../src/utils/sanitize';
import { tint } from '../src/theme/colors';

const TYPES = Object.keys(SERVICE_TYPE_META) as ServiceType[];
const TIME_SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM'];
/** Hour-of-day for each slot above, applied to the selected date. */
const SLOT_HOURS = [9, 10, 12, 14, 16];

export default function BookService() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const { type: typeParam } = useLocalSearchParams<{ type?: ServiceType }>();
  // Real garage + branches: the payload needs backend ids, not demo ones.
  const { vehicles: ownedVehicles } = useOwnedVehicles();
  const { branches } = useBranches();
  const [vehicle, setVehicle] = useState(0);
  const [type, setType] = useState<ServiceType>(
    typeParam && (['periodic', 'repair', 'inspection', 'recall'] as ServiceType[]).includes(typeParam) ? typeParam : 'periodic',
  );
  const [branch, setBranch] = useState(0);
  const [dateIdx, setDateIdx] = useState(1);
  const [slot, setSlot] = useState(0);
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86_400_000)), []);

  const submit = async () => {
    const owned = ownedVehicles[vehicle];
    const centre = branches[branch];
    if (!owned || !centre) {
      setError('Select a vehicle and service centre to continue.');
      return;
    }
    setLoading(true);
    setError(undefined);
    // Apply the chosen time slot to the chosen day.
    const at = new Date(dates[dateIdx]);
    at.setHours(SLOT_HOURS[slot] ?? 9, 0, 0, 0);
    try {
      await createAppointment({
        ownedVehicleId: owned.id,
        branchId: centre.id,
        serviceType: type,
        scheduledAt: at.toISOString(),
        issueDescription: cleanText(issue) || SERVICE_TYPE_META[type].label,
        mileageAtBooking: owned.mileage,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not book this service.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent', paddingHorizontal: spacing.screenH }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View entering={ZoomIn.duration(500)} style={[styles.successIcon, { backgroundColor: tint(t.colors.success, 0.12) }]}>
            <Ionicons name="checkmark-circle" size={72} color={t.colors.successText} />
          </Animated.View>
          <Txt variant="headlineLarge" center style={{ marginTop: spacing.xl }}>
            Service Requested!
          </Txt>
          <Txt variant="bodyLarge" tone="secondary" center style={{ marginTop: spacing.sm }}>
            Your {SERVICE_TYPE_META[type].label.toLowerCase()} at {branches[branch]?.name ?? 'Elizade'} has been requested. We'll confirm shortly.
          </Txt>
        </View>
        <View style={{ paddingBottom: insets.bottom + spacing.md }}>
          <PrimaryButton label="Done" icon="arrow-forward" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          Book a Service
        </Txt>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Label text="Vehicle" />
        {ownedVehicles.length === 0 ? (
          <Txt tone="secondary">
            No vehicles in your garage yet. Add one from Profile → My Vehicles to book a service.
          </Txt>
        ) : (
          ownedVehicles.map((v, i) => (
            <SelectRow
              key={v.id}
              icon="car-sport-outline"
              title={`${v.make} ${v.model}`}
              subtitle={`${v.registrationNumber} · ${v.mileage.toLocaleString()} km`}
              selected={vehicle === i}
              onPress={() => setVehicle(i)}
            />
          ))
        )}

        <Label text="Service type" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {TYPES.map((ty) => {
            const meta = SERVICE_TYPE_META[ty];
            const active = type === ty;
            return (
              <Pressable
                key={ty}
                onPress={() => setType(ty)}
                style={[
                  styles.typeCard,
                  { backgroundColor: active ? t.colors.primary : t.colors.surfaceAlt, borderColor: active ? t.colors.primary : t.colors.border },
                ]}
              >
                <MaterialCommunityIcons name={meta.icon as any} size={22} color={active ? t.colors.onPrimary : t.colors.primary} />
                <Txt variant="titleSmall" color={active ? t.colors.onPrimary : t.colors.textPrimary} style={{ marginTop: 6 }}>
                  {meta.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        <Label text="Service centre" />
        {branches.map((s, i) => (
          <SelectRow
            key={s.id}
            icon="business-outline"
            title={s.name}
            subtitle={`${s.city}, ${s.state}`}
            selected={branch === i}
            onPress={() => setBranch(i)}
          />
        ))}

        <Label text="Date" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {dates.map((d, i) => (
            <Pressable
              key={i}
              onPress={() => setDateIdx(i)}
              style={[styles.dateChip, { backgroundColor: dateIdx === i ? t.colors.primary : t.colors.surfaceAlt, borderColor: dateIdx === i ? t.colors.primary : t.colors.border }]}
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
              style={[styles.slot, { backgroundColor: slot === i ? t.colors.primary : t.colors.surfaceAlt, borderColor: slot === i ? t.colors.primary : t.colors.border }]}
            >
              <Txt variant="titleSmall" color={slot === i ? t.colors.onPrimary : t.colors.textPrimary}>
                {time}
              </Txt>
            </Pressable>
          ))}
        </View>

        <Label text="Describe the issue (optional)" />
        <TextInput
          value={issue}
          onChangeText={setIssue}
          maxLength={1000}
          placeholder="e.g. Strange noise from front brakes, AC not cooling…"
          placeholderTextColor={t.colors.textTertiary}
          multiline
          style={[
            t.type.bodyLarge,
            { minHeight: 100, textAlignVertical: 'top', color: t.colors.textPrimary, backgroundColor: t.colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: t.colors.border, padding: 14 },
          ]}
        />

        {error ? (
          <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: spacing.md }}>
            {error}
          </Txt>
        ) : null}

        <View style={{ height: spacing.xl }} />
        <PrimaryButton
          label="Request Service"
          icon="construct"
          loading={loading}
          disabled={ownedVehicles.length === 0 || branches.length === 0}
          onPress={submit}
        />
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
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? t.colors.primary : t.colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selectRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.md, borderWidth: 1, marginBottom: 8 },
  typeCard: { width: '47%', flexGrow: 1, padding: 14, borderRadius: radius.md, borderWidth: 1 },
  dateChip: { width: 56, height: 64, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  slot: { paddingHorizontal: 16, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
});
