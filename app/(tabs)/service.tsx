import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../src/components/Skeleton';
import { ServiceAppointmentActions } from '../../src/components/ServiceAppointmentActions';
import { Txt } from '../../src/components/Txt';
import { OWNED_VEHICLES } from '../../src/data/mock';
import {
  APPOINTMENT_STATUS_META,
  AppointmentStatus,
  ServiceAppointment,
  ServiceHistoryItem,
  SERVICE_TYPE_META,
} from '../../src/domain/types';
import { useAppointments } from '../../src/hooks/useService';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { price } from '../../src/utils/format';
import { ON_DARK_INK, solid, tint } from '../../src/theme/colors';

const TABS = ['Upcoming', 'Active', 'History'] as const;
const UPCOMING: AppointmentStatus[] = ['requested', 'confirmed'];
const ACTIVE: AppointmentStatus[] = ['in_progress', 'awaiting_approval'];

export default function Service() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const { appointments, history, loading, error, reload } = useAppointments();

  // Refresh when returning from booking / tracking so changes reflect.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const filtered = useMemo(
    () => appointments.filter((a) => (tab === 0 ? UPCOMING.includes(a.status) : ACTIVE.includes(a.status))),
    [appointments, tab],
  );

  const owned = OWNED_VEHICLES[0];
  const dueInDays = Math.round((new Date(owned.nextServiceDue).getTime() - Date.now()) / 86_400_000);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingTop: insets.top }}>
      <View style={[styles.headerRow, { paddingHorizontal: spacing.screenH }]}>
        <Txt variant="headlineMedium" style={{ flex: 1 }}>
          Service
        </Txt>
        <Pressable onPress={() => router.push('/book-service')} style={[styles.addBtn, { backgroundColor: solid(t.colors.accent) }]}>
          <Ionicons name="add" size={20} color={t.colors.onAccent} />
          <Txt variant="titleSmall" color={t.colors.onAccent} style={{ marginLeft: 4 }}>
            Book
          </Txt>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={t.colors.primary}
              colors={[t.colors.primary]}
              progressBackgroundColor={t.colors.surface} />}
      >
        {/* Reminder banner */}
        <Pressable onPress={() => router.push('/book-service')} style={{ paddingHorizontal: spacing.screenH }}>
          <LinearGradient colors={t.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.reminder}>
            <View style={[styles.reminderIcon, { backgroundColor: solid(t.colors.accent) }]}>
              <MaterialCommunityIcons name="car-wrench" size={24} color={t.colors.onAccent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Txt variant="labelSmall" color="rgba(255,255,255,0.7)">
                NEXT SERVICE DUE
              </Txt>
              <Txt variant="titleMedium" color={ON_DARK_INK}>
                {owned.make} {owned.model} · in {dueInDays} days
              </Txt>
              <Txt variant="bodySmall" color="rgba(255,255,255,0.8)">
                At {owned.nextServiceMileage.toLocaleString()} km · Tap to book
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={22} color={ON_DARK_INK} />
          </LinearGradient>
        </Pressable>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          {TABS.map((label, i) => {
            const active = i === tab;
            return (
              <Pressable key={label} style={{ flex: 1 }} onPress={() => setTab(i)}>
                {active ? (
                  <LinearGradient colors={t.gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabItem}>
                    <Txt variant="titleSmall" color={t.colors.onAccent}>
                      {label}
                    </Txt>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabItem}>
                    <Txt variant="titleSmall" tone="secondary">
                      {label}
                    </Txt>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: spacing.screenH, paddingTop: spacing.md, gap: 14 }}>
          {loading ? (
            [0, 1].map((i) => <Skeleton key={i} height={96} radius={radius.lg} />)
          ) : error ? (
            <Txt tone="secondary">Couldn't load service. {error}</Txt>
          ) : tab === 2 ? (
            history.length ? (
              history.map((h) => <HistoryCard key={h.id} item={h} />)
            ) : (
              <Empty label="No service history yet." />
            )
          ) : filtered.length ? (
            filtered.map((a) => <AppointmentCard key={a.id} appt={a} onUpdated={reload} />)
          ) : (
            <Empty label={tab === 0 ? 'No upcoming appointments.' : 'No active service jobs.'} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function AppointmentCard({ appt, onUpdated }: { appt: ServiceAppointment; onUpdated: () => void }) {
  const t = useTheme();
  const meta = SERVICE_TYPE_META[appt.serviceType];
  const status = APPOINTMENT_STATUS_META[appt.status];
  const toneColor =
    // *Text variants — rendered as type on a tinted pill.
    status.tone === 'success' ? t.colors.successText : status.tone === 'warning' ? t.colors.warningText : status.tone === 'info' ? t.colors.infoText : t.colors.textSecondary;
  const date = new Date(appt.scheduledAt);

  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}>
      <Pressable onPress={() => router.push(`/service-detail/${appt.id}`)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.typeIcon, { backgroundColor: t.colors.primary + '14' }]}>
            <MaterialCommunityIcons name={meta.icon as any} size={22} color={t.colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Txt variant="titleMedium" numberOfLines={1}>
              {meta.label}
            </Txt>
            <Txt variant="bodySmall" tone="secondary" numberOfLines={1}>
              {appt.vehicleTitle} · {appt.branchName}
            </Txt>
          </View>
          <View style={[styles.pill, { backgroundColor: toneColor + '1F' }]}>
            <Txt variant="labelSmall" color={toneColor}>
              {status.label}
            </Txt>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar" size={15} color={t.colors.primary} />
          <Txt variant="titleSmall" style={{ marginLeft: 6, flex: 1 }}>
            {date.toLocaleDateString('en', { day: 'numeric', month: 'short' })} ·{' '}
            {date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
          </Txt>
          {ACTIVE.includes(appt.status) && (
            <Txt variant="titleSmall" color={t.colors.primary}>
              Track →
            </Txt>
          )}
        </View>
      </Pressable>
      <ServiceAppointmentActions appointment={appt} onUpdated={() => onUpdated()} />
    </View>
  );
}

function HistoryCard({ item }: { item: ServiceHistoryItem }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.typeIcon, { backgroundColor: tint(t.colors.success, 0.094) }]}>
          <Ionicons name="checkmark-done" size={20} color={t.colors.successText} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Txt variant="titleMedium" numberOfLines={1}>
            {item.type}
          </Txt>
          <Txt variant="bodySmall" tone="secondary" numberOfLines={1}>
            {new Date(item.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })} · {item.branchName}
          </Txt>
        </View>
        <Txt variant="titleSmall" color={t.colors.primary}>
          {price(item.cost)}
        </Txt>
      </View>
      <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
      <Txt variant="bodySmall" tone="secondary">
        {item.description} · {item.mileage.toLocaleString()} km
      </Txt>
    </View>
  );
}

function Empty({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: 60 }}>
      <View style={[styles.emptyIcon, { backgroundColor: t.colors.primary + '14' }]}>
        <MaterialCommunityIcons name="car-wrench" size={40} color={t.colors.primary} />
      </View>
      <Txt tone="secondary" style={{ marginTop: 14 }}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 40, borderRadius: radius.pill },
  reminder: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg },
  reminderIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.screenH, marginTop: spacing.lg, padding: 4, borderRadius: radius.pill, borderWidth: 1 },
  tabItem: { height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  card: { padding: 14, borderRadius: radius.lg, borderWidth: 1 },
  typeIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  divider: { height: 1, marginVertical: 12 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
});
