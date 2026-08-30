import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NotifyMeStatus, Vehicle, vehicleTitle } from '../domain/types';
import { useTheme } from '../theme/useTheme';
import { radius, spacing } from '../theme/spacing';
import { PrimaryButton } from './PrimaryButton';
import { Txt } from './Txt';

interface Props {
  vehicle: Vehicle;
  status?: NotifyMeStatus;
  loading: boolean;
  error?: string;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}

/** Availability alert CTA for vehicles that cannot be reserved today. */
export function NotifyMeCard({ vehicle, status, loading, error, onSubscribe, onUnsubscribe }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const subscribed = status?.subscribed === true;

  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <View style={[styles.icon, { backgroundColor: t.colors.primary + '14' }]}>
        <Ionicons name={subscribed ? 'notifications' : 'notifications-outline'} size={22} color={t.colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Txt variant="titleMedium">{subscribed ? "You're on the list" : 'Notify me when available'}</Txt>
        <Txt variant="bodySmall" tone="secondary" style={{ marginTop: 3 }}>
          {subscribed
            ? `We'll let you know when the ${vehicleTitle(vehicle)} is available.`
            : 'Get an alert when this vehicle becomes available to reserve.'}
        </Txt>
        {error ? (
          <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: 6 }}>
            {error}
          </Txt>
        ) : null}
        {subscribed ? (
          <Pressable onPress={onUnsubscribe} disabled={loading} style={styles.remove} accessibilityRole="button">
            {loading ? <ActivityIndicator size="small" color={t.colors.primary} /> : <Txt variant="labelMedium" color={t.colors.primary}>{tr('shop.turnOffAlerts')}</Txt>}
          </Pressable>
        ) : (
          <PrimaryButton
            label={tr('shop.notifyMe')}
            icon="notifications-outline"
            onPress={onSubscribe}
            loading={loading}
            style={styles.button}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  button: { alignSelf: 'flex-start', marginTop: spacing.md },
  remove: { alignSelf: 'flex-start', marginTop: spacing.md, minHeight: 32, justifyContent: 'center' },
});
