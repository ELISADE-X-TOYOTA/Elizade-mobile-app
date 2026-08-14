import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';
import { solid } from '../theme/colors';

interface Props {
  label: string;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  /** Hard cap on input length (defence against unbounded payloads). */
  maxLength?: number;
  /** Normalises each keystroke, e.g. cleanEmail / cleanPhone / cleanVin. */
  sanitize?: (v: string) => string;
}

/** Labeled, rounded input with optional password reveal. */
export function AppTextField({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  secure,
  keyboardType,
  error,
  autoCapitalize,
  maxLength = 120,
  sanitize,
}: Props) {
  const t = useTheme();
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Txt variant="titleSmall" style={{ marginBottom: spacing.xs }}>
        {label}
      </Txt>
      <View
        style={[
          styles.field,
          {
            backgroundColor: t.colors.surfaceAlt,
            borderColor: error ? solid(t.colors.error) : focused ? t.colors.primary : t.colors.border,
          },
        ]}
      >
        {icon && (
          <Ionicons name={icon} size={20} color={t.colors.textSecondary} style={{ marginRight: 10 }} />
        )}
        <TextInput
          value={value}
          onChangeText={(v) => onChangeText(sanitize ? sanitize(v) : v)}
          placeholder={placeholder}
          placeholderTextColor={t.colors.textTertiary}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCorrect={!secure}
          autoCapitalize={autoCapitalize ?? (keyboardType === 'email-address' ? 'none' : 'sentences')}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[t.type.bodyLarge, { flex: 1, color: t.colors.textPrimary, paddingVertical: 0 }]}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={t.colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: 4 }}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
});
