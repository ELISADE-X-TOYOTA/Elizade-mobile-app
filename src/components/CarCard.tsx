import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { OVERLAY_CHIP, OVERLAY_CHIP_INK } from '../theme/colors';
import { CATEGORY_META, Vehicle, vehicleTitle } from '../domain/types';
import { useStore } from '../store/useStore';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { priceCompact } from '../utils/format';
import { CompareButton } from './CompareButton';
import { NetworkCarImage } from './NetworkCarImage';
import { Txt } from './Txt';

interface Props {
  vehicle: Vehicle;
  onPress?: () => void;
  wide?: boolean;
  width?: number;
}

/** Premium car card. `wide` = tall home-carousel variant; default = grid card. */
function CarCardBase({ vehicle, onPress, wide, width }: Props) {
  const t = useTheme();
  // PERF: subscribe to this card's boolean only — selecting the whole
  // favorites array re-rendered every card whenever any heart was tapped.
  const isFav = useStore((s) => s.favorites.includes(vehicle.id));
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const onToggleFav = useCallback(() => toggleFavorite(vehicle.id), [toggleFavorite, vehicle.id]);
  const meta = CATEGORY_META[vehicle.category];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { width, backgroundColor: t.colors.surface, borderColor: t.colors.border },
        t.shadows.card,
      ]}
    >
      <View style={{ height: wide ? 168 : 118 }}>
        <NetworkCarImage uri={vehicle.images[0]} />
        <View style={styles.badge}>
          <MaterialCommunityIcons name={meta.icon as any} size={13} color={OVERLAY_CHIP_INK} />
          <Txt variant="labelSmall" color={OVERLAY_CHIP_INK} style={{ marginLeft: 4 }}>
            {meta.label}
          </Txt>
        </View>
        <Pressable
          onPress={onToggleFav}
          hitSlop={8}
          style={styles.fav}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={18}
            // Fixed ink, not textSecondary — this chip is light in both themes,
            // so a themed foreground turned the outline heart pale-on-white.
            color={isFav ? t.colors.error : OVERLAY_CHIP_INK}
          />
        </Pressable>
        <CompareButton vehicle={vehicle} style={styles.compare} />
      </View>

      <View style={{ padding: 14 }}>
        <View style={styles.rowBetween}>
          <Txt variant="titleMedium" numberOfLines={1} style={{ flex: 1 }}>
            {vehicleTitle(vehicle)}
          </Txt>
          <Ionicons name="star" size={15} color={t.colors.warning} style={{ marginLeft: 6 }} />
          <Txt variant="titleSmall" style={{ marginLeft: 2 }}>
            {vehicle.rating.toFixed(1)}
          </Txt>
        </View>

        <View style={[styles.row, { marginTop: 3 }]}>
          <Ionicons name="location" size={13} color={t.colors.textSecondary} />
          <Txt variant="bodySmall" tone="secondary" numberOfLines={1} style={{ flex: 1, marginLeft: 3 }}>
            {vehicle.location}
          </Txt>
        </View>

        <View style={[styles.row, { marginTop: 10, gap: 6 }]}>
          <Spec icon="water" label={vehicle.fuelType} />
          <Spec icon="settings" label={vehicle.transmission} />
          {wide && <Spec icon="calendar" label={`${vehicle.year}`} />}
        </View>

        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          <Txt variant="titleLarge" color={t.colors.primary}>
            {priceCompact(vehicle.price)}
          </Txt>
          <View style={[styles.arrow, { backgroundColor: t.colors.primary }]}>
            <Ionicons name="arrow-forward" size={18} color={t.colors.onPrimary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Memoised so list scrolling does not re-render every card. */
export const CarCard = memo(CarCardBase);

function Spec({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.spec, { backgroundColor: t.colors.surfaceAlt, flexShrink: 1 }]}>
      <Ionicons name={icon} size={12} color={t.colors.textSecondary} />
      <Txt variant="bodySmall" tone="secondary" numberOfLines={1} style={{ marginLeft: 4 }}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: OVERLAY_CHIP,
  },
  fav: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: OVERLAY_CHIP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stacked under the favourite button, sharing its right gutter.
  compare: { position: 'absolute', top: 48, right: 8 },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  arrow: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
