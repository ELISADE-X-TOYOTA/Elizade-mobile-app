import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';

interface Props {
  title: string;
  subtitle?: string;
}

/**
 * Back button and title for a pushed screen, paying the top safe-area inset.
 *
 * The native header is hidden app-wide (`headerShown: false` in the root
 * layout), so a screen that sets `<Stack.Screen options={{ title }} />` and
 * nothing else gets NO header at all — no title, no back button, on any
 * platform. Three screens did exactly that: My Leads, the lead tracker and
 * Language. On iOS, where the tab bar is out of reach on a pushed screen, the
 * only way out of them was the edge-swipe gesture, which nobody is told about.
 *
 * Every other screen draws this same back button inline. Extracted so the
 * next screen cannot forget it.
 */
export function ScreenHeader({ title, subtitle }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
        accessibilityRole="button"
        accessibilityLabel={tr('common.back')}
        hitSlop={8}
        style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
      >
        <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
      </Pressable>
      <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
        {title}
      </Txt>
      {subtitle ? <Txt tone="secondary">{subtitle}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
