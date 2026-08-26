import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_TICKET_ATTACHMENTS } from '../api/support';
import { createClaim, fetchEligibility } from '../data/warrantyRepository';
import { pickTicketAttachment, PickedAttachment } from '../data/supportRepository';
import { WARRANTY_CLAIM_CATEGORIES, WarrantyEligibility } from '../domain/types';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { useKeyboardHeight } from './KeyboardAware';
import { PrimaryButton } from './PrimaryButton';
import { AttachmentDrafts } from './AttachmentDrafts';
import { Txt } from './Txt';
import { cleanText } from '../utils/sanitize';
import { tint } from '../theme/colors';

interface Props {
  visible: boolean;
  vehicleId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

/** File a warranty claim: pick a category, describe the issue, attach media. */
export function WarrantyClaimModal({ visible, vehicleId, onClose, onSubmitted }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [category, setCategory] = useState(WARRANTY_CLAIM_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [attachError, setAttachError] = useState<string>();
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [done, setDone] = useState(false);
  const [eligibility, setEligibility] = useState<WarrantyEligibility | null>(null);
  const [checking, setChecking] = useState(false);

  /*
    Cover is checked as the sheet opens, not at submit.

    `POST /warranty/claims` rejects an out-of-cover vehicle with a 422, so
    without this the customer picks a category, writes up the fault, hits
    Submit — and only then learns the car was never eligible. Checking up front
    turns that into a statement they can read before typing anything.
  */
  useEffect(() => {
    if (!visible || !vehicleId) return;
    let alive = true;
    setChecking(true);
    setEligibility(null);
    fetchEligibility(vehicleId)
      .then((e) => alive && setEligibility(e))
      // A failed check must not block the claim: the server still enforces
      // eligibility, so fall through and let the submit decide.
      .catch(() => alive && setEligibility(null))
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [visible, vehicleId]);

  const blocked = eligibility?.eligible === false;

  const close = () => {
    onClose();
    setTimeout(() => {
      setDone(false);
      setDescription('');
      setAttachments([]);
      setAttachError(undefined);
    }, 250);
  };

  const addAttachment = async () => {
    if (attachments.length >= MAX_TICKET_ATTACHMENTS) {
      setAttachError(`You can attach up to ${MAX_TICKET_ATTACHMENTS} files.`);
      return;
    }
    setAttachError(undefined);
    const res = await pickTicketAttachment('library');
    if (!res) return;
    if (!res.ok) {
      setAttachError(res.message);
      return;
    }
    setAttachments((prev) => [...prev, res.attachment]);
  };

  const submit = async () => {
    setLoading(true);
    setError(undefined);
    try {
      await createClaim({
        ownedVehicleId: vehicleId,
        claimType: category,
        description: cleanText(description) || category,
        attachmentUrls: attachments.map((a) => a.url),
      });
      setDone(true);
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit this claim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        {/*
          A bottom sheet is pinned to the bottom of the screen, so the keyboard
          covers it FIRST — and a KeyboardAvoidingView inside a Modal measures
          against the screen rather than the sheet, so it does not help here.
          Padding by the live keyboard height lifts the sheet instead, which
          keeps its own inputs and its submit button reachable.
        */}
        <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.md + keyboardHeight }]}>
          <View style={[styles.handle, { backgroundColor: t.colors.border }]} />

          {done ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Animated.View entering={ZoomIn.duration(500)} style={[styles.successIcon, { backgroundColor: tint(t.colors.success, 0.12) }]}>
                <Ionicons name="shield-checkmark" size={60} color={t.colors.successText} />
              </Animated.View>
              <Txt variant="headlineMedium" style={{ marginTop: 20 }}>{tr('warranty.claimSubmitted')}</Txt>
              <Txt tone="secondary" center style={{ marginTop: 8 }}>
                Our warranty team will review your {category.toLowerCase()} claim and get back to you within 48 hours.
              </Txt>
              <View style={{ height: 20 }} />
              <PrimaryButton label={tr('common.done')} onPress={close} style={{ width: '100%' }} />
            </View>
          ) : (
            <>
              <Txt variant="titleLarge" style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>{tr('warranty.fileClaim')}</Txt>
              <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {checking ? (
                  <View style={[styles.cover, { backgroundColor: t.colors.surfaceAlt }]}>
                    <ActivityIndicator size="small" color={t.colors.textSecondary} />
                    <Txt variant="bodySmall" tone="secondary" style={{ marginLeft: 8 }}>{tr('warranty.checkingCover')}</Txt>
                  </View>
                ) : eligibility ? (
                  <View
                    style={[
                      styles.cover,
                      {
                        backgroundColor: eligibility.eligible
                          ? tint(t.colors.success, 0.12)
                          : tint(t.colors.warning, 0.12),
                      },
                    ]}
                  >
                    <Ionicons
                      name={eligibility.eligible ? 'shield-checkmark' : 'alert-circle'}
                      size={18}
                      color={eligibility.eligible ? t.colors.successText : t.colors.warningText}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Txt
                        variant="titleSmall"
                        color={eligibility.eligible ? t.colors.successText : t.colors.warningText}
                      >
                        {eligibility.eligible ? 'Within basic cover' : 'Outside basic cover'}
                      </Txt>
                      <Txt variant="bodySmall" tone="secondary">
                        {eligibility.eligible
                          ? `Basic cover runs ${eligibility.warrantyMonths} months / ${eligibility.mileageLimitKm.toLocaleString()} km${eligibility.coverageEnd ? `, until ${new Date(eligibility.coverageEnd).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.`
                          : (eligibility.reason ??
                            'This vehicle is outside its basic warranty period.')}
                      </Txt>
                      {/* Battery runs on its own clock. Saying only "shorter
                          terms" was all the app could manage before the API
                          returned these fields; now the real tier is shown,
                          because a battery claim is exactly where a customer
                          is misled by the basic-cover verdict above. */}
                      <BatteryCover eligibility={eligibility} />
                    </View>
                  </View>
                ) : null}

                <Txt variant="titleMedium" style={{ marginBottom: spacing.sm }}>{tr('common.category')}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {WARRANTY_CLAIM_CATEGORIES.map((c) => {
                    const active = category === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setCategory(c)}
                        style={[styles.chip, { backgroundColor: active ? t.colors.primary : t.colors.surfaceAlt, borderColor: active ? t.colors.primary : t.colors.border }]}
                      >
                        <Txt variant="titleSmall" color={active ? t.colors.onPrimary : t.colors.textPrimary}>
                          {c}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>

                <Txt variant="titleMedium" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>{tr('warranty.describeIssue')}</Txt>
                <TextInput
          // iOS renders a LIGHT keyboard in dark mode without this.
          keyboardAppearance={t.isDark ? 'dark' : 'light'}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={1000}
                  placeholder={tr('warranty.describeIssue')}
                  placeholderTextColor={t.colors.textTertiary}
                  multiline
                  style={[t.type.bodyLarge, { minHeight: 100, textAlignVertical: 'top', color: t.colors.textPrimary, backgroundColor: t.colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: t.colors.border, padding: 14 }]}
                />

                <Pressable
                  onPress={addAttachment}
                  disabled={attachments.length >= MAX_TICKET_ATTACHMENTS}
                  style={[
                    styles.attach,
                    {
                      borderColor: t.colors.border,
                      opacity: attachments.length >= MAX_TICKET_ATTACHMENTS ? 0.5 : 1,
                    },
                  ]}
                >
                  <Ionicons name="camera-outline" size={20} color={t.colors.primary} />
                  <Txt variant="titleSmall" color={t.colors.primary} style={{ marginLeft: 8 }}>{tr('warranty.addPhotos')}</Txt>
                </Pressable>
                <AttachmentDrafts
                  items={attachments}
                  onRemove={(url) => setAttachments((p) => p.filter((a) => a.url !== url))}
                />
                {attachError ? (
                  <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: spacing.sm }}>
                    {attachError}
                  </Txt>
                ) : null}
              </ScrollView>

              <View style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>
                {error ? (
                  <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginBottom: spacing.sm }}>
                    {error}
                  </Txt>
                ) : null}
                <PrimaryButton
                  label={blocked ? 'Not eligible' : 'Submit Claim'}
                  icon="shield-checkmark"
                  loading={loading}
                  disabled={blocked}
                  onPress={submit}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * Battery cover, stated separately from basic cover.
 *
 * A vehicle can sit inside its 36-month basic warranty and still be past free
 * battery replacement at 24 months — so reporting only the basic verdict
 * tells a customer filing a battery claim the opposite of what they need.
 */
function BatteryCover({ eligibility }: { eligibility: WarrantyEligibility }) {
  const t = useTheme();
  const { t: tr } = useTranslation();

  // No in-service date recorded: cover is unknown, not lapsed. Claiming it
  // expired would be a guess against the customer.
  if (eligibility.batteryStatus === 'unknown') return null;

  const date = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null;

  const copy: Record<string, string> = {
    free: tr('warranty.batteryFree', {
      months: eligibility.batteryFreeMonths,
      date: date(eligibility.batteryFreeCoverageEnd) ?? '',
    }),
    partial: tr('warranty.batteryPartial', {
      months: eligibility.batteryPartialMonths,
      date: date(eligibility.batteryPartialCoverageEnd) ?? '',
    }),
    expired: tr('warranty.batteryExpired', { months: eligibility.batteryPartialMonths }),
  };

  return (
    <Txt
      variant="bodySmall"
      tone={eligibility.batteryEligible ? 'secondary' : 'tertiary'}
      style={{ marginTop: 6 }}
    >
      {copy[eligibility.batteryStatus]} {tr('warranty.adviserConfirms')}
    </Txt>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  cover: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  chip: { paddingHorizontal: 14, height: 40, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  attach: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', marginTop: 14 },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});
