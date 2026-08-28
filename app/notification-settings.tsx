import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationsApi, type PreferenceItemDto } from '../src/api/notifications';
import { Txt } from '../src/components/Txt';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';

/**
 * Which notifications reach the customer, and how.
 *
 * The server returns the complete matrix rather than only stored deviations,
 * so this screen never has to know the defaults — it renders exactly what it
 * is given.
 *
 * In-app is deliberately absent: it is the permanent record, and a customer
 * who muted everything would have nowhere to look afterwards.
 */

const CATEGORY_META: Record<string, { label: string; blurb: string; icon: keyof typeof Ionicons.glyphMap }> = {
  service: { label: 'Service', blurb: 'Bookings, approvals and when your vehicle is ready', icon: 'construct-outline' },
  sales: { label: 'Sales', blurb: 'Test drives, quotes and models you track', icon: 'pricetag-outline' },
  warranty: { label: 'Warranty', blurb: 'Claim decisions and safety recalls', icon: 'shield-checkmark-outline' },
  support: { label: 'Support', blurb: 'Replies to your tickets', icon: 'chatbubble-ellipses-outline' },
  promo: { label: 'Offers', blurb: 'Promotions and new arrivals', icon: 'megaphone-outline' },
  system: { label: 'Account', blurb: 'Sign-ins and changes to your details', icon: 'person-outline' },
};

const CHANNELS: { key: string; label: string }[] = [
  { key: 'push', label: 'Push' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
];

const ORDER = ['service', 'sales', 'warranty', 'support', 'promo', 'system'];

export default function NotificationSettings() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<PreferenceItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [savingKey, setSavingKey] = useState<string>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    notificationsApi
      .preferences()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your settings.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const valueOf = (category: string, channel: string) =>
    items.find((i) => i.category === category && i.channel === channel)?.enabled ?? false;

  const toggle = async (category: string, channel: string) => {
    const key = `${category}:${channel}`;
    const next = !valueOf(category, channel);

    // Optimistic: a settings toggle that waits on the network feels broken.
    setItems((prev) =>
      prev.map((i) => (i.category === category && i.channel === channel ? { ...i, enabled: next } : i)),
    );
    setSavingKey(key);
    try {
      const res = await notificationsApi.updatePreferences([{ category, channel, enabled: next }]);
      setItems(res.items);
    } catch (e) {
      // Put it back — a toggle that silently reverted on the server but not
      // here would lie to the customer every time they returned.
      setItems((prev) =>
        prev.map((i) => (i.category === category && i.channel === channel ? { ...i, enabled: !next } : i)),
      );
      setError(e instanceof Error ? e.message : 'That change did not save.');
    } finally {
      setSavingKey(undefined);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={tr('common.goBack')}
          style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>{tr('notifications.title')}</Txt>
        <Txt tone="secondary">{tr('notifications.chooseHow')}</Txt>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginBottom: spacing.md }}>
            {error}
          </Txt>
        ) : null}

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{ height: 116, borderRadius: radius.md, backgroundColor: t.colors.surfaceAlt }}
              />
            ))}
          </View>
        ) : (
          ORDER.filter((c) => CATEGORY_META[c]).map((category) => {
            const meta = CATEGORY_META[category];
            return (
              <View
                key={category}
                style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
              >
                <View style={styles.cardHead}>
                  <Ionicons name={meta.icon} size={19} color={t.colors.accentText} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Txt variant="titleMedium">{meta.label}</Txt>
                    <Txt variant="bodySmall" tone="secondary">
                      {meta.blurb}
                    </Txt>
                  </View>
                </View>

                <View style={[styles.rows, { borderTopColor: t.colors.border }]}>
                  {CHANNELS.map((channel) => {
                    const key = `${category}:${channel.key}`;
                    return (
                      <Pressable
                        key={channel.key}
                        onPress={() => toggle(category, channel.key)}
                        disabled={savingKey === key}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: valueOf(category, channel.key) }}
                        accessibilityLabel={`${meta.label} by ${channel.label}`}
                        style={styles.row}
                      >
                        <Txt variant="bodyMedium" style={{ flex: 1 }}>
                          {channel.label}
                        </Txt>
                        {savingKey === key ? (
                          <ActivityIndicator size="small" color={t.colors.textSecondary} />
                        ) : (
                          <Switch on={valueOf(category, channel.key)} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}

        <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: spacing.lg }}>
          Sign-in alerts and safety recalls are always sent — those aren't things
          we let you switch off. Everything appears in your notifications list
          regardless of what you choose here.
        </Txt>
      </ScrollView>
    </View>
  );
}

/** Matches the compare screen's switch — RN's own can't be styled on Android. */
function Switch({ on }: { on: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const track = useAnimatedStyle(() => ({
    backgroundColor: withTiming(on ? t.colors.accentText : t.colors.border, { duration: 160 }),
  }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(on ? 18 : 0, { duration: 160 }) }],
  }));
  return (
    <Animated.View style={[styles.track, track]}>
      <Animated.View style={[styles.thumb, { backgroundColor: t.colors.surface }, thumb]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderRadius: radius.md, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rows: { borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  track: { width: 42, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  thumb: { width: 18, height: 18, borderRadius: 9 },
});
