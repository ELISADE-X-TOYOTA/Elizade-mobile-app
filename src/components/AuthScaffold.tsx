import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  showBack?: boolean;
  /**
   * Keeps the subtitle on one line, scaling it down slightly if the device is
   * narrow. Use for copy that reads badly when broken across lines.
   */
  compactSubtitle?: boolean;
  /** Pinned to the bottom, outside the scroll area (e.g. a primary CTA). */
  footer?: ReactNode;
}

/**
 * Shared layout for the auth screens: header block over a rounded sheet.
 *
 * LAYOUT: header and sheet share a single `screenH` gutter so the title,
 * subtitle and form fields all sit on the same vertical line. (They used to
 * differ — the header nested two `screenH` paddings for a 40px inset while the
 * sheet used 24px, which read as a misalignment.)
 */
export function AuthScaffold({
  title,
  subtitle,
  children,
  showBack = true,
  compactSubtitle = false,
  footer,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // Android resizes the window itself, but 'height' keeps the pinned
        // footer glued to the keyboard rather than letting it be covered.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
          {showBack ? (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={[
                styles.backBtn,
                { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border },
              ]}
            >
              <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={{ height: 8 }} />
          )}

          <View style={{ height: spacing.lg }} />
          <Txt variant="displayMedium">{title}</Txt>
          <Txt
            variant={compactSubtitle ? 'bodyMedium' : 'bodyLarge'}
            tone="secondary"
            style={{ marginTop: spacing.xs }}
            // Shrink-to-fit rather than wrap, so the line stays intact on
            // narrow devices instead of breaking awkwardly.
            numberOfLines={compactSubtitle ? 1 : undefined}
            adjustsFontSizeToFit={compactSubtitle}
            minimumFontScale={0.82}
          >
            {subtitle}
          </Txt>
        </View>

        <View style={[styles.sheet, { backgroundColor: t.colors.surface }]}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: spacing.screenH,
              paddingTop: spacing.xl,
              paddingBottom: footer ? spacing.lg : insets.bottom + spacing.xxl,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View
              style={[
                styles.footer,
                { borderTopColor: t.colors.border, paddingBottom: insets.bottom + spacing.md },
              ]}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Single source of truth for the gutter — matches the sheet below.
  header: { paddingHorizontal: spacing.screenH, paddingBottom: spacing.xl },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  footer: {
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
