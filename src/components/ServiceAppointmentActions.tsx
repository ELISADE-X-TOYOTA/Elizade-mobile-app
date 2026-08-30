import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { cancelAppointment, rescheduleAppointment } from '../data/serviceRepository';
import { AppointmentStatus, ServiceAppointment } from '../domain/types';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './PrimaryButton';
import { Txt } from './Txt';

const RESCHEDULEABLE: AppointmentStatus[] = ['requested', 'confirmed'];
/** Backend only allows cancel while status is requested or confirmed. */
const CANCELLABLE: AppointmentStatus[] = ['requested', 'confirmed'];
const TIME_SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM'];
const SLOT_HOURS = [9, 10, 12, 14, 16];

interface Props {
  appointment: ServiceAppointment;
  onUpdated?: (appointment: ServiceAppointment) => void;
}

type Sheet = 'reschedule' | 'cancel' | null;

/** Customer actions shared by service cards and the appointment detail. */
export function ServiceAppointmentActions({ appointment, onUpdated }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [dateIdx, setDateIdx] = useState(1);
  const [slot, setSlot] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string>();

  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86_400_000)),
    [],
  );
  const canReschedule = RESCHEDULEABLE.includes(appointment.status);
  const canCancel = CANCELLABLE.includes(appointment.status);

  if (!canReschedule && !canCancel) return null;

  const close = () => {
    if (!working) {
      setSheet(null);
      setError(undefined);
    }
  };

  const open = (next: Exclude<Sheet, null>) => {
    setError(undefined);
    setSheet(next);
  };

  const submitReschedule = async () => {
    const at = new Date(dates[dateIdx]);
    at.setHours(SLOT_HOURS[slot] ?? 9, 0, 0, 0);
    setWorking(true);
    setError(undefined);
    try {
      const updated = await rescheduleAppointment(appointment.id, at.toISOString());
      onUpdated?.(updated);
      setSheet(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reschedule this appointment.');
    } finally {
      setWorking(false);
    }
  };

  const submitCancel = async () => {
    setWorking(true);
    setError(undefined);
    try {
      const updated = await cancelAppointment(appointment.id);
      onUpdated?.(updated);
      setSheet(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel this appointment.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <View style={styles.actions}>
        {canReschedule && (
          <View style={styles.action}>
            <PrimaryButton label={tr('service.reschedule')} variant="outline" icon="calendar-outline" onPress={() => open('reschedule')} />
          </View>
        )}
        {canCancel && (
          <View style={styles.action}>
            <PrimaryButton label={tr('service.cancel')} variant="outline" icon="close-circle-outline" onPress={() => open('cancel')} />
          </View>
        )}
      </View>

      <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={close} />
          <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: spacing.md }]}>
            <View style={[styles.handle, { backgroundColor: t.colors.border }]} />
            {sheet === 'cancel' ? (
              <>
                <Txt variant="titleLarge">{tr('service.cancelConfirm')}</Txt>
                <Txt tone="secondary" style={{ marginTop: spacing.sm }}>
                  This will cancel your {appointment.serviceType} appointment on{' '}
                  {new Date(appointment.scheduledAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })}.
                </Txt>
                {error ? <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: spacing.md }}>{error}</Txt> : null}
                <View style={styles.confirmActions}>
                  <View style={styles.action}>
                    <PrimaryButton label={tr('service.keepAppointment')} variant="outline" disabled={working} onPress={close} />
                  </View>
                  <View style={styles.action}>
                    <PrimaryButton label={tr('service.cancelAppointment')} loading={working} onPress={submitCancel} />
                  </View>
                </View>
              </>
            ) : (
              <>
                <Txt variant="titleLarge">{tr('service.rescheduleTitle')}</Txt>
                <Txt variant="bodySmall" tone="secondary" style={{ marginTop: 4 }}>{tr('service.rescheduleSubtitle')}</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                  {dates.map((date, i) => (
                    <Pressable
                      key={date.toISOString()}
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
                        {date.toLocaleDateString('en', { weekday: 'short' })}
                      </Txt>
                      <Txt variant="titleMedium" color={dateIdx === i ? t.colors.onPrimary : t.colors.textPrimary}>
                        {date.getDate()}
                      </Txt>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.slotRow}>
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
                {error ? <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: spacing.sm }}>{error}</Txt> : null}
                <View style={{ marginTop: spacing.md }}>
                  <PrimaryButton label={tr('service.confirmNewTime')} icon="calendar" loading={working} onPress={submitReschedule} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  action: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.md },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  dateRow: { gap: 8, paddingVertical: spacing.md },
  dateChip: { width: 56, height: 64, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { paddingHorizontal: 14, height: 42, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
