import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '../src/components/Txt';
import i18n, { LANGUAGES, changeLanguage, findLanguage, type Language } from '../src/i18n';
import { solid, tint } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';

/**
 * Language preference.
 *
 * Each option is written in its own language, so someone who cannot read the
 * current interface language can still find theirs. The English name sits
 * underneath as a subtitle for anyone scanning a script they don't read.
 */
export default function LanguageScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(findLanguage(i18n.language).code);

  const select = async (lang: Language) => {
    if (lang.code === active) return;
    // Optimistic: the list re-renders in the new language immediately.
    setActive(lang.code);
    const needsRestart = await changeLanguage(lang.code);

    if (needsRestart) {
      // forceRTL only takes effect on a fresh native layout pass. Views
      // already mounted keep their old direction, so telling the user is the
      // honest option — silently half-mirroring the app is worse.
      Alert.alert(
        i18n.t('language.restartTitle'),
        i18n.t('language.restartBody', { language: lang.endonym }),
        [{ text: i18n.t('language.restartConfirm') }],
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <Stack.Screen options={{ title: t('language.title'), headerBackTitle: t('common.back') }} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <Txt variant="bodyMedium" tone="secondary" style={{ marginBottom: spacing.md }}>
          {t('language.subtitle')}
        </Txt>

        <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {LANGUAGES.map((lang, i) => {
            const selected = lang.code === active;
            return (
              <View key={lang.code}>
                <Pressable
                  onPress={() => select(lang)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={lang.english}
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
                    <Txt variant="labelMedium" color={theme.colors.textSecondary}>
                      {lang.code.toUpperCase()}
                    </Txt>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    {/* The endonym is the primary label — it is the one the
                        speaker of this language will recognise. */}
                    <Txt variant="titleSmall">{lang.endonym}</Txt>
                    {lang.endonym !== lang.english ? (
                      <Txt variant="bodySmall" tone="secondary">
                        {lang.english}
                      </Txt>
                    ) : null}
                  </View>

                  {selected ? (
                    <Ionicons name="checkmark-circle" size={22} color={solid(theme.colors.accent)} />
                  ) : null}
                </Pressable>
                {i < LANGUAGES.length - 1 ? (
                  <View style={{ height: 1, marginLeft: 58, backgroundColor: theme.colors.border }} />
                ) : null}
              </View>
            );
          })}
        </View>

        <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: spacing.md }}>
          {t('profile.appearanceNote')}
        </Txt>
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
