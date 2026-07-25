import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkCarImage } from '../../src/components/NetworkCarImage';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Skeleton } from '../../src/components/Skeleton';
import { Txt } from '../../src/components/Txt';
import { ServiceHistoryItem } from '../../src/domain/types';
import { useOwnedVehicle } from '../../src/hooks/useGarage';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { price } from '../../src/utils/format';

export default function GarageVehicle() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vehicle, history, warranty, loading } = useOwnedVehicle(id ?? '');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.surfaceAlt }}>
        <Skeleton height={280} radius={0} />
        <View style={{ padding: spacing.screenH, gap: 14 }}>
          <Skeleton height={26} width="60%" />
          <Skeleton height={90} />
        </View>
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.surfaceAlt, paddingTop: insets.top + 60, paddingHorizontal: spacing.screenH }}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="titleLarge" style={{ marginTop: 20 }}>
          Vehicle not found
        </Txt>
      </View>
    );
  }

  const dueInDays = Math.round((new Date(vehicle.nextServiceDue).getTime() - Date.now()) / 86_400_000);
  const specs: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }[] = [
    { icon: 'speedometer', label: 'Mileage', value: `${vehicle.mileage.toLocaleString()} km` },
    { icon: 'wrench-clock', label: 'Next service', value: dueInDays > 0 ? `in ${dueInDays} days` : 'Due now' },
    { icon: 'palette', label: 'Colour', value: vehicle.color },
    { icon: 'calendar', label: 'Year', value: `${vehicle.year}` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceAlt }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ height: 280 }}>
          <NetworkCarImage uri={vehicle.image} />
          <Pressable onPress={() => router.back()} style={[styles.circle, { top: insets.top + 6 }]}>
            <Ionicons name="arrow-back" size={20} color="#083E4C" />
          </Pressable>
        </View>

        <View style={[styles.sheet, { backgroundColor: t.colors.surfaceAlt }]}>
          <Txt variant="headlineMedium">
            {vehicle.make} {vehicle.model}
          </Txt>
          <Txt tone="secondary" style={{ marginTop: 2 }}>
            {vehicle.trim} · {vehicle.registrationNumber} · VIN {vehicle.vin}
          </Txt>

          {/* Specs */}
          <View style={styles.specGrid}>
            {specs.map((s) => (
              <View key={s.label} style={[styles.specCard, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <View style={[styles.specIcon, { backgroundColor: t.colors.primary + '14' }]}>
                  <MaterialCommunityIcons name={s.icon} size={18} color={t.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodySmall" tone="secondary">
                    {s.label}
                  </Txt>
                  <Txt variant="titleSmall" numberOfLines={1}>
                    {s.value}
                  </Txt>
                </View>
              </View>
            ))}
          </View>

          {/* Warranty summary */}
          {warranty && (
            <Pressable onPress={() => router.push('/warranty')} style={[styles.warranty, { backgroundColor: t.colors.success + '14', borderColor: t.colors.success + '40' }]}>
              <Ionicons name="shield-checkmark" size={22} color={t.colors.success} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Txt variant="titleSmall">Warranty active</Txt>
                <Txt variant="bodySmall" tone="secondary">
                  Valid until {new Date(warranty.endDate).toLocaleDateString('en', { month: 'short', year: 'numeric' })} · {warranty.mileageLimit.toLocaleString()} km
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.colors.textSecondary} />
            </Pressable>
          )}

          {/* Quick actions */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Book Service" icon="construct" onPress={() => router.push('/book-service')} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Warranty" variant="outline" icon="shield-checkmark" onPress={() => router.push('/warranty')} />
            </View>
          </View>

          {/* Service history */}
          <Txt variant="titleLarge" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Service history
          </Txt>
          {history.length ? (
            history.map((h) => <HistoryRow key={h.id} item={h} />)
          ) : (
            <Txt tone="secondary">No service records yet.</Txt>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function HistoryRow({ item }: { item: ServiceHistoryItem }) {
  const t = useTheme();
  return (
    <View style={[styles.historyRow, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <View style={[styles.dot, { backgroundColor: t.colors.success + '18' }]}>
        <Ionicons name="checkmark" size={16} color={t.colors.success} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Txt variant="titleSmall" numberOfLines={1}>
          {item.type}
        </Txt>
        <Txt variant="bodySmall" tone="secondary">
          {new Date(item.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })} · {item.mileage.toLocaleString()} km
        </Txt>
      </View>
      <Txt variant="titleSmall" color={t.colors.primary}>
        {price(item.cost)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.screenH, paddingTop: spacing.xl },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.lg },
  specCard: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1 },
  specIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  warranty: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.lg },
  historyRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.md, borderWidth: 1, marginBottom: 10 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
