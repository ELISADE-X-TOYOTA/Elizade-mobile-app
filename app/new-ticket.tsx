import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextField } from '../src/components/AppTextField';
import { AttachmentDrafts } from '../src/components/AttachmentDrafts';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Txt } from '../src/components/Txt';
import { MAX_TICKET_ATTACHMENTS } from '../src/api/support';
import {
  createTicket,
  pickTicketAttachment,
  type PickedAttachment,
} from '../src/data/supportRepository';
import { TICKET_CATEGORY_META, TicketCategory } from '../src/domain/types';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { clean, cleanText } from '../src/utils/sanitize';
import { tint } from '../src/theme/colors';

const CATEGORIES = Object.keys(TICKET_CATEGORY_META) as TicketCategory[];

export default function NewTicket() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<TicketCategory>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string>();

  const sla = TICKET_CATEGORY_META[category].slaHours;
  const valid = subject.trim().length > 2 && message.trim().length > 2;
  const attachmentsFull = attachments.length >= MAX_TICKET_ATTACHMENTS;

  const attach = async () => {
    if (attaching || attachmentsFull) return;
    setAttaching(true);
    setAttachError(undefined);
    // Uploads immediately rather than at submit: the file is then already on
    // the server when the ticket is created, so a slow photo can't stall — or
    // silently fail — the thing the user actually pressed "Submit" for.
    const res = await pickTicketAttachment('library');
    if (res && !res.ok) setAttachError(res.message);
    if (res && res.ok) setAttachments((prev) => [...prev, res.attachment]);
    setAttaching(false);
  };

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      const ticket = await createTicket({
        subject: clean(subject, 140),
        category,
        body: cleanText(message),
        attachments: attachments.map((a) => a.url),
      });
      router.replace(`/ticket/${ticket.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          New Ticket
        </Txt>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Txt variant="titleMedium" style={{ marginBottom: spacing.sm }}>
          Category
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((c) => {
            const meta = TICKET_CATEGORY_META[c];
            const active = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.chip, { backgroundColor: active ? t.colors.primary : t.colors.surfaceAlt, borderColor: active ? t.colors.primary : t.colors.border }]}
              >
                <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={15} color={active ? t.colors.onPrimary : t.colors.primary} />
                <Txt variant="titleSmall" color={active ? t.colors.onPrimary : t.colors.textPrimary} style={{ marginLeft: 6 }}>
                  {meta.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.sla, { backgroundColor: tint(t.colors.info, 0.08) }]}>
          <Ionicons name="time-outline" size={16} color={t.colors.infoText} />
          <Txt variant="bodySmall" color={t.colors.infoText} style={{ marginLeft: 8 }}>
            Expected first response within {sla} hours
          </Txt>
        </View>

        <View style={{ height: spacing.lg }} />
        <AppTextField label="Subject" placeholder="Briefly, what's this about?" value={subject} onChangeText={setSubject} icon="chatbox-ellipses-outline" />

        <Txt variant="titleSmall" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>
          Message
        </Txt>
        <TextInput
          // iOS renders a LIGHT keyboard in dark mode without this.
          keyboardAppearance={t.isDark ? 'dark' : 'light'}
          value={message}
          onChangeText={setMessage}
          maxLength={1000}
          placeholder="Tell us how we can help…"
          placeholderTextColor={t.colors.textTertiary}
          multiline
          style={[t.type.bodyLarge, { minHeight: 120, textAlignVertical: 'top', color: t.colors.textPrimary, backgroundColor: t.colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: t.colors.border, padding: 14 }]}
        />

        <AttachmentDrafts items={attachments} onRemove={(url) => setAttachments((p) => p.filter((a) => a.url !== url))} />

        <Pressable
          onPress={attach}
          disabled={attaching || attachmentsFull}
          accessibilityRole="button"
          accessibilityLabel="Attach a photo"
          accessibilityState={{ disabled: attaching || attachmentsFull }}
          style={[
            styles.attach,
            { borderColor: t.colors.border, opacity: attaching || attachmentsFull ? 0.55 : 1 },
          ]}
        >
          {attaching ? (
            <ActivityIndicator size="small" color={t.colors.primary} />
          ) : (
            <Ionicons name="attach-outline" size={20} color={t.colors.primary} />
          )}
          <Txt variant="titleSmall" color={t.colors.primary} style={{ marginLeft: 8 }}>
            {attaching
              ? 'Uploading…'
              : attachmentsFull
                ? `Maximum ${MAX_TICKET_ATTACHMENTS} attachments`
                : 'Attach a photo'}
          </Txt>
        </Pressable>

        {attachError ? (
          <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: 8 }}>
            {attachError}
          </Txt>
        ) : null}

        <View style={{ height: spacing.xl }} />
        <PrimaryButton label="Submit Ticket" icon="send" loading={loading} disabled={!valid} onPress={submit} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 40, borderRadius: radius.pill, borderWidth: 1 },
  sla: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.md, marginTop: spacing.md },
  attach: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', marginTop: 14 },
});
