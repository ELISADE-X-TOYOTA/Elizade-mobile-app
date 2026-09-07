import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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

/**
 * What kind of booking a card is showing.
 *
 * A customer's bookings are not all the same thing, and the card gave no clue
 * which was which — the same generic car icon and the same layout regardless.
 * The kind now drives the icon and a labelled chip, so it is legible at a
 * glance rather than inferred from the vehicle name.
 *
 * NOTE: only `testDrive` reaches this screen today. The tab is backed solely
 * by `GET /sales/test-drives`; service appointments live in the Service tab
 * and are not merged in here. `service` is defined because the card is now
 * genuinely kind-driven and that is the single place a merge would plug into
 * — not because servicing currently appears.
 */
type BookingKind = 'testDrive' | 'service';

const BOOKING_KIND_META: Record<
  BookingKind,
  { icon: keyof typeof Ionicons.glyphMap; labelKey: string }
> = {
  testDrive: { icon: 'car-sport', labelKey: 'bookings.typeTestDrive' },
  service: { icon: 'construct', labelKey: 'bookings.typeService' },
};

/** My test-drive bookings — backed by GET /sales/test-drives. */
export default function Bookings() {
  const t = useTheme();
  const { t: tr } = useTranslation();
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

  // *Text variants: this drives both the badge tint AND its label, so it has
  // to be the readable value — the base fills are 2–3:1 as type.
  const toneColor = (tone: 'info' | 'success' | 'warning' | 'error') => {
    if (tone === 'success') return t.colors.successText;
    if (tone === 'warning') return t.colors.warningText;
    if (tone === 'error') return t.colors.errorText;
    return t.colors.infoText;
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.screenH, paddingVertical: spacing.sm }}>
        <Txt variant="headlineMedium">{tr('bookings.title')}</Txt>
        <Txt tone="secondary">{tr('bookings.subtitle')}</Txt>
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={t.colors.primary}
              colors={[t.colors.primary]}
              progressBackgroundColor={t.colors.surface} />}
      >
        {error ? (
          <Txt color={t.colors.errorText} style={{ marginBottom: spacing.md }}>
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

function BookingCard({
  booking,
  statusColor,
  kind = 'testDrive',
}: {
  booking: TestDriveBooking;
  statusColor: string;
  kind?: BookingKind;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const when = new Date(booking.scheduledAt);
  const kindMeta = BOOKING_KIND_META[kind];

  /*
    THE LIVE STAGE, NOT `booking.status`.

    `status` is written once when the booking is created and never advanced —
    there is no admin endpoint for test drive bookings at all. Sales staff move
    the LEAD through the pipeline, which is why a customer watched their
    request sit on "Requested" while it was actually being worked.

    Falls back to the frozen status only for rows that predate lead linking,
    which is the one case where there is nothing better to show.
  */
  const label = booking.leadStageLabel ?? TEST_DRIVE_STATUS_META[booking.status].label;
  const trackable = Boolean(booking.leadId);

  const body = (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: t.colors.primary + '14' }]}>
          <Ionicons name={kindMeta.icon} size={22} color={t.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Txt variant="titleMedium" numberOfLines={1}>
            {booking.vehicleLabel}
          </Txt>
          {/*
            The kind, stated rather than implied. The card previously showed
            only the vehicle and the branch, which is identical whether you
            booked a test drive or a service — a customer had no way to tell
            their bookings apart except by remembering.
          */}
          <View style={styles.kindRow}>
            <View style={[styles.kindChip, { backgroundColor: t.colors.primary + '14' }]}>
              <Txt variant="labelSmall" color={t.colors.primary}>
                {tr(kindMeta.labelKey)}
              </Txt>
            </View>
            <Txt
              variant="bodySmall"
              tone="secondary"
              numberOfLines={1}
              style={{ marginLeft: 6, flex: 1 }}
            >
              {booking.branchName}
            </Txt>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
          <Txt variant="labelSmall" color={statusColor}>
            {label}
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
        {trackable ? (
          <>
            <View style={{ flex: 1 }} />
            <Txt variant="labelSmall" color={t.colors.primary}>
              {tr('bookings.viewProgress')}
            </Txt>
            <Ionicons name="chevron-forward" size={14} color={t.colors.primary} />
          </>
        ) : null}
      </View>
    </View>
  );

  // Routes to the lead tracker that already exists — `app/lead/[id].tsx`
  // renders the full step-by-step progress and the staff timeline. No second
  // detail screen: one place where a customer is told where things stand.
  if (!trackable) return body;
  return (
    <Pressable
      // The kind travels with the booking. The lead itself does not record
      // which customer action created it in any form worth rendering, and the
      // card already knows — so passing it beats inferring it there.
      onPress={() =>
        router.push({ pathname: '/lead/[id]', params: { id: booking.leadId!, kind } })
      }
      accessibilityRole="button"
      accessibilityLabel={tr('bookings.viewProgress')}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {body}
    </Pressable>
  );
}

function EmptyState({ title, body, onBrowse }: { title: string; body: string; onBrowse: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
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
        <Txt variant="titleSmall" color={t.colors.onPrimary}>{tr('common.browseShowroom')}</Txt>
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
  kindRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  kindChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  browseBtn: { paddingHorizontal: 20, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
