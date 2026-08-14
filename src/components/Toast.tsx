import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';
import { solid } from '../theme/colors';

export type ToastTone = 'error' | 'success' | 'info';

export interface ToastState {
  tone: ToastTone;
  title: string;
  message?: string;
}

interface Props extends Partial<ToastState> {
  visible: boolean;
  onDismiss: () => void;
  /** Auto-hide delay; pass 0 to require manual dismissal. */
  duration?: number;
}

/** Long enough to read a short sentence, short enough to stay unobtrusive. */
const DEFAULT_DURATION = 3500;

const ICONS: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  error: 'alert-circle',
  success: 'checkmark-circle',
  info: 'information-circle',
};

/**
 * Drop-in notification banner — informational only, no actions.
 *
 * Rendered above the screen content (not in a Modal) so it can coexist with an
 * open keyboard — a Modal would dismiss the keyboard and lose focus, which is
 * exactly wrong when the message is about a field the user is still editing.
 *
 * Auto-dismisses so it never blocks the flow; the close button is a courtesy
 * for dismissing early, not a required interaction.
 */
export function Toast({
  visible,
  tone = 'info',
  title = '',
  message,
  onDismiss,
  duration = DEFAULT_DURATION,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible || duration <= 0) return;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  // Fill token: this drives the border, the icon well and the glyph — all
  // graphics. The toast's own text uses the theme's text tokens.
  const accentFill =
    tone === 'error' ? t.colors.error : tone === 'success' ? t.colors.success : t.colors.info;
  const accent = solid(accentFill);

  return (
    <Animated.View
      // Plain slide, no spring: a straight timed glide down and back up, with
      // no bounce or overshoot.
      entering={SlideInUp.duration(220)}
      exiting={SlideOutUp.duration(180)}
      style={[styles.wrap, { top: insets.top + spacing.xs }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.card,
          { backgroundColor: t.colors.surface, borderColor: accent + '55' },
          t.shadows.elevated,
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: accent + '1A' }]}>
          <Ionicons name={ICONS[tone]} size={20} color={accent} />
        </View>

        <View style={{ flex: 1 }}>
          <Txt variant="titleSmall">{title}</Txt>
          {message ? (
            <Txt variant="bodySmall" tone="secondary" style={{ marginTop: 2 }}>
              {message}
            </Txt>
          ) : null}
        </View>

        <Pressable onPress={onDismiss} hitSlop={10} accessibilityLabel="Dismiss">
          <Ionicons name="close" size={18} color={t.colors.textTertiary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.screenH, right: spacing.screenH, zIndex: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconWrap: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
