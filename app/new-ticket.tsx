import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextField } from '../src/components/AppTextField';
import { AttachmentDrafts } from '../src/components/AttachmentDrafts';
import { KeyboardAwareScrollView } from '../src/components/KeyboardAware';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Txt } from '../src/components/Txt';
import { MAX_TICKET_ATTACHMENTS } from '../src/api/support';
import {
  createTicket,
  isUploadedAttachment,
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
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<TicketCategory>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  /** Shown above the submit button: attachment failures and submit failures alike. */
  const [formError, setFormError] = useState<string>();

  const sla = TICKET_CATEGORY_META[category].slaHours;
  const valid = subject.trim().length > 2 && message.trim().length > 2;
  const attachmentsFull = attachments.length >= MAX_TICKET_ATTACHMENTS;

  const attach = async () => {
    if (attaching || attachmentsFull) return;
    setAttaching(true);
    setFormError(undefined);
    // Uploads immediately rather than at submit: the file is then already on
    // the server when the ticket is created, so a slow photo can't stall — or
    // silently fail — the thing the user actually pressed "Submit" for.
    const res = await pickTicketAttachment('library');
    if (res && !res.ok) setFormError(res.message);
    if (res && res.ok) setAttachments((prev) => [...prev, res.attachment]);
    setAttaching(false);
  };

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    setFormError(undefined);
    try {
      const ticket = await createTicket({
        subject: clean(subject, 140),
        category,
        body: cleanText(message),
        // Only URLs the upload endpoint issued. A local URI here is rejected
        // by the API with an opaque message, so it is caught before sending.
        attachments: attachments.map((a) => a.url).filter(isUploadedAttachment),
      });
      router.replace(`/ticket/${ticket.id}`);
    } catch (e) {
      // There was no catch here at all, only `finally`. Any failure — a
      // rejected attachment, no signal — escaped as an unhandled rejection:
      // the spinner stopped and the customer was told nothing, with their
      // typed-out ticket still on screen and no idea it had not sent.
      setFormError(e instanceof Error ? e.message : 'Could not submit that ticket.');
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
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>{tr('support.newTicket')}</Txt>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 40 }}>
        <Txt variant="titleMedium" style={{ marginBottom: spacing.sm }}>{tr('common.category')}</Txt>
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
        <AppTextField label={tr('support.subject')} placeholder={tr('support.subjectPlaceholder')} value={subject} onChangeText={setSubject} icon="chatbox-ellipses-outline" />

        <Txt variant="titleSmall" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>{tr('support.message')}</Txt>
        <TextInput
          // iOS renders a LIGHT keyboard in dark mode without this.
          keyboardAppearance={t.isDark ? 'dark' : 'light'}
          value={message}
          onChangeText={setMessage}
          maxLength={1000}
          placeholder={tr('support.messagePlaceholder')}
          placeholderTextColor={t.colors.textTertiary}
          multiline
          style={[t.type.bodyLarge, { minHeight: 120, textAlignVertical: 'top', color: t.colors.textPrimary, backgroundColor: t.colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: t.colors.border, padding: 14 }]}
        />

        <AttachmentDrafts items={attachments} onRemove={(url) => setAttachments((p) => p.filter((a) => a.url !== url))} />

        <Pressable
          onPress={attach}
          disabled={attaching || attachmentsFull}
          accessibilityRole="button"
          accessibilityLabel={tr('support.attachPhoto')}
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

        {formError ? (
          <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: 8 }}>
            {formError}
          </Txt>
        ) : null}

        <View style={{ height: spacing.xl }} />
        <PrimaryButton label={tr('support.submitTicket')} icon="send" loading={loading} disabled={!valid} onPress={submit} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 40, borderRadius: radius.pill, borderWidth: 1 },
  sla: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.md, marginTop: spacing.md },
  attach: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', marginTop: 14 },
});
