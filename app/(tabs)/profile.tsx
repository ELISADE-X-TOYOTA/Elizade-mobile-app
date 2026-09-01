import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { Txt } from '../../src/components/Txt';
import { logout } from '../../src/data/authRepository';
import { pickAndUploadAvatar, removeAvatar } from '../../src/data/profileRepository';
import { fullName } from '../../src/domain/types';
import { useSignedInUser } from '../../src/hooks/useSignedInUser';
import { useStore } from '../../src/store/useStore';
import { useWatchlistStore } from '../../src/store/useWatchlistStore';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { useTranslation } from 'react-i18next';
import i18n, { findLanguage } from '../../src/i18n';
import { solid, tint } from '../../src/theme/colors';

export default function Profile() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const savedCount = useWatchlistStore((s) => s.items.length);
  const clearWatchlist = useWatchlistStore((s) => s.clear);
  const user = useSignedInUser();
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [photoOpen, setPhotoOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string>();

  const signOut = async () => {
    await logout();
    clearWatchlist();
    setCurrentUser(null);
    router.replace('/(auth)/login');
  };

  /** Pick → upload → PATCH /users/me, then reflect the new photo everywhere. */
  const changePhoto = async (source: 'library' | 'camera') => {
    if (!user) return;
    setPhotoOpen(false);
    setAvatarError(undefined);
    setAvatarBusy(true);
    try {
      const res = await pickAndUploadAvatar(user, source);
      if (!res) return; // cancelled
      if (res.ok && res.user) setCurrentUser(res.user);
      else setAvatarError(res.message);
    } catch (e) {
      // The upload itself returns a result object, but the permission prompt
      // and the picker launch can still reject — an unavailable camera, or a
      // picker already open. Without this those escaped unhandled.
      setAvatarError(e instanceof Error ? e.message : 'Could not update your photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const clearPhoto = async () => {
    if (!user) return;
    setPhotoOpen(false);
    setAvatarBusy(true);
    try {
      const res = await removeAvatar(user);
      if (res.ok && res.user) setCurrentUser(res.user);
      else setAvatarError(res.message);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : 'Could not remove your photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const stats: { id: string; label: string; value: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'vehicles', label: t('profile.statVehicles'), value: '1', icon: 'car-sport' },
    { id: 'saved', label: t('profile.statSaved'), value: `${savedCount}`, icon: 'heart' },
    { id: 'services', label: t('profile.statServices'), value: '0', icon: 'construct' },
  ];

  // No signed-in customer: `useSignedInUser` is redirecting to login, so
  // render nothing rather than a screen shaped like someone's account.
  if (!user) return null;
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <LinearGradient colors={theme.gradients.hero} style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.row}>
            <Pressable
              onPress={() => setPhotoOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('profile.changePhoto')}
              style={[styles.avatarRing, { borderColor: solid(theme.colors.accent) }]}
            >
              <Avatar user={user} size={68} variant="headlineSmall" />
              <View style={[styles.cameraBadge, { backgroundColor: solid(theme.colors.accent), borderColor: theme.colors.background }]}>
                {avatarBusy ? (
                  <ActivityIndicator size="small" color={theme.colors.onAccent} />
                ) : (
                  <Ionicons name="camera" size={13} color={theme.colors.onAccent} />
                )}
              </View>
            </Pressable>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Txt variant="titleLarge">{fullName(user)}</Txt>
              <Txt variant="bodySmall" tone="secondary">
                {user.email}
              </Txt>
              <View style={[styles.verified, { backgroundColor: tint(theme.colors.accent, 0.133) }]}>
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.accentDark} />
                <Txt variant="labelSmall" color={theme.colors.textPrimary} style={{ marginLeft: 4 }}>
                  {t('profile.verifiedMember')}
                </Txt>
              </View>
            </View>
            <Ionicons name="settings-outline" size={22} color={theme.colors.textSecondary} />
          </View>
          {avatarError ? (
            <Txt variant="bodySmall" color={theme.colors.errorText} style={{ marginTop: spacing.sm }}>
              {avatarError}
            </Txt>
          ) : null}
        </LinearGradient>

        {/* Stats */}
        <View style={[styles.row, { paddingHorizontal: spacing.screenH, marginTop: spacing.md, gap: 8 }]}>
          {stats.map((s) => {
            const onPress = s.id === 'saved' ? () => router.push('/watchlist') : undefined;
            const Wrapper = onPress ? Pressable : View;
            return (
              <Wrapper
                key={s.id}
                onPress={onPress}
                style={[styles.stat, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, theme.shadows.soft]}
              >
                <Ionicons name={s.icon} size={22} color={theme.colors.primary} />
                <Txt variant="titleLarge" style={{ marginTop: 6 }}>
                  {s.value}
                </Txt>
                <Txt variant="bodySmall" tone="secondary">
                  {s.label}
                </Txt>
              </Wrapper>
            );
          })}
        </View>

        <Group title={t('profile.groupGarage')}>
          <Row icon="car-sport-outline" label={t('profile.myVehicles')} onPress={() => router.push('/garage')} />
          <Row icon="heart-outline" label={t('profile.watchlist')} onPress={() => router.push('/watchlist')} />
          <Row icon="trending-up-outline" label={t('profile.myLeads')} onPress={() => router.push('/leads')} />
          <Row icon="shield-checkmark-outline" label={t('profile.warrantyRecalls')} onPress={() => router.push('/warranty')} />
          <Row icon="time-outline" label={t('profile.serviceHistory')} onPress={() => router.push('/(tabs)/service')} last />
        </Group>

        <Group title={t('profile.groupAccount')}>
          <Row icon="person-outline" label={t('profile.personalDetails')} last />
        </Group>

        <Group title={t('profile.groupPreferences')}>
          <Row icon="notifications-outline" label={t('profile.notifications')} onPress={() => router.push('/notification-settings')} />
          <Row
            icon="language-outline"
            label={t('profile.language')}
            trailing={findLanguage(i18n.language).endonym}
            onPress={() => router.push('/language')}
            last
          />
        </Group>

        <Group title={t('profile.groupSupport')}>
          <Row
            icon="lock-closed-outline"
            label={t('appLock.settingsTitle')}
            onPress={() => router.push('/security')}
          />
          <Row icon="shield-checkmark-outline" label={t('profile.privacySecurity')} />
          <Row icon="help-circle-outline" label={t('profile.helpCenter')} />
          <Row icon="log-out-outline" label={t('auth.signOut')} danger last onPress={signOut} />
        </Group>
      </ScrollView>

      {/* Choose a photo source */}
      <Modal visible={photoOpen} transparent animationType="slide" onRequestClose={() => setPhotoOpen(false)} statusBarTranslucent>
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setPhotoOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
            <Txt variant="titleLarge" style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>
              {t('profile.profilePhoto')}
            </Txt>
            <View style={{ padding: spacing.lg, gap: 10 }}>
              <PhotoOption icon="images-outline" label={t('profile.chooseFromLibrary')} onPress={() => changePhoto('library')} />
              <PhotoOption icon="camera-outline" label={t('profile.takePhoto')} onPress={() => changePhoto('camera')} />
              {user.avatar ? (
                <PhotoOption icon="trash-outline" label={t('profile.removePhoto')} danger onPress={clearPhoto} />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PhotoOption({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const color = danger ? t.colors.errorText : t.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.photoOption, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
    >
      <View style={[styles.photoIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Txt variant="titleSmall" color={danger ? t.colors.errorText : undefined} style={{ flex: 1 }}>
        {label}
      </Txt>
      <Ionicons name="chevron-forward" size={18} color={t.colors.textSecondary} />
    </Pressable>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View>
      <Txt variant="labelMedium" tone="secondary" style={{ paddingHorizontal: spacing.screenH, marginTop: spacing.md, marginBottom: spacing.xs }}>
        {title}
      </Txt>
      <View style={[styles.group, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  trailing,
  danger,
  last,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  trailing?: string;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  const color = danger ? t.colors.errorText : t.colors.primary;
  return (
    <>
      <Pressable onPress={onPress} style={styles.rowItem}>
        <IconBox icon={icon} color={color} />
        <Txt variant="titleSmall" color={danger ? t.colors.errorText : t.colors.textPrimary} style={{ flex: 1 }}>
          {label}
        </Txt>
        {trailing && (
          <Txt variant="bodySmall" tone="secondary" style={{ marginRight: 4 }}>
            {trailing}
          </Txt>
        )}
        <Ionicons name="chevron-forward" size={18} color={t.colors.textSecondary} />
      </Pressable>
      {!last && <Divider />}
    </>
  );
}

function IconBox({ icon, color }: { icon: keyof typeof Ionicons.glyphMap; color?: string }) {
  const t = useTheme();
  const c = color ?? t.colors.primary;
  return (
    <View style={[styles.iconBox, { backgroundColor: c + '1A' }]}>
      <Ionicons name={icon} size={20} color={c} />
    </View>
  );
}

function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, marginLeft: 58, backgroundColor: t.colors.border }} />;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenH, paddingBottom: spacing.xl, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  photoOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  photoIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarRing: { padding: 3, borderRadius: 40, borderWidth: 2 },
  verified: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1 },
  group: { marginHorizontal: spacing.screenH, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  rowItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: 0 },
  iconBox: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});
