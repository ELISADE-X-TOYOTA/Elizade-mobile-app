import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Vehicle } from '../domain/types';
import { useStore } from '../store/useStore';
import { OVERLAY_CHIP, OVERLAY_CHIP_INK, solid } from '../theme/colors';
import { useTheme } from '../theme/useTheme';

interface Props {
  vehicle: Vehicle;
  /** `chip` floats on vehicle imagery; `plain` sits on a themed surface. */
  variant?: 'chip' | 'plain';
  size?: number;
  style?: ViewStyle;
}

/**
 * Stages a vehicle for side-by-side comparison.
 *
 * Selection state is read with a narrow selector (`some(...)`) rather than by
 * pulling the whole `compare` array, so an unrelated vehicle entering the tray
 * doesn't re-render every card in the showroom grid.
 */
export function CompareButton({ vehicle, variant = 'chip', size = 34, style }: Props) {
  const t = useTheme();
  const selected = useStore((s) => s.compare.some((c) => c.id === vehicle.id));
  const toggleCompare = useStore((s) => s.toggleCompare);

  const isChip = variant === 'chip';
  // On a chip the ink is theme-fixed (it floats over photography); on a plain
  // surface it follows the theme like any other control.
  const idleBg = isChip ? OVERLAY_CHIP : t.colors.surfaceAlt;
  const idleInk = isChip ? OVERLAY_CHIP_INK : t.colors.textPrimary;

  return (
    <Pressable
      onPress={() => toggleCompare(vehicle)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={
        selected ? `Remove ${vehicle.model} from comparison` : `Add ${vehicle.model} to comparison`
      }
      style={[
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: selected ? solid(t.colors.accent) : idleBg,
          borderColor: isChip ? 'transparent' : t.colors.border,
          borderWidth: isChip ? 0 : 1,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        // Same glyph either way — the accent fill carries the selected state,
        // so the icon stays a stable anchor instead of morphing under the tap.
        name="scale-balance"
        size={size * 0.53}
        color={selected ? t.colors.onAccent : idleInk}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
});
