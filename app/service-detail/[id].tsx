import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Skeleton } from '../../src/components/Skeleton';
import { ServiceAppointmentActions } from '../../src/components/ServiceAppointmentActions';
import { SecureAttachment } from '../../src/components/SecureAttachment';
import { Txt } from '../../src/components/Txt';
import { approveAdditionalWork } from '../../src/data/serviceRepository';
import {
  APPOINTMENT_STATUS_META,
  SERVICE_TYPE_META,
  ServiceAppointment,
  ServiceStage,
} from '../../src/domain/types';
import { useAppointments, useServiceJob } from '../../src/hooks/useService';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { price } from '../../src/utils/format';
import { solid } from '../../src/theme/colors';

export default function ServiceDetail() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appointments, loading: apptLoading } = useAppointments();
  const { job, loading: jobLoading, setJob } = useServiceJob(id ?? '');
  const [working, setWorking] = useState(false);
  const [appointmentOverride, setAppointmentOverride] = useState<ServiceAppointment>();

  const appt = useMemo(
    () => appointmentOverride ?? appointments.find((a) => a.id === id),
    [appointmentOverride, appointments, id],
  );
  const loading = apptLoading || jobLoading;

  const decide = async (approve: boolean) => {
    if (!job?.additionalWork || !id) return;
    setWorking(true);
    const updated = await approveAdditionalWork(id, job.additionalWork.id, approve);
    if (updated) setJob({ ...updated });
    setWorking(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.screenH, paddingTop: spacing.sm, paddingBottom: 60, gap: 14 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <Skeleton height={90} radius={radius.lg} />
            <Skeleton height={220} radius={radius.lg} />
          </>
        ) : (
          <>
            {/* Header */}
            {appt && (
              <>
                <Txt variant="headlineSmall">{SERVICE_TYPE_META[appt.serviceType].label}</Txt>
                <Txt tone="secondary" style={{ marginTop: 2 }}>
                  {appt.vehicleTitle} · {appt.branchName}
                </Txt>
                <ServiceAppointmentActions appointment={appt} onUpdated={setAppointmentOverride} />
                {!!appt.attachmentUrls?.length && (
                  <Card>
                    <Txt variant="titleMedium" style={{ marginBottom: spacing.sm }}>
                      Issue attachments
                    </Txt>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {appt.attachmentUrls.slice(0, 5).map((url) => (
                        <SecureAttachment key={url} uri={url} style={styles.attachment} />
                      ))}
                    </View>
                  </Card>
                )}
              </>
            )}

            {/* ETA */}
            {job && (
              <View style={[styles.eta, { backgroundColor: t.colors.primary }]}>
                <MaterialCommunityIcons name="progress-clock" size={24} color={t.colors.onPrimary} />
                <View style={{ marginLeft: 12 }}>
                  <Txt variant="labelSmall" color={t.colors.onPrimary} style={{ opacity: 0.7 }}>{tr('service.estimatedCompletion')}</Txt>
                  <Txt variant="titleMedium" color={t.colors.onPrimary}>
                    {new Date(job.estimatedCompletion).toLocaleString('en', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </Txt>
                </View>
              </View>
            )}

            {/* Progress timeline */}
            {job && (
              <Card>
                <Txt variant="titleMedium" style={{ marginBottom: spacing.md }}>{tr('common.progress')}</Txt>
                {job.stages.map((s, i) => (
                  <Stage key={s.label} stage={s} last={i === job.stages.length - 1} active={!s.completed && (i === 0 || job.stages[i - 1].completed)} />
                ))}
              </Card>
            )}

            {/* Additional work approval */}
            {job?.additionalWork && (
              <View style={[styles.card, styles.approvalCard, { backgroundColor: t.colors.surface, borderColor: solid(t.colors.warning) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="alert-circle" size={20} color={t.colors.warningText} />
                  <Txt variant="titleMedium" style={{ marginLeft: 8 }}>{tr('service.additionalWork')}</Txt>
                </View>
                <Txt tone="secondary" style={{ marginTop: 8 }}>
                  {job.additionalWork.description}
                </Txt>
                <Txt variant="headlineSmall" color={t.colors.primary} style={{ marginTop: 8 }}>
                  {price(job.additionalWork.cost)}
                </Txt>
                {job.additionalWork.status === 'pending_approval' ? (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton label={tr('service.decline')} variant="outline" loading={working} onPress={() => decide(false)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton label={tr('service.approve')} loading={working} onPress={() => decide(true)} />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.decided, { backgroundColor: (job.additionalWork.status === 'approved' ? t.colors.success : t.colors.error) + '1F' }]}>
                    <Ionicons
                      name={job.additionalWork.status === 'approved' ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={job.additionalWork.status === 'approved' ? t.colors.successText : t.colors.errorText}
                    />
                    <Txt variant="titleSmall" color={job.additionalWork.status === 'approved' ? t.colors.successText : t.colors.errorText} style={{ marginLeft: 6 }}>
                      {job.additionalWork.status === 'approved' ? 'Approved' : 'Declined'}
                    </Txt>
                  </View>
                )}
              </View>
            )}

            {/* Technician notes */}
            {job?.technicianNotes && (
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons name="account-wrench" size={20} color={t.colors.primary} />
                  <Txt variant="titleMedium" style={{ marginLeft: 8 }}>{tr('service.technicianNotes')}</Txt>
                </View>
                <Txt tone="secondary">{job.technicianNotes}</Txt>
              </Card>
            )}

            {/* Invoice preview */}
            {job?.invoice && (
              <Card>
                <Txt variant="titleMedium" style={{ marginBottom: spacing.sm }}>{tr('service.invoicePreview')}</Txt>
                {job.invoice.lineItems.map((li) => (
                  <Line key={li.description} label={li.description} amount={li.amount} />
                ))}
                <Line label={tr('service.tax')} amount={job.invoice.tax} />
                <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
                <Line label={tr('common.total')} amount={job.invoice.total} bold />
              </Card>
            )}

            {!loading && !appt && !job && (
              <Txt tone="secondary">{tr('service.notFound')}</Txt>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}>{children}</View>;
}

function Stage({ stage, last, active }: { stage: ServiceStage; last: boolean; active: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const color = stage.completed ? t.colors.successText : active ? t.colors.primary : t.colors.textTertiary;
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ alignItems: 'center', marginRight: 12 }}>
        <View style={[styles.dot, { backgroundColor: stage.completed || active ? color : 'transparent', borderColor: color }]}>
          {stage.completed && <Ionicons name="checkmark" size={13} color={t.colors.onPrimary} />}
        </View>
        {!last && <View style={{ width: 2, flex: 1, marginVertical: 2, backgroundColor: stage.completed ? solid(t.colors.success) : t.colors.border }} />}
      </View>
      <View style={{ paddingBottom: last ? 0 : spacing.md, flex: 1 }}>
        <Txt variant="titleSmall" color={active ? t.colors.primary : undefined}>
          {stage.label}
        </Txt>
        {stage.timestamp && (
          <Txt variant="bodySmall" tone="secondary">
            {new Date(stage.timestamp).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
          </Txt>
        )}
        {active && !stage.timestamp && (
          <Txt variant="bodySmall" color={t.colors.primary}>{tr('service.inProgress')}</Txt>
        )}
      </View>
    </View>
  );
}

function Line({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Txt variant={bold ? 'titleMedium' : 'bodyMedium'} tone={bold ? 'primary' : 'secondary'}>
        {label}
      </Txt>
      <Txt variant={bold ? 'titleLarge' : 'titleSmall'} color={bold ? t.colors.primary : undefined}>
        {price(amount)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  approvalCard: { borderWidth: 1.5 },
  eta: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  decided: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginTop: spacing.md },
  divider: { height: 1, marginVertical: 10 },
  attachment: { width: 72, height: 72 },
});
