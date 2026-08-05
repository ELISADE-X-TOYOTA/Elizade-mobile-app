import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompareButton } from '../../src/components/CompareButton';
import { NetworkCarImage } from '../../src/components/NetworkCarImage';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Skeleton } from '../../src/components/Skeleton';
import { Txt } from '../../src/components/Txt';
import { ON_DARK_INK, OVERLAY_CHIP, OVERLAY_CHIP_INK } from '../../src/theme/colors';
import { vehicleSubtitle, vehicleTitle } from '../../src/domain/types';
import { useVehicle } from '../../src/hooks/useVehicles';
import { useStore } from '../../src/store/useStore';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { mileage, priceCompact } from '../../src/utils/format';
import { FinancingModal } from '../../src/components/FinancingModal';
import { QuoteModal } from '../../src/components/QuoteModal';
import { SalesMode, TestDriveModal } from '../../src/components/TestDriveModal';

const { width } = Dimensions.get('window');

export default function CarDetails() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vehicle, loading, error } = useVehicle(id ?? '');
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const [imgIndex, setImgIndex] = useState(0);
  const [sale, setSale] = useState<SalesMode | null>(null);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  if (loading) return <DetailLoading />;
  if (error || !vehicle) return <DetailError message={error} />;

  const v = vehicle;
  const isFav = favorites.includes(v.id);

  const specs: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }[] = [
    { icon: 'engine', label: 'Engine', value: v.engine },
    { icon: 'flash', label: 'Power', value: `${v.horsepower} hp` },
    { icon: 'car-shift-pattern', label: 'Transmission', value: v.transmission },
    { icon: 'gas-station', label: 'Fuel', value: v.fuelType },
    { icon: 'car-seat', label: 'Seats', value: `${v.seats}` },
    { icon: 'speedometer', label: 'Mileage', value: mileage(v.mileage) },
    { icon: 'palette', label: 'Color', value: v.color },
    { icon: 'calendar', label: 'Year', value: `${v.year}` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Image carousel */}
        <View style={{ height: 340 }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll}>
            {v.images.map((uri, i) => (
              <View key={i} style={{ width, height: 340 }}>
                <NetworkCarImage uri={uri} />
              </View>
            ))}
          </ScrollView>
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.25)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Top bar */}
          <View style={[styles.topbar, { top: insets.top + 4 }]}>
            <CircleBtn icon="arrow-back" onPress={() => router.back()} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <CompareButton vehicle={v} size={40} />
              <CircleBtn icon="share-social-outline" onPress={() => {}} />
              <CircleBtn
                icon={isFav ? 'heart' : 'heart-outline'}
                tint={isFav ? t.colors.error : undefined}
                onPress={() => toggleFavorite(v.id)}
              />
            </View>
          </View>

          {/* 360 chip */}
          <View style={styles.chip360}>
            <MaterialCommunityIcons name="rotate-360" size={18} color={ON_DARK_INK} />
            <Txt variant="bodySmall" color={ON_DARK_INK} style={{ marginLeft: 6 }}>
              360° View
            </Txt>
          </View>

          {/* Dots */}
          {v.images.length > 1 && (
            <View style={styles.dots}>
              {v.images.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === imgIndex ? 20 : 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: i === imgIndex ? t.colors.accent : 'rgba(255,255,255,0.6)',
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* Body sheet */}
        <View style={[styles.sheet, { backgroundColor: t.colors.surfaceAlt }]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Txt variant="headlineMedium">{vehicleTitle(v)}</Txt>
              <Txt tone="secondary" style={{ marginTop: 4 }}>
                {vehicleSubtitle(v)}
              </Txt>
            </View>
            <View style={[styles.ratingPill, { backgroundColor: t.colors.warning + '1F' }]}>
              <Ionicons name="star" size={16} color={t.colors.warning} />
              <Txt variant="titleSmall" color={t.colors.warning} style={{ marginLeft: 4 }}>
                {v.rating}
              </Txt>
              <Txt variant="bodySmall" tone="secondary">
                {'  '}({v.reviewCount})
              </Txt>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 8 }]}>
            <Ionicons name="location" size={16} color={t.colors.primary} />
            <Txt style={{ marginLeft: 4, flex: 1 }}>{v.location}</Txt>
            {v.isVerified && (
              <View style={[styles.verified, { backgroundColor: t.colors.success + '1F' }]}>
                <Ionicons name="shield-checkmark" size={13} color={t.colors.success} />
                <Txt variant="labelSmall" color={t.colors.success} style={{ marginLeft: 4 }}>
                  Verified
                </Txt>
              </View>
            )}
          </View>

          {/* Specs */}
          <Txt variant="titleLarge" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
            Specifications
          </Txt>
          <View style={styles.specGrid}>
            {specs.map((s) => (
              <View key={s.label} style={[styles.specCard, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <View style={[styles.specIcon, { backgroundColor: t.colors.primary + '14' }]}>
                  <MaterialCommunityIcons name={s.icon} size={19} color={t.colors.primary} />
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

          {/* Features */}
          <Txt variant="titleLarge" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
            Features
          </Txt>
          <View style={styles.features}>
            {v.features.map((f) => (
              <View key={f} style={[styles.feature, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <Ionicons name="checkmark-circle" size={15} color={t.colors.success} />
                <Txt variant="titleSmall" style={{ marginLeft: 6 }}>
                  {f}
                </Txt>
              </View>
            ))}
          </View>

          {/* Buying tools */}
          <Txt variant="titleLarge" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
            Buying Tools
          </Txt>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ToolBtn icon="calculator" label="Financing" onPress={() => setFinanceOpen(true)} />
            <ToolBtn icon="document-text" label="Get Quote" onPress={() => setQuoteOpen(true)} />
            <ToolBtn icon="swap-horizontal" label="Trade-in" onPress={() => router.push('/trade-in')} />
          </View>

          {/* Owner */}
          <View style={[styles.owner, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}>
            <View style={[styles.ownerAvatar, { backgroundColor: t.colors.primary }]}>
              <Ionicons name="storefront" size={22} color={ON_DARK_INK} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Txt variant="titleMedium">{v.dealerName}</Txt>
              <Txt variant="bodySmall" tone="secondary">
                Verified Dealer · {v.ownerHistory} owner
              </Txt>
            </View>
            <RoundAction icon="chatbubble-outline" />
            <View style={{ width: 8 }} />
            <RoundAction icon="call" />
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bottombar, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + 12 }, t.shadows.elevated]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Txt variant="bodySmall" tone="secondary">
              Price
            </Txt>
            <Txt variant="titleLarge" color={t.colors.primary}>
              {priceCompact(v.price)}
            </Txt>
          </View>
          <View style={[styles.availChip, { backgroundColor: t.colors.success + '1F' }]}>
            <Ionicons name="checkmark-circle" size={14} color={t.colors.success} />
            <Txt variant="labelSmall" color={t.colors.success} style={{ marginLeft: 4 }}>
              Available
            </Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Reserve" variant="outline" onPress={() => setSale('reserve')} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Test Drive" icon="car-sport" onPress={() => setSale('testdrive')} />
          </View>
        </View>
      </View>

      <TestDriveModal visible={sale !== null} mode={sale ?? 'testdrive'} vehicle={v} onClose={() => setSale(null)} />
      <FinancingModal visible={financeOpen} vehiclePrice={v.price} vehicleTitle={vehicleTitle(v)} onClose={() => setFinanceOpen(false)} />
      <QuoteModal visible={quoteOpen} vehicle={v} onClose={() => setQuoteOpen(false)} />
    </View>
  );
}

function DetailLoading() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Skeleton height={340} radius={0} />
      <View style={{ padding: spacing.screenH, gap: 14 }}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={16} width="40%" />
        <View style={{ height: spacing.md }} />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </View>
    </View>
  );
}

function DetailError({ message }: { message?: string }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingTop: insets.top + 60, paddingHorizontal: spacing.screenH }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 20 }}>
        <Ionicons name="arrow-back" size={24} color={t.colors.textPrimary} />
      </Pressable>
      <Txt variant="titleLarge">Couldn't load this vehicle</Txt>
      <Txt tone="secondary" style={{ marginTop: 8 }}>
        {message ?? 'Please check your connection and try again.'}
      </Txt>
    </View>
  );
}

function CircleBtn({ icon, onPress, tint }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; tint?: string }) {
  return (
    <Pressable onPress={onPress} style={styles.circle}>
      <Ionicons name={icon} size={20} color={tint ?? OVERLAY_CHIP_INK} />
    </Pressable>
  );
}

function ToolBtn({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.tool, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <View style={[styles.toolIcon, { backgroundColor: t.colors.primary + '14' }]}>
        <Ionicons name={icon} size={20} color={t.colors.primary} />
      </View>
      <Txt variant="titleSmall" style={{ marginTop: 8 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

function RoundAction({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  const t = useTheme();
  return (
    <View style={[styles.roundAction, { backgroundColor: t.colors.primary + '14' }]}>
      <Ionicons name={icon} size={20} color={t.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: OVERLAY_CHIP, alignItems: 'center', justifyContent: 'center' },
  chip360: { position: 'absolute', right: 16, bottom: 56, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  dots: { position: 'absolute', bottom: 44, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  sheet: { marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.screenH, paddingTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  verified: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  specCard: { width: (width - spacing.screenH * 2 - 12) / 2, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1 },
  specIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1 },
  tool: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  toolIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  owner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.xl },
  ownerAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  roundAction: { width: 42, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  bottombar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.screenH, paddingTop: spacing.md, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  availChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
});
