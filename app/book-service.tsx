import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AttachmentDrafts } from '../src/components/AttachmentDrafts';
import { KeyboardAwareScrollView } from '../src/components/KeyboardAware';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Txt } from '../src/components/Txt';
import { MAX_TICKET_ATTACHMENTS } from '../src/api/support';
import { pickTicketAttachment, type PickedAttachment } from '../src/data/supportRepository';
import { createAppointment } from '../src/data/serviceRepository';
import { useBranches } from '../src/hooks/useBranches';
import { useOwnedVehicles } from '../src/hooks/useGarage';
import { SERVICE_TYPE_META, ServiceType } from '../src/domain/types';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { cleanText } from '../src/utils/sanitize';
import { tint } from '../src/theme/colors';
import { bookableDays, bookableSlots, slotDateTime, validateBooking } from '../src/domain/booking';

const TYPES = Object.keys(SERVICE_TYPE_META) as ServiceType[];
/** Re-evaluated on every render so the list cannot go stale on a screen that
 *  has been open a while. */

export default function BookService() {
  const t = useTheme();
  const { t: tr } = useTranslation();
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
  const [dateIdx, setDateIdx] = useState(0);
  const [slot, setSlot] = useState(0);
  const [issue, setIssue] = useState('');
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  // Only days with something left on them. A day rendered greyed-out and
  // unselectable is worse than an absent one: the customer taps it, nothing
  // happens, and nothing explains why.
  const dates = useMemo(() => bookableDays(7), []);
  const selectedDay = dates[dateIdx] ?? dates[0];
  // Same-day slots that have already passed (or fall inside the lead time)
  // are not offered at all, rather than offered and rejected by the API.
  const slots = useMemo(() => (selectedDay ? bookableSlots(selectedDay) : []), [selectedDay]);
  const selectedSlot = slots[slot] ?? slots[0];

  const addAttachment = async () => {
    if (attaching || attachments.length >= MAX_TICKET_ATTACHMENTS) {
      if (attachments.length >= MAX_TICKET_ATTACHMENTS) {
        setAttachError(`You can attach up to ${MAX_TICKET_ATTACHMENTS} files.`);
      }
      return;
    }
    setAttaching(true);
    setAttachError(undefined);
    const result = await pickTicketAttachment('library', '/service/attachments/upload');
    if (result && !result.ok) setAttachError(result.message);
    if (result && result.ok) setAttachments((prev) => [...prev, result.attachment]);
    setAttaching(false);
  };

  const submit = async () => {
    const owned = ownedVehicles[vehicle];
    const centre = branches[branch];
    if (!owned || !centre) {
      setError('Select a vehicle and service centre to continue.');
      return;
    }
    setLoading(true);
    setError(undefined);
    if (!selectedDay || !selectedSlot) {
      setError('Choose a date and time for this service.');
      setLoading(false);
      return;
    }
    const at = slotDateTime(selectedDay, selectedSlot);

    // Re-checked HERE, not only when the list was built. A form open since
    // 13:59 still shows a 2:00 PM slot at 14:05; only this catches that.
    const invalid = validateBooking(at);
    if (invalid) {
      setError(invalid);
      setLoading(false);
      return;
    }
    try {
      await createAppointment({
        ownedVehicleId: owned.id,
        branchId: centre.id,
        serviceType: type,
        scheduledAt: at.toISOString(),
        issueDescription: cleanText(issue) || SERVICE_TYPE_META[type].label,
        mileageAtBooking: owned.mileage,
        attachmentUrls: attachments.map((attachment) => attachment.url),
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
          <Txt variant="headlineLarge" center style={{ marginTop: spacing.xl }}>{tr('service.serviceRequested')}</Txt>
          <Txt variant="bodyLarge" tone="secondary" center style={{ marginTop: spacing.sm }}>
            {tr('service.requestedDetail', { service: SERVICE_TYPE_META[type].label.toLowerCase(), branch: branches[branch]?.name ?? 'Elizade' })}
          </Txt>
        </View>
        <View style={{ paddingBottom: insets.bottom + spacing.md }}>
          <PrimaryButton label={tr('common.done')} icon="arrow-forward" onPress={() => router.back()} />
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
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>{tr('service.bookAService')}</Txt>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 40 }}>
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
          {slots.map((s, i) => (
            <Pressable
              key={s.label}
              onPress={() => setSlot(i)}
              style={[styles.slot, { backgroundColor: slot === i ? t.colors.primary : t.colors.surfaceAlt, borderColor: slot === i ? t.colors.primary : t.colors.border }]}
            >
              <Txt variant="titleSmall" color={slot === i ? t.colors.onPrimary : t.colors.textPrimary}>
                {s.label}
              </Txt>
            </Pressable>
          ))}
        </View>

        <Label text="Describe the issue (optional)" />
        <TextInput
          // iOS renders a LIGHT keyboard in dark mode without this.
          keyboardAppearance={t.isDark ? 'dark' : 'light'}
          value={issue}
          onChangeText={setIssue}
          maxLength={1000}
          placeholder={tr('service.issuePlaceholder')}
          placeholderTextColor={t.colors.textTertiary}
          multiline
          style={[
            t.type.bodyLarge,
            { minHeight: 100, textAlignVertical: 'top', color: t.colors.textPrimary, backgroundColor: t.colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: t.colors.border, padding: 14 },
          ]}
        />

        <Pressable
          onPress={addAttachment}
          disabled={attaching || attachments.length >= MAX_TICKET_ATTACHMENTS}
          style={[
            styles.attach,
            {
              borderColor: t.colors.border,
              opacity: attaching || attachments.length >= MAX_TICKET_ATTACHMENTS ? 0.5 : 1,
            },
          ]}
        >
          {attaching ? (
            <ActivityIndicator size="small" color={t.colors.primary} />
          ) : (
            <Ionicons name="camera-outline" size={20} color={t.colors.primary} />
          )}
          <Txt variant="titleSmall" color={t.colors.primary} style={{ marginLeft: 8 }}>{tr('service.addAttachments')}</Txt>
        </Pressable>
        <AttachmentDrafts
          items={attachments}
          onRemove={(url) => setAttachments((prev) => prev.filter((attachment) => attachment.url !== url))}
        />
        {attachError ? (
          <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: spacing.sm }}>
            {attachError}
          </Txt>
        ) : null}

        {error ? (
          <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: spacing.md }}>
            {error}
          </Txt>
        ) : null}

        <View style={{ height: spacing.xl }} />
        <PrimaryButton
          label={tr('service.requestService')}
          icon="construct"
          loading={loading}
          disabled={ownedVehicles.length === 0 || branches.length === 0 || attaching}
          onPress={submit}
        />
      </KeyboardAwareScrollView>
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
  attach: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', marginTop: spacing.lg },
  successIcon: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
});
