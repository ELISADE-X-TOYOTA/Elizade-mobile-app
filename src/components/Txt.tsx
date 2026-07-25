import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { TypeVariant } from '../theme/typography';

interface Props extends TextProps {
  variant?: TypeVariant;
  color?: string;
  /** 'primary' | 'secondary' | 'tertiary' resolve to theme text colors. */
  tone?: 'primary' | 'secondary' | 'tertiary';
  center?: boolean;
}

/** Themed text: applies a typography variant + resolved color. */
export function Txt({
  variant = 'bodyMedium',
  color,
  tone = 'primary',
  center,
  style,
  ...rest
}: Props) {
  const t = useTheme();
  const toneColor =
    tone === 'secondary'
      ? t.colors.textSecondary
      : tone === 'tertiary'
        ? t.colors.textTertiary
        : t.colors.textPrimary;
  const base = t.type[variant] as TextStyle;
  return (
    <Text
      {...rest}
      style={[
        base,
        { color: color ?? toneColor },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
