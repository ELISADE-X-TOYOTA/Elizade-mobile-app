import { Ionicons } from '@expo/vector-icons';
// Class component: no hooks, so the instance is used directly.
import i18n from '../i18n';
import { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, solid, tint } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { type } from '../theme/typography';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Catches render-time crashes anywhere below it.
 *
 * SECURITY: production builds show only a generic recovery screen — the error
 * message and component stack are never rendered, so internals (file paths,
 * API shapes, tokens embedded in messages) can't leak to the user or a
 * screenshot. In __DEV__ the error is re-thrown to keep the RN redbox.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) {
      // Keep the developer experience: surface the real error locally.
      throw error;
    }
    // TODO: forward to Sentry/Crashlytics here — never to the UI.
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    // Uses static tokens: the theme hook may itself be unavailable mid-crash.
    const c = palette.light;
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <View style={[styles.icon, { backgroundColor: tint(c.error, 0.1) }]}>
          <Ionicons name="warning-outline" size={40} color={solid(c.error)} />
        </View>
        <Text style={[type.headlineSmall, { color: c.textPrimary, marginTop: spacing.lg }]}>{i18n.t('errors.boundaryTitle')}</Text>
        <Text style={[type.bodyMedium, styles.body, { color: c.textSecondary }]}>
          {i18n.t('errors.boundaryBody')}
        </Text>
        <Pressable onPress={this.reset} style={[styles.btn, { backgroundColor: solid(c.accent) }]}>
          <Text style={[type.labelLarge, { color: c.onAccent }]}>{i18n.t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  body: { textAlign: 'center', marginTop: spacing.sm },
  btn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
