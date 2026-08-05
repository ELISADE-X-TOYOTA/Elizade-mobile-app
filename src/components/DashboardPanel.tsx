import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DashboardSummaryDto } from '../api/dashboard';
import { SERVICE_TYPE_META, ServiceType } from '../domain/types';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { Skeleton } from './Skeleton';
import { Txt } from './Txt';
import { ON_DARK_INK } from '../theme/colors';

interface Props {
  summary: DashboardSummaryDto | null;
  loading: boolean;
}

const dayDiff = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);

/**
 * "At a glance" panel on Home, driven by `/dashboard/summary`.
 *
 * Shows the single most relevant thing first — an upcoming appointment, or
 * else the next service milestone — then only the alerts that need action.
 * Counts that are zero are never rendered, so the panel stays quiet when
 * there's nothing to do.
 */
export const DashboardPanel = memo(function DashboardPanel({ summary, loading }: Props) {
  const t = useTheme();

  if (loading) {
    return (
      <View style={{ paddingHorizontal: spacing.screenH, marginTop: spacing.lg }}>
        <Skeleton height={104} radius={radius.lg} />
      </View>
    );
  }

  // Nothing to show for a brand-new customer with no vehicle or activity.
  if (!summary || (!summary.primaryVehicle && !summary.nextAppointment)) return null;

  const appt = summary.nextAppointment;
  const vehicle = summary.primaryVehicle;
  const dueDays = vehicle?.nextServiceDue ? dayDiff(vehicle.nextServiceDue) : null;

  const alerts: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    tone: string;
    onPress: () => void;
  }[] = [];

  if (summary.pendingAdditionalWork > 0) {
    alerts.push({
      key: 'work',
      icon: 'alert-circle',
      label: `${summary.pendingAdditionalWork} approval${summary.pendingAdditionalWork > 1 ? 's' : ''} needed`,
      tone: t.colors.warning,
      onPress: () => router.push('/(tabs)/service'),
    });
  }
  if (summary.activeRecalls > 0) {
    alerts.push({
      key: 'recall',
      icon: 'warning',
      label: `${summary.activeRecalls} open recall${summary.activeRecalls > 1 ? 's' : ''}`,
      tone: t.colors.error,
      onPress: () => router.push('/warranty'),
    });
  }
  if (summary.openSupportTickets > 0) {
    alerts.push({
      key: 'tickets',
      icon: 'chatbubble-ellipses',
      label: `${summary.openSupportTickets} open ticket${summary.openSupportTickets > 1 ? 's' : ''}`,
      tone: t.colors.info,
      onPress: () => router.push('/(tabs)/support'),
    });
  }

  return (
    <View style={{ paddingHorizontal: spacing.screenH, marginTop: spacing.lg }}>
      {/* Primary card: next appointment, else next service milestone */}
      <Pressable
        onPress={() =>
          appt ? router.push(`/service-detail/${appt.id}`) : router.push('/book-service')
        }
      >
        <LinearGradient
          colors={t.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={[styles.iconWrap, { backgroundColor: t.colors.accent }]}>
            <MaterialCommunityIcons
              name={appt ? 'calendar-clock' : 'car-wrench'}
              size={24}
              color={t.colors.onAccent}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Txt variant="labelSmall" color="rgba(255,255,255,0.7)">
              {appt ? 'NEXT APPOINTMENT' : 'NEXT SERVICE DUE'}
            </Txt>

            {appt ? (
              <>
                <Txt variant="titleMedium" color={ON_DARK_INK} numberOfLines={1}>
                  {SERVICE_TYPE_META[appt.serviceType as ServiceType]?.label ?? appt.serviceType} ·{' '}
                  {new Date(appt.scheduledAt).toLocaleDateString('en', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Txt>
                <Txt variant="bodySmall" color="rgba(255,255,255,0.8)" numberOfLines={1}>
                  {appt.vehicleLabel} · {appt.branchName}
                </Txt>
              </>
            ) : (
              <>
                <Txt variant="titleMedium" color={ON_DARK_INK} numberOfLines={1}>
                  {vehicle?.label}
                  {dueDays !== null && dueDays >= 0 ? ` · in ${dueDays} days` : ' · due now'}
                </Txt>
                <Txt variant="bodySmall" color="rgba(255,255,255,0.8)" numberOfLines={1}>
                  {vehicle?.nextServiceMileage
                    ? `At ${vehicle.nextServiceMileage.toLocaleString()} km · Tap to book`
                    : 'Tap to book'}
                </Txt>
              </>
            )}
          </View>

          <Ionicons name="chevron-forward" size={22} color={ON_DARK_INK} />
        </LinearGradient>
      </Pressable>

      {/* Only things that need action */}
      {alerts.length > 0 && (
        <View style={styles.alertRow}>
          {alerts.map((a) => (
            <Pressable
              key={a.key}
              onPress={a.onPress}
              style={[styles.alert, { backgroundColor: a.tone + '18', borderColor: a.tone + '40' }]}
            >
              <Ionicons name={a.icon} size={14} color={a.tone} />
              <Txt variant="labelMedium" color={a.tone} style={{ marginLeft: 6 }} numberOfLines={1}>
                {a.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
