import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_TICKET_ATTACHMENTS } from '../../src/api/support';
import { AttachmentDrafts } from '../../src/components/AttachmentDrafts';
import { SecureAttachment } from '../../src/components/SecureAttachment';
import { KeyboardAwareView } from '../../src/components/KeyboardAware';
import { Skeleton } from '../../src/components/Skeleton';
import { Txt } from '../../src/components/Txt';
import {
  isUploadedAttachment,
  pickTicketAttachment,
  rateTicket,
  replyToTicket,
  type PickedAttachment,
} from '../../src/data/supportRepository';
import {
  SupportTicket,
  TICKET_CATEGORY_META,
  TICKET_STATUS_META,
  TicketMessage,
  Tone,
} from '../../src/domain/types';
import { useTicket } from '../../src/hooks/useSupport';
import { useTicketRealtime } from '../../src/hooks/useTicketRealtime';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { cleanText } from '../../src/utils/sanitize';
import { tint } from '../../src/theme/colors';

export default function TicketDetail() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ticket, messages, loading, setMessages, setTicket } = useTicket(id ?? '');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [drafts, setDrafts] = useState<PickedAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string>();

  // Live thread: agent replies, typing, and status arrive without a refresh.
  const realtime = useTicketRealtime(id ?? '', messages, setMessages);

  // A photo on its own is a complete reply, so an empty box is sendable once
  // something is attached — the API accepts either.
  const canSend = (!!cleanText(text) || drafts.length > 0) && !sending;

  const attach = async () => {
    if (attaching || drafts.length >= MAX_TICKET_ATTACHMENTS) return;
    setAttaching(true);
    setAttachError(undefined);
    const res = await pickTicketAttachment('library');
    if (res && !res.ok) setAttachError(res.message);
    if (res && res.ok) setDrafts((prev) => [...prev, res.attachment]);
    setAttaching(false);
  };

  const send = async () => {
    const body = cleanText(text);
    if (!id || (!body && !drafts.length)) return;
    const urls = drafts.map((d) => d.url).filter(isUploadedAttachment);
    setText('');
    setDrafts([]);
    realtime.onTyping(false);
    setAttachError(undefined);
    setSending(true);
    try {
      const { message, ticket: updated } = await replyToTicket(id, body, urls);
      setMessages((m) => [...m, message]);
      // Replying moves the ticket's status/SLA/updatedAt — take the server's
      // version so the header does not go stale until the next refetch.
      if (updated) setTicket(updated);
    } catch (e) {
      // Put the draft back so the reply is not silently lost.
      setText(body);
      setDrafts(drafts);
      setAttachError(e instanceof Error ? e.message : 'Could not send that reply.');
    } finally {
      setSending(false);
    }
  };

  const rate = async (n: number) => {
    if (!id || !ticket) return;
    await rateTicket(id, n);
    setTicket({ ...ticket, satisfactionRating: n });
  };

  // An agent moving the ticket updates the badge here, live. `liveStatus`
  // wins over the loaded value because it is strictly newer.
  const effectiveStatus = (realtime.liveStatus as SupportTicket['status'] | undefined) ?? ticket?.status;
  const status = effectiveStatus ? TICKET_STATUS_META[effectiveStatus] : null;
  const cat = ticket ? TICKET_CATEGORY_META[ticket.category] : null;
  const canReply = ticket?.status === 'open' || ticket?.status === 'in_progress';
  const showRating = ticket?.status === 'resolved' || ticket?.status === 'closed';

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <KeyboardAwareView offset={insets.top}>
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
                <View style={[styles.sla, { backgroundColor: tint(t.colors.info, 0.08) }]}>
                  <Ionicons name="time-outline" size={15} color={t.colors.infoText} />
                  <Txt variant="bodySmall" color={t.colors.infoText} style={{ marginLeft: 6 }}>
                    {tr('support.typicalResponse', { hours: cat.slaHours })}
                  </Txt>
                </View>
              )}

              {messages.map((m) => (
                <Bubble key={m.id} message={m} />
              ))}

              {/* Sits where the reply will appear, so it reads as the agent
                  composing rather than as a status message. */}
              {realtime.peerTyping && (
                <View style={[styles.typing, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
                  <Txt variant="bodySmall" tone="secondary">
                    {tr('support.agentTyping')}
                  </Txt>
                </View>
              )}

              {showRating && (
                <RatingCard rating={ticket?.satisfactionRating} onRate={rate} />
              )}
            </>
          )}
        </ScrollView>

        {/* Reply bar */}
        {canReply && (
          <View style={[styles.replyBar, { backgroundColor: t.colors.surface, borderColor: t.colors.border, paddingBottom: insets.bottom + 8 }]}>
            {drafts.length > 0 && (
              <View style={{ paddingHorizontal: 4, marginBottom: 4 }}>
                <AttachmentDrafts
                  items={drafts}
                  onRemove={(url) => setDrafts((p) => p.filter((d) => d.url !== url))}
                />
              </View>
            )}
            {attachError ? (
              <Txt variant="bodySmall" color={t.colors.errorText} style={{ paddingHorizontal: 6, marginBottom: 6 }}>
                {attachError}
              </Txt>
            ) : null}

            <View style={styles.replyRow}>
              <Pressable
                onPress={attach}
                disabled={attaching || drafts.length >= MAX_TICKET_ATTACHMENTS}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={tr('support.attachPhoto')}
                style={[
                  styles.attachBtn,
                  {
                    backgroundColor: t.colors.surfaceAlt,
                    borderColor: t.colors.border,
                    opacity: attaching || drafts.length >= MAX_TICKET_ATTACHMENTS ? 0.5 : 1,
                  },
                ]}
              >
                {attaching ? (
                  <ActivityIndicator size="small" color={t.colors.textSecondary} />
                ) : (
                  <Ionicons name="attach" size={19} color={t.colors.textSecondary} />
                )}
              </Pressable>

              <TextInput
          // iOS renders a LIGHT keyboard in dark mode without this.
          keyboardAppearance={t.isDark ? 'dark' : 'light'}
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  // The client debounces: one start event, then an idle timer.
                  realtime.onTyping(v.length > 0);
                }}
                maxLength={1000}
                placeholder={drafts.length ? 'Add a note (optional)…' : 'Type a reply…'}
                placeholderTextColor={t.colors.textTertiary}
                style={[t.type.bodyLarge, { flex: 1, color: t.colors.textPrimary, backgroundColor: t.colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100 }]}
                multiline
              />

              <Pressable
                onPress={send}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel={tr('support.sendReply')}
                accessibilityState={{ disabled: !canSend }}
                style={[styles.sendBtn, { backgroundColor: canSend ? t.colors.primary : t.colors.border }]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={t.colors.onPrimary} />
                ) : (
                  <Ionicons name="send" size={18} color={t.colors.onPrimary} />
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAwareView>
    </View>
  );
}

function toneColor(t: ReturnType<typeof useTheme>, tone: Tone) {
  // *Text variants: these are read as TYPE on a tinted pill, and the base
  // brand fills fail contrast at that job.
  return tone === 'success' ? t.colors.successText : tone === 'warning' ? t.colors.warningText : tone === 'error' ? t.colors.errorText : tone === 'info' ? t.colors.infoText : t.colors.textSecondary;
}

function Bubble({ message }: { message: TicketMessage }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
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
        {!!message.body && (
          <Txt variant="bodyLarge" color={mine ? t.colors.onPrimary : t.colors.textPrimary}>
            {message.body}
          </Txt>
        )}
        {message.attachments.length > 0 && (
          <View style={{ gap: 6, marginTop: message.body ? 8 : 0 }}>
            {message.attachments.map((url) =>
              url.toLowerCase().endsWith('.pdf') ? (
                <View
                  key={url}
                  style={[styles.pdfChip, { borderColor: mine ? t.colors.onPrimary + '55' : t.colors.border }]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={17}
                    color={mine ? t.colors.onPrimary : t.colors.textSecondary}
                  />
                  <Txt
                    variant="bodySmall"
                    color={mine ? t.colors.onPrimary : t.colors.textSecondary}
                    style={{ marginLeft: 6 }}
                  >{tr('support.document')}</Txt>
                </View>
              ) : (
                <SecureAttachment
                  key={url}
                  style={styles.bubbleImage}
                  uri={url}
                />
              ),
            )}
          </View>
        )}
      </View>
      <Txt variant="labelSmall" tone="tertiary" style={{ marginTop: 4, alignSelf: mine ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>
        {new Date(message.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
      </Txt>
    </View>
  );
}

function RatingCard({ rating, onRate }: { rating?: number; onRate: (n: number) => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={[styles.ratingCard, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <Ionicons name="checkmark-circle" size={28} color={t.colors.successText} />
      <Txt variant="titleMedium" style={{ marginTop: 8 }}>
        {rating ? 'Thanks for your feedback!' : 'How was our support?'}
      </Txt>
      <Txt tone="secondary" center style={{ marginTop: 4 }}>
        {rating ? 'You rated this resolution.' : 'Rate your experience to help us improve.'}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => !rating && onRate(n)} disabled={!!rating}>
            <Ionicons name={rating && n <= rating ? 'star' : 'star-outline'} size={30} color={t.colors.warningText} />
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
  typing: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  sla: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  bubble: { padding: 12, borderRadius: radius.lg },
  ratingCard: { alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.md },
  // Column: the drafts strip and any error stack ABOVE the input row.
  // (It was a row when the bar held only the input and send button.)
  replyBar: { paddingHorizontal: spacing.screenH, paddingTop: 10, borderTopWidth: 1 },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleImage: { width: 200, height: 150, borderRadius: radius.sm },
  pdfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
