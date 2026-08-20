import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createClaim, fetchEligibility } from '../data/warrantyRepository';
import { WARRANTY_CLAIM_CATEGORIES, WarrantyEligibility } from '../domain/types';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './PrimaryButton';
import { Txt } from './Txt';
import { cleanText } from '../utils/sanitize';
import { ActivityIndicator } from 'react-native';
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
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState(WARRANTY_CLAIM_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
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
    }, 250);
  };

  const submit = async () => {
    setLoading(true);
    setError(undefined);
    try {
      await createClaim({
        ownedVehicleId: vehicleId,
        claimType: category,
        description: cleanText(description) || category,
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
        <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={[styles.handle, { backgroundColor: t.colors.border }]} />

          {done ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Animated.View entering={ZoomIn.duration(500)} style={[styles.successIcon, { backgroundColor: tint(t.colors.success, 0.12) }]}>
                <Ionicons name="shield-checkmark" size={60} color={t.colors.successText} />
              </Animated.View>
              <Txt variant="headlineMedium" style={{ marginTop: 20 }}>
                Claim Submitted
              </Txt>
              <Txt tone="secondary" center style={{ marginTop: 8 }}>
                Our warranty team will review your {category.toLowerCase()} claim and get back to you within 48 hours.
              </Txt>
              <View style={{ height: 20 }} />
              <PrimaryButton label="Done" onPress={close} style={{ width: '100%' }} />
            </View>
          ) : (
            <>
              <Txt variant="titleLarge" style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>
                File a Warranty Claim
              </Txt>
              <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {checking ? (
                  <View style={[styles.cover, { backgroundColor: t.colors.surfaceAlt }]}>
                    <ActivityIndicator size="small" color={t.colors.textSecondary} />
                    <Txt variant="bodySmall" tone="secondary" style={{ marginLeft: 8 }}>
                      Checking your cover…
                    </Txt>
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
                        {eligibility.eligible ? 'Covered' : 'Not covered'}
                      </Txt>
                      <Txt variant="bodySmall" tone="secondary">
                        {eligibility.eligible
                          ? `${eligibility.warrantyMonths} months / ${eligibility.mileageLimitKm.toLocaleString()} km${eligibility.coverageEnd ? ` · until ${new Date(eligibility.coverageEnd).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
                          : (eligibility.reason ??
                            'This vehicle is outside its basic warranty period.')}
                      </Txt>
                    </View>
                  </View>
                ) : null}

                <Txt variant="titleMedium" style={{ marginBottom: spacing.sm }}>
                  Category
                </Txt>
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

                <Txt variant="titleMedium" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
                  Describe the issue
                </Txt>
                <TextInput
          // iOS renders a LIGHT keyboard in dark mode without this.
          keyboardAppearance={t.isDark ? 'dark' : 'light'}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={1000}
                  placeholder="Tell us what's wrong and when it started…"
                  placeholderTextColor={t.colors.textTertiary}
                  multiline
                  style={[t.type.bodyLarge, { minHeight: 100, textAlignVertical: 'top', color: t.colors.textPrimary, backgroundColor: t.colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: t.colors.border, padding: 14 }]}
                />

                <Pressable style={[styles.attach, { borderColor: t.colors.border }]}>
                  <Ionicons name="camera-outline" size={20} color={t.colors.primary} />
                  <Txt variant="titleSmall" color={t.colors.primary} style={{ marginLeft: 8 }}>
                    Add photos or video
                  </Txt>
                </Pressable>
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
