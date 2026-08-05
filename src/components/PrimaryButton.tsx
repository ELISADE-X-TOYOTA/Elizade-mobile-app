import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { radius } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';
import { ON_DARK_INK } from '../theme/colors';

type Variant = 'primary' | 'accent' | 'outline';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/** Rounded, gradient-capable CTA with an integrated loading state. */
export function PrimaryButton({
  label,
  onPress,
  variant = 'accent',
  icon,
  loading,
  disabled,
  style,
}: Props) {
  const t = useTheme();
  const isOutline = variant === 'outline';
  const fg =
    variant === 'accent' ? t.colors.onAccent : isOutline ? t.colors.primary : ON_DARK_INK;
  const colors = variant === 'accent' ? t.gradients.accent : t.gradients.primary;
  const off = disabled || loading;

  const inner = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={fg} style={{ marginRight: 8 }} />}
          <Txt variant="labelLarge" color={fg}>
            {label}
          </Txt>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        { opacity: off ? 0.55 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
        style,
      ]}
    >
      {isOutline ? (
        <View
          style={[
            styles.base,
            { borderRadius: radius.md, borderWidth: 1.5, borderColor: t.colors.border },
          ]}
        >
          {inner}
        </View>
      ) : (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, { borderRadius: radius.md }, t.shadows.card]}
        >
          {inner}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
