import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../src/components/Skeleton';
import { Txt } from '../src/components/Txt';
import { WarrantyClaimModal } from '../src/components/WarrantyClaimModal';
import { OWNED_VEHICLES } from '../src/data/mock';
import {
  CLAIM_STATUS_META,
  RECALL_SEVERITY_META,
  RecallNotice,
  Tone,
  WARRANTY_STATUS_META,
  WarrantyCertificate,
  WarrantyClaim,
} from '../src/domain/types';
import { useWarranty } from '../src/hooks/useWarranty';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { ON_DARK_INK, solid } from '../src/theme/colors';

export default function Warranty() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { certificates, recalls, claims, loading, error, reload } = useWarranty();
  const [claimOpen, setClaimOpen] = useState(false);

  const openRecalls = recalls.filter((r) => r.status !== 'resolved');

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          Warranty & Recalls
        </Txt>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.screenH, paddingTop: spacing.sm, paddingBottom: 60, gap: 14 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <Skeleton height={190} radius={radius.xl} />
            <Skeleton height={90} radius={radius.lg} />
          </>
        ) : error ? (
          <Txt tone="secondary">Couldn't load warranty. {error}</Txt>
        ) : (
          <>
            {/* Open recall alert */}
            {openRecalls.map((r) => (
              <RecallAlert key={r.id} recall={r} />
            ))}

            {/* Certificates */}
            {certificates.map((c) => (
              <CertificateCard key={c.id} cert={c} />
            ))}

            {/* Claims */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
              <Txt variant="titleLarge" style={{ flex: 1 }}>
                Warranty Claims
              </Txt>
              <Pressable onPress={() => setClaimOpen(true)} style={[styles.fileBtn, { backgroundColor: solid(t.colors.accent) }]}>
                <Ionicons name="add" size={18} color={t.colors.onAccent} />
                <Txt variant="titleSmall" color={t.colors.onAccent} style={{ marginLeft: 4 }}>
                  File
                </Txt>
              </Pressable>
            </View>
            {claims.length ? (
              claims.map((c) => <ClaimCard key={c.id} claim={c} />)
            ) : (
              <Txt tone="secondary">No claims filed.</Txt>
            )}

            {/* Resolved recalls history */}
            {recalls.some((r) => r.status === 'resolved') && (
              <>
                <Txt variant="titleLarge" style={{ marginTop: spacing.sm }}>
                  Past Recalls
                </Txt>
                {recalls.filter((r) => r.status === 'resolved').map((r) => (
                  <RecallCard key={r.id} recall={r} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <WarrantyClaimModal
        visible={claimOpen}
        vehicleId={OWNED_VEHICLES[0].id}
        onClose={() => setClaimOpen(false)}
        onSubmitted={reload}
      />
    </View>
  );
}

function useToneColor() {
  const t = useTheme();
  return (tone: Tone) =>
    // *Text variants — rendered as type on a tinted chip.
    tone === 'success' ? t.colors.successText : tone === 'warning' ? t.colors.warningText : tone === 'error' ? t.colors.errorText : tone === 'info' ? t.colors.infoText : t.colors.textSecondary;
}

function CertificateCard({ cert }: { cert: WarrantyCertificate }) {
  const t = useTheme();
  const color = useToneColor();
  const meta = WARRANTY_STATUS_META[cert.status];
  const end = new Date(cert.endDate);
  return (
    <LinearGradient colors={t.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cert}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="shield-car" size={26} color={solid(t.colors.accent)} />
        <Txt variant="titleMedium" color={ON_DARK_INK} style={{ flex: 1, marginLeft: 10 }}>
          {cert.coverageType}
        </Txt>
        <View style={[styles.statusPill, { backgroundColor: color(meta.tone) }]}>
          <Txt variant="labelSmall" color={ON_DARK_INK}>
            {meta.label}
          </Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Txt variant="labelSmall" color="rgba(255,255,255,0.6)">
            VALID UNTIL
          </Txt>
          <Txt variant="titleMedium" color={ON_DARK_INK}>
            {end.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="labelSmall" color="rgba(255,255,255,0.6)">
            MILEAGE LIMIT
          </Txt>
          <Txt variant="titleMedium" color={ON_DARK_INK}>
            {cert.mileageLimit.toLocaleString()} km
          </Txt>
        </View>
      </View>

      <Txt variant="labelSmall" color="rgba(255,255,255,0.6)" style={{ marginTop: spacing.lg }}>
        VIN · {cert.vin}
      </Txt>

      <View style={[styles.coverBox, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
        {cert.coverageItems.map((item) => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3 }}>
            <Ionicons name="checkmark-circle" size={15} color={solid(t.colors.accent)} />
            <Txt variant="bodySmall" color={ON_DARK_INK} style={{ marginLeft: 8 }}>
              {item}
            </Txt>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

function RecallAlert({ recall }: { recall: RecallNotice }) {
  const t = useTheme();
  const color = useToneColor();
  const meta = RECALL_SEVERITY_META[recall.severity];
  const c = color(meta.tone);
  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: c }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="warning" size={20} color={c} />
        <Txt variant="titleMedium" style={{ flex: 1, marginLeft: 8 }}>
          {recall.title}
        </Txt>
        <View style={[styles.statusPill, { backgroundColor: c + '1F' }]}>
          <Txt variant="labelSmall" color={c}>
            {meta.label}
          </Txt>
        </View>
      </View>
      <Txt tone="secondary" style={{ marginTop: 8 }}>
        {recall.description}
      </Txt>
      <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: 6 }}>
        Ref {recall.reference}
      </Txt>
      <Pressable
        onPress={() => router.push('/book-service?type=recall')}
        style={[styles.recallBtn, { backgroundColor: t.colors.primary }]}
      >
        <Ionicons name="construct" size={16} color={t.colors.onPrimary} />
        <Txt variant="titleSmall" color={t.colors.onPrimary} style={{ marginLeft: 8 }}>
          Book recall service — free
        </Txt>
      </Pressable>
    </View>
  );
}

function RecallCard({ recall }: { recall: RecallNotice }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="checkmark-circle" size={18} color={t.colors.successText} />
        <Txt variant="titleSmall" style={{ flex: 1, marginLeft: 8 }}>
          {recall.title}
        </Txt>
        <Txt variant="bodySmall" tone="secondary">
          Resolved
        </Txt>
      </View>
    </View>
  );
}

function ClaimCard({ claim }: { claim: WarrantyClaim }) {
  const t = useTheme();
  const color = useToneColor();
  const meta = CLAIM_STATUS_META[claim.status];
  const c = color(meta.tone);
  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Txt variant="titleMedium" style={{ flex: 1 }}>
          {claim.category}
        </Txt>
        <View style={[styles.statusPill, { backgroundColor: c + '1F' }]}>
          <Txt variant="labelSmall" color={c}>
            {meta.label}
          </Txt>
        </View>
      </View>
      <Txt tone="secondary" numberOfLines={2} style={{ marginTop: 6 }}>
        {claim.description}
      </Txt>
      <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: 6 }}>
        {claim.vehicleTitle} · {new Date(claim.submittedAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cert: { borderRadius: radius.xl, padding: spacing.lg },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  coverBox: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  fileBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 36, borderRadius: radius.pill },
  recallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: radius.md, marginTop: spacing.md },
});
