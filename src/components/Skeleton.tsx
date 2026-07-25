import { useEffect } from 'react';
import { DimensionValue, StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { radius as rad } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';

interface Props {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder block. */
export function Skeleton({ width = '100%', height = 16, radius = rad.sm, style }: Props) {
  const t = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: t.colors.surfaceAlt },
        anim,
        style,
      ]}
    />
  );
}

/** Card-shaped loading placeholder for vehicle grids/carousels. */
export function CarCardSkeleton({ width }: { width?: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        width,
        padding: 12,
        borderRadius: rad.lg,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface,
      }}
    >
      <Skeleton height={118} radius={rad.md} />
      <Skeleton height={16} width="70%" style={{ marginTop: 12 }} />
      <Skeleton height={12} width="45%" style={{ marginTop: 8 }} />
      <Skeleton height={20} width="55%" style={{ marginTop: 14 }} />
    </View>
  );
}
