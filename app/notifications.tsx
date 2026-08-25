import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../src/components/Skeleton';
import { Txt } from '../src/components/Txt';
import { AppNotification, NOTIFICATION_META, Tone } from '../src/domain/types';
import { useNotifications } from '../src/hooks/useNotifications';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { solid } from '../src/theme/colors';

export default function Notifications() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { items, unread, loading, markRead, markAllRead } = useNotifications();

  const open = (n: AppNotification) => {
    markRead(n.id);
    if (n.route) router.push(n.route as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineSmall" style={{ flex: 1, marginLeft: 12 }}>{tr('notifications.title')}</Txt>
        {unread > 0 && (
          <Pressable onPress={markAllRead}>
            <Txt variant="titleSmall" color={t.colors.primary}>{tr('notifications.markAllRead')}</Txt>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.screenH, paddingTop: spacing.sm, paddingBottom: 40, gap: 10 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} height={80} radius={radius.lg} />)
        ) : items.length ? (
          items.map((n) => <NotificationRow key={n.id} notification={n} onPress={() => open(n)} />)
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="notifications-off-outline" size={44} color={t.colors.textTertiary} />
            <Txt tone="secondary" style={{ marginTop: 12 }}>
              {tr('notifications.empty')}
            </Txt>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function tone(t: ReturnType<typeof useTheme>, tn: Tone) {
  // *Text variants — rendered as type on a tinted chip.
  return tn === 'success' ? t.colors.successText : tn === 'warning' ? t.colors.warningText : tn === 'error' ? t.colors.errorText : tn === 'info' ? t.colors.infoText : t.colors.textSecondary;
}

function NotificationRow({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const meta = NOTIFICATION_META[notification.type];
  const c = tone(t, meta.tone);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { backgroundColor: notification.read ? t.colors.surface : t.colors.primary + '08', borderColor: t.colors.border }]}
    >
      <View style={[styles.icon, { backgroundColor: c + '1F' }]}>
        <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={20} color={c} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Txt variant="titleSmall" style={{ flex: 1 }} numberOfLines={1}>
            {notification.title}
          </Txt>
          {!notification.read && <View style={[styles.unreadDot, { backgroundColor: solid(t.colors.accent) }]} />}
        </View>
        <Txt variant="bodySmall" tone="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
          {notification.body}
        </Txt>
        <Txt variant="labelSmall" tone="tertiary" style={{ marginTop: 4 }}>
          {timeAgo(notification.createdAt)}
        </Txt>
      </View>
    </Pressable>
  );
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm },
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', padding: 14, borderRadius: radius.lg, borderWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { width: 9, height: 9, borderRadius: 5, marginLeft: 8 },
});
