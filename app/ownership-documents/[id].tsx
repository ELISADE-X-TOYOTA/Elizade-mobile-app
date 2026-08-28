import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { garageApi } from '../../src/api/garage';
import type { OwnershipRequestDto } from '../../src/api/dto';
import { KeyboardAwareScrollView } from '../../src/components/KeyboardAware';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Skeleton } from '../../src/components/Skeleton';
import { Toast, ToastState } from '../../src/components/Toast';
import { Txt } from '../../src/components/Txt';
import {
  isPdf,
  MAX_DOCUMENT_MB,
  pickDocument,
  submitDocuments,
  uploadDocument,
  type PickedDocument,
} from '../../src/data/ownershipDocuments';
import { radius, spacing } from '../../src/theme/spacing';
import { tint } from '../../src/theme/colors';
import { useTheme } from '../../src/theme/useTheme';

/** A file the customer has chosen, and how far along its upload is. */
interface Draft {
  doc: PickedDocument;
  /** 0..1 while uploading; undefined before it starts. */
  progress?: number;
  /** Set once the server has it. */
  url?: string;
  error?: string;
}

const MAX_DOCUMENTS = 5;

/**
 * Upload screen for one ownership claim.
 *
 * Opened directly by the "more documents needed" notification, so it has to
 * stand alone: the customer arrives here from the lock screen with no idea
 * what the app was doing before, and the first thing they must see is WHICH
 * documents are wanted and for which vehicle.
 */
export default function OwnershipDocuments() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [request, setRequest] = useState<OwnershipRequestDto>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(undefined);
    try {
      // There is no GET for a single request, so the list is filtered. It is
      // short (a customer has a handful of claims at most), and it avoids
      // adding an endpoint for one screen.
      const rows = await garageApi.requests();
      const found = rows.find((r) => r.id === id);
      if (!found) {
        setLoadError(tr('documents.notFound'));
      } else {
        setRequest(found);
      }
    } catch {
      setLoadError(tr('documents.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, tr]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Already submitted — the claim is back with the reviewer. */
  const underReview = request?.status === 'pending' || request?.status === 'under_review';
  const awaitingDocuments = request?.status === 'pending_documents';

  const uploaded = useMemo(() => drafts.filter((d) => d.url), [drafts]);
  const busy = drafts.some((d) => d.progress !== undefined && d.progress < 1 && !d.error);

  const addDocument = async () => {
    if (drafts.length >= MAX_DOCUMENTS) return;
    const picked = await pickDocument();
    if (!picked) return;
    if (!picked.ok) {
      setToast({ tone: 'error', title: picked.message });
      return;
    }

    const draft: Draft = { doc: picked.document, progress: 0 };
    setDrafts((prev) => [...prev, draft]);

    const update = (patch: Partial<Draft>) =>
      setDrafts((prev) => prev.map((d) => (d.doc.uri === draft.doc.uri ? { ...d, ...patch } : d)));

    try {
      const url = await uploadDocument(picked.document, (fraction) => update({ progress: fraction }));
      update({ url, progress: 1, error: undefined });
    } catch (e) {
      update({
        error: e instanceof Error ? e.message : tr('documents.uploadFailed'),
        progress: undefined,
      });
    }
  };

  const removeDraft = (uri: string) => setDrafts((prev) => prev.filter((d) => d.doc.uri !== uri));

  const submit = async () => {
    if (!id || !uploaded.length) return;
    setSubmitting(true);
    try {
      const updated = await submitDocuments(
        id,
        uploaded.map((d) => d.url as string),
      );
      setRequest(updated);
      setDrafts([]);
      setToast({ tone: 'success', title: tr('documents.submitted') });
    } catch (e) {
      setToast({
        tone: 'error',
        title: e instanceof Error ? e.message : tr('documents.submitFailed'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/garage'))}
          accessibilityRole="button"
          accessibilityLabel={tr('common.goBack')}
          style={[styles.backBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="titleMedium" style={{ marginLeft: 12, flex: 1 }} numberOfLines={1}>
          {tr('documents.title')}
        </Txt>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 120, gap: 14 }}
      >
        {loading ? (
          <>
            <Skeleton height={90} radius={radius.lg} />
            <Skeleton height={60} radius={radius.lg} />
          </>
        ) : loadError ? (
          <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <Txt tone="secondary">{loadError}</Txt>
            <Pressable onPress={load} style={{ marginTop: spacing.sm }}>
              <Txt variant="titleSmall" color={t.colors.accentText}>
                {tr('common.tapToRetry')}
              </Txt>
            </Pressable>
          </View>
        ) : (
          <>
            {/* What was asked for. The reviewer's note is the only thing that
                says WHICH documents are missing, so it leads the screen. */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: awaitingDocuments
                    ? tint(t.colors.warning, 0.1)
                    : tint(t.colors.success, 0.1),
                  borderColor: t.colors.border,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons
                  name={awaitingDocuments ? 'document-text-outline' : 'checkmark-circle'}
                  size={18}
                  color={awaitingDocuments ? t.colors.warningText : t.colors.successText}
                />
                <Txt
                  variant="titleSmall"
                  color={awaitingDocuments ? t.colors.warningText : t.colors.successText}
                  style={{ marginLeft: 8 }}
                >
                  {awaitingDocuments
                    ? tr('documents.needed')
                    : underReview
                      ? tr('documents.underReview')
                      : tr('documents.statusOther')}
                </Txt>
              </View>

              {awaitingDocuments && request?.adminNotes ? (
                <Txt variant="bodySmall" tone="secondary">
                  {request.adminNotes}
                </Txt>
              ) : null}

              {request?.vin ? (
                <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: 6 }}>
                  {tr('documents.chassis', { vin: request.vin })}
                </Txt>
              ) : null}
            </View>

            {/* Already on file, so the customer does not re-send what they sent. */}
            {(request?.documentUrls?.length ?? 0) > 0 && (
              <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <Txt variant="titleSmall" style={{ marginBottom: 6 }}>
                  {tr('documents.alreadySent', { count: request?.documentUrls?.length ?? 0 })}
                </Txt>
                <Txt variant="bodySmall" tone="tertiary">
                  {tr('documents.alreadySentHint')}
                </Txt>
              </View>
            )}

            {awaitingDocuments && (
              <>
                {drafts.map((d) => (
                  <DraftRow
                    key={d.doc.uri}
                    draft={d}
                    onRemove={() => removeDraft(d.doc.uri)}
                    label={tr('common.remove')}
                  />
                ))}

                <Pressable
                  onPress={addDocument}
                  disabled={drafts.length >= MAX_DOCUMENTS}
                  accessibilityRole="button"
                  accessibilityLabel={tr('documents.add')}
                  style={[
                    styles.addBtn,
                    {
                      borderColor: t.colors.border,
                      opacity: drafts.length >= MAX_DOCUMENTS ? 0.5 : 1,
                    },
                  ]}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color={t.colors.accentText} />
                  <Txt variant="titleSmall" color={t.colors.accentText} style={{ marginLeft: 8 }}>
                    {drafts.length >= MAX_DOCUMENTS
                      ? tr('documents.maxReached', { max: MAX_DOCUMENTS })
                      : tr('documents.add')}
                  </Txt>
                </Pressable>

                <Txt variant="bodySmall" tone="tertiary" style={{ textAlign: 'center' }}>
                  {tr('documents.formats', { mb: MAX_DOCUMENT_MB })}
                </Txt>
              </>
            )}
          </>
        )}
      </KeyboardAwareScrollView>

      {awaitingDocuments && !loading && !loadError && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: t.colors.surface,
              borderColor: t.colors.border,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          <PrimaryButton
            label={tr('documents.submit')}
            icon="send"
            loading={submitting}
            // Disabled while anything is still uploading: submitting now would
            // silently attach only the files that happened to finish.
            disabled={!uploaded.length || busy}
            onPress={submit}
          />
        </View>
      )}

      <Toast visible={!!toast} {...toast} onDismiss={() => setToast(undefined)} />
    </View>
  );
}

/** One chosen file: progress while uploading, then a tick or the reason it failed. */
function DraftRow({ draft, onRemove, label }: { draft: Draft; onRemove: () => void; label: string }) {
  const t = useTheme();
  const pdf = isPdf(draft.doc.name) || draft.doc.mimeType === 'application/pdf';
  const pct = draft.progress === undefined ? 0 : Math.round(draft.progress * 100);

  return (
    <View style={[styles.draft, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <Ionicons
        name={pdf ? 'document-text' : 'image'}
        size={22}
        color={draft.error ? t.colors.errorText : t.colors.textSecondary}
      />
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Txt variant="titleSmall" numberOfLines={1}>
          {draft.doc.name}
        </Txt>

        {draft.error ? (
          <Txt variant="bodySmall" color={t.colors.errorText} numberOfLines={2}>
            {draft.error}
          </Txt>
        ) : draft.url ? (
          <Txt variant="bodySmall" color={t.colors.successText}>
            {`${pct}%`}
          </Txt>
        ) : (
          <>
            {/* A determinate bar, not a spinner: a 10 MB upload on a slow
                connection is indistinguishable from a hang without one. */}
            <View style={[styles.track, { backgroundColor: t.colors.surfaceAlt }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${pct}%`, backgroundColor: t.colors.primary },
                ]}
              />
            </View>
            <Txt variant="bodySmall" tone="tertiary">
              {`${pct}%`}
            </Txt>
          </>
        )}
      </View>

      {draft.url ? (
        <Ionicons name="checkmark-circle" size={22} color={t.colors.successText} />
      ) : draft.progress !== undefined && !draft.error ? (
        <ActivityIndicator size="small" color={t.colors.textSecondary} />
      ) : (
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
          <Ionicons name="close-circle" size={22} color={t.colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.screenH, paddingBottom: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  draft: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4, marginBottom: 2 },
  fill: { height: 4, borderRadius: 2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, padding: spacing.md },
});
