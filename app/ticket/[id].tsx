import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../src/components/Skeleton';
import { Txt } from '../../src/components/Txt';
import { rateTicket, replyToTicket } from '../../src/data/supportRepository';
import {
  SupportTicket,
  TICKET_CATEGORY_META,
  TICKET_STATUS_META,
  TicketMessage,
  Tone,
} from '../../src/domain/types';
import { useTicket } from '../../src/hooks/useSupport';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { cleanText } from '../../src/utils/sanitize';

export default function TicketDetail() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ticket, messages, loading, setMessages, setTicket } = useTicket(id ?? '');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const body = cleanText(text);
    if (!body || !id) return;
    setText('');
    setSending(true);
    const msg = await replyToTicket(id, body);
    setMessages((m) => [...m, msg]);
    setSending(false);
  };

  const rate = async (n: number) => {
    if (!id || !ticket) return;
    await rateTicket(id, n);
    setTicket({ ...ticket, satisfactionRating: n });
  };

  const status = ticket ? TICKET_STATUS_META[ticket.status] : null;
  const cat = ticket ? TICKET_CATEGORY_META[ticket.category] : null;
  const canReply = ticket?.status === 'open' || ticket?.status === 'in_progress';
  const showRating = ticket?.status === 'resolved' || ticket?.status === 'closed';

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.xs, backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
            <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Txt variant="titleMedium" numberOfLines={1}>
              {ticket?.subject ?? 'Ticket'}
            </Txt>
            {ticket && cat && (
              <Txt variant="bodySmall" tone="secondary">
                {cat.label} · #{ticket.reference}
              </Txt>
            )}
          </View>
          {status && (
            <View style={[styles.pill, { backgroundColor: toneColor(t, status.tone) + '1F' }]}>
              <Txt variant="labelSmall" color={toneColor(t, status.tone)}>
                {status.label}
              </Txt>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.screenH, gap: 12, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {loading ? (
            <>
              <Skeleton height={60} radius={radius.lg} />
              <Skeleton height={60} radius={radius.lg} style={{ alignSelf: 'flex-end', width: '70%' }} />
            </>
          ) : (
            <>
              {canReply && cat && (
                <View style={[styles.sla, { backgroundColor: t.colors.info + '14' }]}>
                  <Ionicons name="time-outline" size={15} color={t.colors.info} />
                  <Txt variant="bodySmall" color={t.colors.info} style={{ marginLeft: 6 }}>
                    Typical response within {cat.slaHours}h
                  </Txt>
                </View>
              )}

              {messages.map((m) => (
                <Bubble key={m.id} message={m} />
              ))}

              {showRating && (
                <RatingCard rating={ticket?.satisfactionRating} onRate={rate} />
              )}
            </>
          )}
        </ScrollView>

        {/* Reply bar */}
        {canReply && (
          <View style={[styles.replyBar, { backgroundColor: t.colors.surface, borderColor: t.colors.border, paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              maxLength={1000}
              placeholder="Type a reply…"
              placeholderTextColor={t.colors.textTertiary}
              style={[t.type.bodyLarge, { flex: 1, color: t.colors.textPrimary, backgroundColor: t.colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100 }]}
              multiline
            />
            <Pressable onPress={send} disabled={sending || !text.trim()} style={[styles.sendBtn, { backgroundColor: text.trim() ? t.colors.primary : t.colors.border }]}>
              <Ionicons name="send" size={18} color={t.colors.onPrimary} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function toneColor(t: ReturnType<typeof useTheme>, tone: Tone) {
  return tone === 'success' ? t.colors.success : tone === 'warning' ? t.colors.warning : tone === 'error' ? t.colors.error : tone === 'info' ? t.colors.info : t.colors.textSecondary;
}

function Bubble({ message }: { message: TicketMessage }) {
  const t = useTheme();
  const mine = message.author === 'customer';
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
      {!mine && (
        <Txt variant="labelSmall" tone="secondary" style={{ marginBottom: 4, marginLeft: 4 }}>
          {message.authorName}
        </Txt>
      )}
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: t.colors.primary, borderTopRightRadius: 4 }
            : { backgroundColor: t.colors.surface, borderColor: t.colors.border, borderWidth: 1, borderTopLeftRadius: 4 },
        ]}
      >
        <Txt variant="bodyLarge" color={mine ? t.colors.onPrimary : t.colors.textPrimary}>
          {message.body}
        </Txt>
      </View>
      <Txt variant="labelSmall" tone="tertiary" style={{ marginTop: 4, alignSelf: mine ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>
        {new Date(message.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
      </Txt>
    </View>
  );
}

function RatingCard({ rating, onRate }: { rating?: number; onRate: (n: number) => void }) {
  const t = useTheme();
  return (
    <View style={[styles.ratingCard, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <Ionicons name="checkmark-circle" size={28} color={t.colors.success} />
      <Txt variant="titleMedium" style={{ marginTop: 8 }}>
        {rating ? 'Thanks for your feedback!' : 'How was our support?'}
      </Txt>
      <Txt tone="secondary" center style={{ marginTop: 4 }}>
        {rating ? 'You rated this resolution.' : 'Rate your experience to help us improve.'}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => !rating && onRate(n)} disabled={!!rating}>
            <Ionicons name={rating && n <= rating ? 'star' : 'star-outline'} size={30} color={t.colors.warning} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.screenH, paddingBottom: spacing.sm, borderBottomWidth: 1 },
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  sla: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  bubble: { padding: 12, borderRadius: radius.lg },
  ratingCard: { alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.md },
  replyBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: spacing.screenH, paddingTop: 10, borderTopWidth: 1 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
