import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';
import { solid } from '../theme/colors';

interface Props {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  headline: string;
  description: string;
  phase: string;
  features: { icon: keyof typeof Ionicons.glyphMap; label: string }[];
}

/** Polished placeholder for Elizade Connect modules landing in later phases. */
export function ComingSoon({ title, icon, headline, description, phase, features }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceAlt, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.screenH, paddingVertical: spacing.sm }}>
        <Txt variant="headlineMedium">{title}</Txt>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={t.gradients.hero} style={[styles.hero, { borderColor: t.colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: solid(t.colors.accent) }]}>
            <Ionicons name={icon} size={30} color={t.colors.onAccent} />
          </View>
          <View style={[styles.badge, { backgroundColor: solid(t.colors.accent) }]}>
            <Txt variant="labelSmall" color={t.colors.onAccent}>
              {phase}
            </Txt>
          </View>
          <Txt variant="headlineSmall" style={{ marginTop: spacing.md }}>
            {headline}
          </Txt>
          <Txt tone="secondary" style={{ marginTop: 6 }}>
            {description}
          </Txt>
        </LinearGradient>

        <Txt variant="labelMedium" tone="secondary" style={{ marginTop: spacing.xl, marginBottom: spacing.xs }}>
          WHAT'S COMING
        </Txt>
        <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          {features.map((f, i) => (
            <View key={f.label}>
              <View style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: t.colors.primary + '14' }]}>
                  <Ionicons name={f.icon} size={18} color={t.colors.primary} />
                </View>
                <Txt variant="titleSmall" style={{ flex: 1 }}>
                  {f.label}
                </Txt>
                <Ionicons name="ellipse-outline" size={16} color={t.colors.textTertiary} />
              </View>
              {i < features.length - 1 && <View style={{ height: 1, marginLeft: 54, backgroundColor: t.colors.border }} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1 },
  iconWrap: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: spacing.lg, right: spacing.lg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  featureIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});
