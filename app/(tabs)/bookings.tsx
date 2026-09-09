import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../src/components/Skeleton';
import { Txt } from '../../src/components/Txt';
import { BookingItem, BookingKind, selectBookings } from '../../src/domain/bookings';
import { Tone } from '../../src/domain/types';
import { useAppointments } from '../../src/hooks/useService';
import { cancelTestDrive } from '../../src/data/salesRepository';
import { useTestDrives } from '../../src/hooks/useTestDrives';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';

const TABS = ['Upcoming', 'Past'] as const;

/** Presentation for each kind: the icon and the chip's label. */
const BOOKING_KIND_META: Record<
  BookingKind,
  { icon: keyof typeof Ionicons.glyphMap; labelKey: string }
> = {
  testDrive: { icon: 'car-sport', labelKey: 'bookings.typeTestDrive' },
  service: { icon: 'construct', labelKey: 'bookings.typeService' },
};

/** Where a row opens, and what the link is called. Navigation lives here, not
 *  in `src/domain/bookings.ts`, which stays free of the navigator so its rules
 *  can be tested in plain node. */
function openBooking(item: BookingItem): (() => void) | null {
  if (!item.targetId) return null;
  const targetId = item.targetId;
  if (item.kind === 'service') return () => router.push(`/service-detail/${targetId}`);
  // The lead tracker that already exists — `app/lead/[id].tsx` renders the
  // full step-by-step progress and the staff timeline. No second detail
  // screen: one place where a customer is told where things stand. The kind
  // travels with it, because the lead does not record which customer action
  // created it in any renderable form.
  return () => router.push({ pathname: '/lead/[id]', params: { id: targetId, kind: item.kind } });
}

const OPEN_LABEL_KEY: Record<BookingKind, string> = {
  testDrive: 'bookings.viewProgress',
  service: 'bookings.viewDetails',
};

/**
 * Everything the customer has booked — test drives AND service visits.
 *
 * The tab used to be backed solely by `GET /sales/test-drives`, so a service
 * appointment simply was not here: it lived in the Service tab, and a customer
 * looking at a screen called "Bookings" saw half of theirs. Both sources are
 * merged now, each row labelled with its kind and routed to the tracker that
 * belongs to it.
 */
export default function Bookings() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);

  const {
    bookings,
    loading: loadingTestDrives,
    error: testDriveError,
    reload: reloadTestDrives,
  } = useTestDrives();
  const {
    appointments,
    loading: loadingAppointments,
    error: appointmentError,
    reload: reloadAppointments,
  } = useAppointments();

  const reload = useCallback(() => {
    reloadTestDrives();
    reloadAppointments();
  }, [reloadTestDrives, reloadAppointments]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const loading = loadingTestDrives || loadingAppointments;
  const loadedNothing = bookings.length === 0 && appointments.length === 0;

  const filtered = useMemo(
    () => selectBookings(bookings, appointments, tab === 0),
    [bookings, appointments, tab],
  );

  // *Text variants: this drives both the badge tint AND its label, so it has
  // to be the readable value — the base fills are 2–3:1 as type.
  const toneColor = (tone: Tone) => {
    if (tone === 'success') return t.colors.successText;
    if (tone === 'warning') return t.colors.warningText;
    if (tone === 'error') return t.colors.errorText;
    if (tone === 'muted') return t.colors.textSecondary;
    return t.colors.infoText;
  };

  /*
    Confirm before cancelling, and only ever from an explicit tap.

    Cancelling frees the slot at the branch and cannot be undone from here —
    a booking cancelled by a misplaced thumb is worse than one that took two
    taps.
  */
  const confirmCancel = useCallback(
    (item: BookingItem) => {
      Alert.alert(
        tr('bookings.cancelBooking'),
        tr('bookings.cancelConfirm', { title: item.title }),
        [
          { text: tr('common.back'), style: 'cancel' },
          {
            text: tr('bookings.cancelBooking'),
            style: 'destructive',
            onPress: async () => {
              try {
                await cancelTestDrive(item.sourceId);
                reload();
              } catch (e) {
                Alert.alert(
                  tr('bookings.cancelBooking'),
                  e instanceof Error ? e.message : tr('bookings.cancelFailed'),
                );
              }
            },
          },
        ],
      );
    },
    [tr, reload],
  );

  /*
    Each source is reported separately and BY NAME.

    Either endpoint can fail on its own, and the other list still renders. A
    single generic error above a half-populated list would be worse than
    useless — it looks like a complete list with a warning attached, so a
    customer would conclude a booking had vanished rather than that one feed
    was down.
  */
  const failures = [
    testDriveError ? `${tr('bookings.typeTestDrive')}: ${testDriveError}` : null,
    appointmentError ? `${tr('bookings.typeService')}: ${appointmentError}` : null,
  ].filter((line): line is string => Boolean(line));

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
        {failures.map((line) => (
          <Txt key={line} color={t.colors.errorText} style={{ marginBottom: spacing.sm }}>
            {line}
          </Txt>
        ))}

        {loading && loadedNothing ? (
          <>
            <Skeleton height={96} radius={radius.lg} />
            <View style={{ height: 12 }} />
            <Skeleton height={96} radius={radius.lg} />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={tab === 0 ? tr('bookings.emptyUpcoming') : tr('bookings.emptyPast')}
            body={tr('bookings.emptyBody')}
            onBrowse={() => router.push('/(tabs)/shop')}
          />
        ) : (
          filtered.map((item) => (
            <BookingCard
              key={item.key}
              item={item}
              statusColor={toneColor(item.tone)}
              // Only a test drive that is still ahead of you. Service
              // appointments have their own cancel on the detail screen, and a
              // finished booking has nothing to call off.
              onCancel={
                item.kind === 'testDrive' && item.upcoming ? () => confirmCancel(item) : undefined
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function BookingCard({
  item,
  statusColor,
  onCancel,
}: {
  item: BookingItem;
  statusColor: string;
  onCancel?: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const when = new Date(item.scheduledAt);
  const kindMeta = BOOKING_KIND_META[item.kind];
  const open = openBooking(item);

  const body = (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: t.colors.primary + '14' }]}>
          <Ionicons name={kindMeta.icon} size={22} color={t.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Txt variant="titleMedium" numberOfLines={1}>
            {item.title}
          </Txt>
          {/*
            The kind, stated rather than implied. The card previously showed
            only the vehicle and the branch, which is identical whether you
            booked a test drive or a service — and with both kinds now in one
            list, inferring it is not even possible.
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
              {item.branchName}
            </Txt>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
          <Txt variant="labelSmall" color={statusColor}>
            {item.statusLabel}
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
        {open ? (
          <>
            <View style={{ flex: 1 }} />
            <Txt variant="labelSmall" color={t.colors.primary}>
              {tr(OPEN_LABEL_KEY[item.kind])}
            </Txt>
            <Ionicons name="chevron-forward" size={14} color={t.colors.primary} />
          </>
        ) : null}
      </View>
      {/*
        CANCELLING WAS IMPOSSIBLE. Service appointments have had cancel and
        reschedule since they were built; test drives had neither, so someone
        who could no longer make it had no way to say so and the branch went
        on holding the slot. The endpoint exists now, and this is how a
        customer reaches it.

        Rendered inside the card but OUTSIDE the pressable wrapper below, so
        cancelling cannot be triggered by a stray tap meant to open the
        booking.
      */}
      {onCancel ? (
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={`${tr('bookings.cancelBooking')} — ${item.title}`}
          hitSlop={6}
          style={({ pressed }) => [styles.cancelRow, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="close-circle-outline" size={15} color={t.colors.errorText} />
          <Txt variant="labelSmall" color={t.colors.errorText} style={{ marginLeft: 5 }}>
            {tr('bookings.cancelBooking')}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );

  if (!open) return body;
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${tr(kindMeta.labelKey)} — ${item.title}`}
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
  cancelRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  browseBtn: { paddingHorizontal: 20, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
