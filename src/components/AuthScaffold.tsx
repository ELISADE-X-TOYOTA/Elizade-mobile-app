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
}

/** Teal hero header over a rounded surface sheet — shared by all auth screens. */
export function AuthScaffold({ title, subtitle, children, showBack = true }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
          <View style={{ paddingHorizontal: spacing.screenH, paddingBottom: spacing.xl }}>
            {showBack ? (
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
                style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.border }]}
              >
                <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
              </Pressable>
            ) : (
              <View style={{ height: 8 }} />
            )}
            <View style={{ height: spacing.lg }} />
            <Txt variant="displayMedium">{title}</Txt>
            <Txt variant="bodyLarge" tone="secondary" style={{ marginTop: spacing.xs }}>
              {subtitle}
            </Txt>
          </View>
        </View>

        <View
          style={[
            styles.sheet,
            { backgroundColor: t.colors.surface },
          ]}
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
});
