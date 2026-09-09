import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../src/components/Skeleton';
import { Txt } from '../../src/components/Txt';
import {
  SupportTicket,
  TICKET_CATEGORY_META,
  TICKET_STATUS_META,
  Tone,
} from '../../src/domain/types';
import { useTickets } from '../../src/hooks/useSupport';
import { callSupport, emailSupport, openLink, openWhatsApp } from '../../src/utils/contact';
import { SOCIALS, SUPPORT_EMAIL, SUPPORT_PHONE } from '../../src/constants/contact';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { solid } from '../../src/theme/colors';

export default function Support() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tickets, loading, error, reload } = useTickets();

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingTop: insets.top }}>
      <View style={[styles.headerRow, { paddingHorizontal: spacing.screenH }]}>
        <Txt variant="headlineMedium" style={{ flex: 1 }}>{tr('support.title')}</Txt>
        <Pressable onPress={() => router.push('/new-ticket')} style={[styles.newBtn, { backgroundColor: solid(t.colors.accent) }]}>
          <Ionicons name="add" size={20} color={t.colors.onAccent} />
          <Txt variant="titleSmall" color={t.colors.onAccent} style={{ marginLeft: 4 }}>{tr('common.new')}</Txt>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.screenH, paddingTop: spacing.sm, paddingBottom: 120, gap: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={t.colors.primary}
              colors={[t.colors.primary]}
              progressBackgroundColor={t.colors.surface} />}
      >
        {/* Quick contact */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <QuickAction
            icon="call"
            label={tr('support.callElizade')}
            sublabel={SUPPORT_PHONE}
            onPress={() => callSupport(tr('support.callElizade'))}
          />
          <QuickAction
            icon="logo-whatsapp"
            label={tr('support.whatsapp')}
            onPress={() => openWhatsApp(tr('support.whatsapp'))}
          />
        </View>
        {/*
          Email was missing entirely. It is the channel a customer uses when
          the matter is not urgent enough to ring about, and the only one that
          leaves them a written record on their side.
        */}
        <QuickAction
          icon="mail"
          label={tr('support.emailElizade')}
          sublabel={SUPPORT_EMAIL}
          onPress={() => emailSupport(tr('support.emailElizade'))}
        />

        <Txt variant="titleLarge" style={{ marginTop: spacing.md }}>{tr('support.yourTickets')}</Txt>

        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={92} radius={radius.lg} />)
        ) : error ? (
          <Txt tone="secondary">{tr('support.loadTicketsError', { message: error })}</Txt>
        ) : tickets.length ? (
          tickets.map((tk) => <TicketCard key={tk.id} ticket={tk} />)
        ) : (
          <Empty />
        )}

        {/*
          The official accounts, in one place a customer can actually reach.
          Verified links only — a wrong social handle on a dealership app is
          how somebody ends up messaging an impersonator.
        */}
        <Txt variant="titleLarge" style={{ marginTop: spacing.xl }}>{tr('support.followElizade')}</Txt>
        <View style={[styles.socials, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          {SOCIALS.map((social, i) => (
            <Pressable
              key={social.key}
              onPress={() => openLink(social.url, social.label)}
              accessibilityRole="link"
              accessibilityLabel={`${social.label} — ${social.handle}`}
              style={({ pressed }) => [
                styles.socialRow,
                {
                  borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: t.colors.border,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={[styles.socialIcon, { backgroundColor: t.colors.primary + '14' }]}>
                <Ionicons name={social.icon} size={17} color={t.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Txt variant="titleSmall">{social.label}</Txt>
                <Txt variant="bodySmall" tone="secondary" numberOfLines={1}>{social.handle}</Txt>
              </View>
              <Ionicons name="open-outline" size={16} color={t.colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function toneColorOf(t: ReturnType<typeof useTheme>, tone: Tone) {
  // *Text variants — these are rendered as type, not as fills.
  return tone === 'success' ? t.colors.successText : tone === 'warning' ? t.colors.warningText : tone === 'error' ? t.colors.errorText : tone === 'info' ? t.colors.infoText : t.colors.textSecondary;
}

/**
 * Call / WhatsApp.
 *
 * THIS WAS A PLAIN `View`. Both cards carried the surface, border, shadow and
 * icon chip of a button, sat at the top of the Support tab as the first thing
 * a customer with a problem reaches for, and had no `onPress` at all — not a
 * broken handler, no handler. Someone trying to reach Elizade tapped the
 * obvious thing, nothing happened, and there was nothing on screen to suggest
 * why. The identical bug was fixed on the car-details dealer card; this copy
 * was missed.
 */
function QuickAction({
  icon,
  label,
  sublabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** The actual number or address, so it can be read even if the tap fails. */
  sublabel?: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.quick,
        { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.7 : 1 },
        t.shadows.soft,
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: t.colors.primary + '14' }]}>
        <Ionicons name={icon} size={20} color={t.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="titleSmall">{label}</Txt>
        {sublabel ? (
          <Txt variant="bodySmall" tone="secondary" numberOfLines={1}>{sublabel}</Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const cat = TICKET_CATEGORY_META[ticket.category];
  const status = TICKET_STATUS_META[ticket.status];
  const c = toneColorOf(t, status.tone);
  return (
    <Pressable
      onPress={() => router.push(`/ticket/${ticket.id}`)}
      style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.catIcon, { backgroundColor: t.colors.primary + '14' }]}>
          <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={20} color={t.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Txt variant="titleMedium" numberOfLines={1}>
            {ticket.subject}
          </Txt>
          <Txt variant="bodySmall" tone="secondary">
            {cat.label} · #{ticket.reference}
          </Txt>
        </View>
        <View style={[styles.pill, { backgroundColor: c + '1F' }]}>
          <Txt variant="labelSmall" color={c}>
            {status.label}
          </Txt>
        </View>
      </View>
      <Txt tone="secondary" numberOfLines={1} style={{ marginTop: 10 }}>
        {ticket.lastMessage}
      </Txt>
    </Pressable>
  );
}

function Empty() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={{ alignItems: 'center', paddingTop: 40 }}>
      <View style={[styles.emptyIcon, { backgroundColor: t.colors.primary + '14' }]}>
        <Ionicons name="chatbubbles-outline" size={40} color={t.colors.primary} />
      </View>
      <Txt tone="secondary" style={{ marginTop: 14 }}>
        {tr('support.noTicketsHint')}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  newBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 40, borderRadius: radius.pill },
  quick: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.lg, borderWidth: 1, gap: 10 },
  quickIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 14, borderRadius: radius.lg, borderWidth: 1 },
  socials: { borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.sm, overflow: 'hidden' },
  socialRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  socialIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  catIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
});
