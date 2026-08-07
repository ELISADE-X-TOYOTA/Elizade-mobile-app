import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../src/components/Skeleton';
import { Txt } from '../../src/components/Txt';
import {
  TEST_DRIVE_STATUS_META,
  TestDriveBooking,
  TestDriveStatus,
} from '../../src/domain/types';
import { useTestDrives } from '../../src/hooks/useTestDrives';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';

const TABS = ['Upcoming', 'Past'] as const;
const UPCOMING: TestDriveStatus[] = ['requested', 'confirmed'];
const PAST: TestDriveStatus[] = ['completed', 'cancelled'];

/** My test-drive bookings — backed by GET /sales/test-drives. */
export default function Bookings() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const { bookings, loading, error, reload } = useTestDrives();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const filtered = useMemo(
    () => bookings.filter((b) => (tab === 0 ? UPCOMING.includes(b.status) : PAST.includes(b.status))),
    [bookings, tab],
  );

  const toneColor = (tone: 'info' | 'success' | 'warning' | 'error') => {
    if (tone === 'success') return t.colors.success;
    if (tone === 'warning') return t.colors.warning;
    if (tone === 'error') return t.colors.error;
    return t.colors.info;
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.screenH, paddingVertical: spacing.sm }}>
        <Txt variant="headlineMedium">Bookings</Txt>
        <Txt tone="secondary">Your scheduled test drives</Txt>
      </View>

      <View style={[styles.tabs, { marginHorizontal: spacing.screenH, backgroundColor: t.colors.surfaceAlt }]}>
        {TABS.map((label, i) => {
          const active = tab === i;
          return (
            <Pressable
              key={label}
              onPress={() => setTab(i)}
              style={[styles.tab, active && { backgroundColor: t.colors.primary }]}
            >
              <Txt variant="titleSmall" color={active ? t.colors.onPrimary : t.colors.textSecondary}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={t.colors.primary} />}
      >
        {error ? (
          <Txt color={t.colors.error} style={{ marginBottom: spacing.md }}>
            {error}
          </Txt>
        ) : null}

        {loading && bookings.length === 0 ? (
          <>
            <Skeleton height={96} radius={radius.lg} />
            <View style={{ height: 12 }} />
            <Skeleton height={96} radius={radius.lg} />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={tab === 0 ? 'No upcoming test drives' : 'No past test drives'}
            body="Browse the showroom and book a test drive from any vehicle."
            onBrowse={() => router.push('/(tabs)/shop')}
          />
        ) : (
          filtered.map((b) => <BookingCard key={b.id} booking={b} statusColor={toneColor(TEST_DRIVE_STATUS_META[b.status].tone)} />)
        )}
      </ScrollView>
    </View>
  );
}

function BookingCard({ booking, statusColor }: { booking: TestDriveBooking; statusColor: string }) {
  const t = useTheme();
  const meta = TEST_DRIVE_STATUS_META[booking.status];
  const when = new Date(booking.scheduledAt);

  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: t.colors.primary + '14' }]}>
          <Ionicons name="car-sport" size={22} color={t.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Txt variant="titleMedium" numberOfLines={1}>
            {booking.vehicleLabel}
          </Txt>
          <Txt variant="bodySmall" tone="secondary" numberOfLines={1}>
            {booking.branchName}
          </Txt>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
          <Txt variant="labelSmall" color={statusColor}>
            {meta.label}
          </Txt>
        </View>
      </View>
      <View style={[styles.metaRow, { borderTopColor: t.colors.border }]}>
        <Ionicons name="calendar-outline" size={16} color={t.colors.textSecondary} />
        <Txt variant="bodySmall" tone="secondary" style={{ marginLeft: 8 }}>
          {when.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}
          {' · '}
          {when.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
        </Txt>
      </View>
    </View>
  );
}

function EmptyState({ title, body, onBrowse }: { title: string; body: string; onBrowse: () => void }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: spacing.md }}>
      <View style={[styles.emptyIcon, { backgroundColor: t.colors.surfaceAlt }]}>
        <Ionicons name="calendar-outline" size={36} color={t.colors.textTertiary} />
      </View>
      <Txt variant="titleLarge" center style={{ marginTop: spacing.md }}>
        {title}
      </Txt>
      <Txt tone="secondary" center style={{ marginTop: spacing.sm }}>
        {body}
      </Txt>
      <Pressable onPress={onBrowse} style={[styles.browseBtn, { backgroundColor: t.colors.primary, marginTop: spacing.xl }]}>
        <Txt variant="titleSmall" color={t.colors.onPrimary}>
          Browse showroom
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderRadius: radius.pill, padding: 4, marginTop: spacing.sm },
  tab: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  browseBtn: { paddingHorizontal: 20, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
