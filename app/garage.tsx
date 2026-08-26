import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkCarImage } from '../src/components/NetworkCarImage';
import { useKeyboardHeight } from '../src/components/KeyboardAware';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Skeleton } from '../src/components/Skeleton';
import { Txt } from '../src/components/Txt';
import { addVehicleByVin, ClaimResult } from '../src/data/garageRepository';
import { OwnedVehicle } from '../src/domain/types';
import { useOwnedVehicles } from '../src/hooks/useGarage';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { cleanVin } from '../src/utils/sanitize';
import { ON_DARK_INK } from '../src/theme/colors';

export default function Garage() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { vehicles, loading, reload } = useOwnedVehicles();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>{tr('garage.title')}</Txt>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.screenH, paddingTop: spacing.sm, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          [0, 1].map((i) => <Skeleton key={i} height={150} radius={radius.xl} />)
        ) : (
          vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)
        )}

        <Pressable onPress={() => setAddOpen(true)} style={[styles.addCard, { borderColor: t.colors.border }]}>
          <View style={[styles.addIcon, { backgroundColor: t.colors.primary + '14' }]}>
            <Ionicons name="add" size={24} color={t.colors.primary} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Txt variant="titleMedium">{tr('garage.addVehicle')}</Txt>
            <Txt variant="bodySmall" tone="secondary">{tr('garage.claimSubtitle')}</Txt>
          </View>
        </Pressable>
      </ScrollView>

      <AddVehicleModal visible={addOpen} onClose={() => setAddOpen(false)} onAdded={reload} />
    </View>
  );
}

function VehicleCard({ vehicle }: { vehicle: OwnedVehicle }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const dueInDays = Math.round((new Date(vehicle.nextServiceDue).getTime() - Date.now()) / 86_400_000);
  return (
    <Pressable onPress={() => router.push(`/garage-vehicle/${vehicle.id}`)} style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.card]}>
      <View style={{ height: 140 }}>
        <NetworkCarImage uri={vehicle.image} />
        <View style={[styles.reg, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <Txt variant="labelSmall" color={ON_DARK_INK}>
            {vehicle.registrationNumber}
          </Txt>
        </View>
      </View>
      <View style={{ padding: 14 }}>
        <Txt variant="titleLarge">
          {vehicle.make} {vehicle.model}
        </Txt>
        <Txt variant="bodySmall" tone="secondary">
          {vehicle.trim} · {vehicle.year}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Stat icon="speedometer" label={`${(vehicle.mileage / 1000).toFixed(0)}k km`} />
          <Stat icon="wrench" label={dueInDays > 0 ? `Service in ${dueInDays}d` : 'Service due'} highlight={dueInDays <= 14} />
        </View>
      </View>
    </Pressable>
  );
}

function Stat({ icon, label, highlight }: { icon: string; label: string; highlight?: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const color = highlight ? t.colors.warningText : t.colors.textSecondary;
  return (
    <View style={[styles.stat, { backgroundColor: (highlight ? t.colors.warning : t.colors.primary) + '14' }]}>
      <MaterialCommunityIcons name={icon as any} size={14} color={highlight ? t.colors.warningText : t.colors.primary} />
      <Txt variant="labelMedium" color={color} style={{ marginLeft: 5 }}>
        {label}
      </Txt>
    </View>
  );
}

function AddVehicleModal({ visible, onClose, onAdded }: { visible: boolean; onClose: () => void; onAdded: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClaimResult>();

  const submit = async () => {
    if (vin.trim().length < 6) return;
    setLoading(true);
    setResult(undefined);
    try {
      const res = await addVehicleByVin(cleanVin(vin));
      setResult(res);
      if (res.ok) {
        onAdded();
        setVin('');
        // Leave the sheet open briefly so the outcome is readable.
        setTimeout(onClose, 1800);
      }
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Could not submit request.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        {/*
          A bottom sheet is pinned to the bottom of the screen, so the keyboard
          covers it FIRST — and a KeyboardAvoidingView inside a Modal measures
          against the screen rather than the sheet, so it does not help here.
          Padding by the live keyboard height lifts the sheet instead, which
          keeps its own inputs and its submit button reachable.
        */}
        <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.md + keyboardHeight }]}>
          <View style={[styles.handle, { backgroundColor: t.colors.border }]} />
          <View style={{ padding: spacing.lg }}>
            <Txt variant="titleLarge">{tr('garage.addVehicle')}</Txt>
            <Txt tone="secondary" style={{ marginTop: 4 }}>
              Enter your 17-character VIN / chassis number to claim your vehicle and its history.
            </Txt>
            <TextInput
          // iOS renders a LIGHT keyboard in dark mode without this.
          keyboardAppearance={t.isDark ? 'dark' : 'light'}
              value={vin}
              onChangeText={(v) => setVin(cleanVin(v))}
              maxLength={17}
              autoCapitalize="characters"
              placeholder={tr('garage.vinPlaceholder')}
              placeholderTextColor={t.colors.textTertiary}
              style={[t.type.bodyLarge, { marginTop: spacing.lg, color: t.colors.textPrimary, backgroundColor: t.colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: t.colors.border, padding: 14, letterSpacing: 1 }]}
            />
            {result ? (
              <Txt
                variant="bodySmall"
                color={result.ok ? t.colors.successText : t.colors.errorText}
                style={{ marginTop: spacing.md }}
              >
                {result.message}
              </Txt>
            ) : null}
            <View style={{ height: spacing.lg }} />
            <PrimaryButton label={tr('service.claimVehicle')} icon="car-sport" loading={loading} disabled={vin.trim().length < 6} onPress={submit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  reg: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  stat: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  addCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' },
  addIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center' },
});
