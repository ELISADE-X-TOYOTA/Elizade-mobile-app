import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '../src/components/ScreenHeader';
import { Txt } from '../src/components/Txt';
import { useStore, type ThemeMode } from '../src/store/useStore';
import { solid, tint } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';

const OPTIONS: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; labelKey: string; hintKey: string }[] = [
  { mode: 'system', icon: 'phone-portrait-outline', labelKey: 'profile.themeSystem', hintKey: 'profile.themeSystemHint' },
  { mode: 'light', icon: 'sunny-outline', labelKey: 'profile.themeLight', hintKey: 'profile.themeLightHint' },
  { mode: 'dark', icon: 'moon-outline', labelKey: 'profile.themeDark', hintKey: 'profile.themeDarkHint' },
];

export default function AppearanceScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeMode = useStore((s) => s.themeMode);
  const setThemeMode = useStore((s) => s.setThemeMode);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <ScreenHeader title={t('profile.appearance')} subtitle={t('profile.appearanceSubtitle')} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.screenH, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {OPTIONS.map((option, i) => {
            const selected = option.mode === themeMode;
            return (
              <View key={option.mode}>
                <Pressable
                  onPress={() => setThemeMode(option.mode)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(option.labelKey)}
                  style={styles.row}
                >
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: selected
                          ? tint(theme.colors.accent, 0.16)
                          : theme.colors.surfaceAlt,
                        borderColor: selected ? solid(theme.colors.accent) : theme.colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={selected ? solid(theme.colors.accent) : theme.colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Txt variant="titleSmall">{t(option.labelKey)}</Txt>
                    <Txt variant="bodySmall" tone="secondary">
                      {t(option.hintKey)}
                    </Txt>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={22} color={solid(theme.colors.accent)} />
                  ) : null}
                </Pressable>
                {i < OPTIONS.length - 1 ? (
                  <View style={{ height: 1, marginLeft: 58, backgroundColor: theme.colors.border }} />
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  badge: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
