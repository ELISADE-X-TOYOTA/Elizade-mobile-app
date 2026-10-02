import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '../src/components/Skeleton';
import { Txt } from '../src/components/Txt';
import { cancelReservation, listReservations, Reservation } from '../src/data/salesRepository';
import { isActiveReservation, RESERVATION_STATUS_META, reservationReference } from '../src/domain/reservations';
import { price } from '../src/utils/format';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';

/**
 * The customer's held vehicles.
 *
 * `listReservations` has been in the API client since it was written and no
 * screen ever called it — the fourth such orphan, alongside quotations,
 * trade-ins and test drives. So a customer reserved a car worth millions of
 * naira, saw a reference on a success sheet once, and had nowhere to look it
 * up again. The sheet even told them to "See it under Reservations", which did
 * not exist.
 */
export default function Reservations() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();

  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    listReservations()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : tr('reservations.loadError')))
      .finally(() => setLoading(false));
  }, [tr]);

  useEffect(load, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={tr('common.back')}
          style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          {tr('reservations.title')}
        </Txt>
        <Txt tone="secondary">{tr('reservations.subtitle')}</Txt>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
            progressBackgroundColor={t.colors.surface}
          />
        }
      >
        {error ? (
          <Txt color={t.colors.errorText}>{error}</Txt>
        ) : null}

        {loading && rows.length === 0 ? (
          [0, 1].map((i) => <Skeleton key={i} height={130} radius={radius.lg} />)
        ) : rows.length === 0 ? (
          <Empty />
        ) : (
          rows.map((r) => <Card key={r.id} reservation={r} onChanged={load} />)
        )}
      </ScrollView>
    </View>
  );
}

function Card({ reservation, onChanged }: { reservation: Reservation; onChanged: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const meta = RESERVATION_STATUS_META[reservation.status];
  const tone =
    meta.tone === 'success'
      ? t.colors.successText
      : meta.tone === 'warning'
        ? t.colors.warningText
        : meta.tone === 'error'
          ? t.colors.errorText
          : t.colors.textSecondary;
  const holdUntil = new Date(reservation.expiresAt);
  const [busy, setBusy] = useState(false);

  const confirmCancel = () =>
    Alert.alert(
      tr('reservations.cancelTitle'),
      tr('reservations.cancelBody', { vehicle: reservation.vehicleLabel }),
      [
        { text: tr('common.back'), style: 'cancel' },
        {
          text: tr('reservations.cancel'),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await cancelReservation(reservation.id);
              onChanged();
            } catch (e) {
              // The API's own words — a paid hold is refused with an
              // instruction to contact the branch, and that is the useful
              // half of the message.
              Alert.alert(
                tr('reservations.cancelFailed'),
                e instanceof Error ? e.message : tr('reservations.loadError'),
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );

  return (
    <Pressable
      onPress={() => router.push(`/car/${reservation.vehicleId}`)}
      accessibilityRole="button"
      accessibilityLabel={reservation.vehicleLabel}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.9 : 1 },
        t.shadows.soft,
      ]}
    >
      <View style={styles.rowTop}>
        <View style={[styles.icon, { backgroundColor: t.colors.primary + '14' }]}>
          <Ionicons name="bookmark" size={20} color={t.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Txt variant="titleMedium" numberOfLines={1}>{reservation.vehicleLabel}</Txt>
          <Txt variant="bodySmall" tone="secondary">
            {tr('common.reference')} {reservationReference(reservation.id)}
          </Txt>
        </View>
        <View style={[styles.badge, { backgroundColor: tone + '22' }]}>
          <Txt variant="labelSmall" color={tone}>{tr(meta.labelKey)}</Txt>
        </View>
      </View>

      <View style={[styles.meta, { borderTopColor: t.colors.border }]}>
        <View style={{ flex: 1 }}>
          <Txt variant="labelSmall" tone="tertiary">{tr('reservations.heldUntil')}</Txt>
          <Txt variant="titleSmall">
            {holdUntil.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {/*
            DUE, not paid. Nothing is charged when a vehicle is reserved — the
            success sheet used to say "Deposit Paid" beside this figure, and a
            list the customer returns to must not repeat it.
          */}
          <Txt variant="labelSmall" tone="tertiary">{tr('testDrive.depositDue')}</Txt>
          <Txt variant="titleSmall" color={t.colors.primary}>
            {price(Number(reservation.depositAmount) || 0)}
          </Txt>
        </View>
      </View>

      <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: 10 }}>
        {tr('reservations.noPaymentTaken')}
      </Txt>

      {/*
        RELEASING THE HOLD. Until now a reservation could only end by the
        seven-day timeout, so a customer who changed their mind kept a car
        off the showroom for a week with no way to say otherwise.

        Shown only while the hold is live. `pending` is the only state the
        API lets a customer release — once money is against it the answer is
        a conversation with the branch, and its 409 says exactly that, which
        is surfaced rather than swallowed.
      */}
      {isActiveReservation(reservation.status) && (
        <Pressable
          onPress={confirmCancel}
          disabled={busy}
          accessibilityRole="button"
          hitSlop={6}
          style={{ marginTop: 12, opacity: busy ? 0.5 : 1 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="close-circle-outline" size={16} color={t.colors.errorText} />
            <Txt variant="titleSmall" color={t.colors.errorText} style={{ marginLeft: 6 }}>
              {tr('reservations.cancel')}
            </Txt>
          </View>
        </Pressable>
      )}
    </Pressable>
  );
}

function Empty() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={{ alignItems: 'center', paddingTop: 48 }}>
      <View style={[styles.emptyIcon, { backgroundColor: t.colors.surfaceAlt }]}>
        <Ionicons name="bookmark-outline" size={34} color={t.colors.textTertiary} />
      </View>
      <Txt variant="titleLarge" center style={{ marginTop: spacing.md }}>
        {tr('reservations.emptyTitle')}
      </Txt>
      <Txt tone="secondary" center style={{ marginTop: spacing.sm }}>
        {tr('reservations.emptyBody')}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  meta: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
