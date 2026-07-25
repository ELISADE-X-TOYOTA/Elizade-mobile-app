import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkCarImage } from '../src/components/NetworkCarImage';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Skeleton } from '../src/components/Skeleton';
import { Txt } from '../src/components/Txt';
import { addVehicleByVin } from '../src/data/garageRepository';
import { OwnedVehicle } from '../src/domain/types';
import { useOwnedVehicles } from '../src/hooks/useGarage';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { cleanVin } from '../src/utils/sanitize';

export default function Garage() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { vehicles, loading, reload } = useOwnedVehicles();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceAlt }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          My Vehicles
        </Txt>
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
            <Txt variant="titleMedium">Add a vehicle</Txt>
            <Txt variant="bodySmall" tone="secondary">
              Claim your Toyota by chassis / VIN
            </Txt>
          </View>
        </Pressable>
      </ScrollView>

      <AddVehicleModal visible={addOpen} onClose={() => setAddOpen(false)} onAdded={reload} />
    </View>
  );
}

function VehicleCard({ vehicle }: { vehicle: OwnedVehicle }) {
  const t = useTheme();
  const dueInDays = Math.round((new Date(vehicle.nextServiceDue).getTime() - Date.now()) / 86_400_000);
  return (
    <Pressable onPress={() => router.push(`/garage-vehicle/${vehicle.id}`)} style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.card]}>
      <View style={{ height: 140 }}>
        <NetworkCarImage uri={vehicle.image} />
        <View style={[styles.reg, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <Txt variant="labelSmall" color="#fff">
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
  const color = highlight ? t.colors.warning : t.colors.textSecondary;
  return (
    <View style={[styles.stat, { backgroundColor: (highlight ? t.colors.warning : t.colors.primary) + '14' }]}>
      <MaterialCommunityIcons name={icon as any} size={14} color={highlight ? t.colors.warning : t.colors.primary} />
      <Txt variant="labelMedium" color={color} style={{ marginLeft: 5 }}>
        {label}
      </Txt>
    </View>
  );
}

function AddVehicleModal({ visible, onClose, onAdded }: { visible: boolean; onClose: () => void; onAdded: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (vin.trim().length < 6) return;
    setLoading(true);
    try {
      await addVehicleByVin(cleanVin(vin));
      onAdded();
      setVin('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={[styles.handle, { backgroundColor: t.colors.border }]} />
          <View style={{ padding: spacing.lg }}>
            <Txt variant="titleLarge">Add a vehicle</Txt>
            <Txt tone="secondary" style={{ marginTop: 4 }}>
              Enter your 17-character VIN / chassis number to claim your vehicle and its history.
            </Txt>
            <TextInput
              value={vin}
              onChangeText={(v) => setVin(cleanVin(v))}
              maxLength={17}
              autoCapitalize="characters"
              placeholder="e.g. JTMBBREV50D123456"
              placeholderTextColor={t.colors.textTertiary}
              style={[t.type.bodyLarge, { marginTop: spacing.lg, color: t.colors.textPrimary, backgroundColor: t.colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: t.colors.border, padding: 14, letterSpacing: 1 }]}
            />
            <View style={{ height: spacing.lg }} />
            <PrimaryButton label="Claim Vehicle" icon="car-sport" loading={loading} disabled={vin.trim().length < 6} onPress={submit} />
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
