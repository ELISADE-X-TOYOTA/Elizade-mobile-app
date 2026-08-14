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
import { MOCK_USER } from '../../src/data/mock';
import { fullName } from '../../src/domain/types';
import { ThemeMode, useStore } from '../../src/store/useStore';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { solid, tint } from '../../src/theme/colors';

export default function Profile() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const favorites = useStore((s) => s.favorites);
  const user = useStore((s) => s.currentUser) ?? MOCK_USER;
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [photoOpen, setPhotoOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string>();

  const signOut = async () => {
    await logout();
    setCurrentUser(null);
    router.replace('/(auth)/login');
  };

  /** Pick → upload → PATCH /users/me, then reflect the new photo everywhere. */
  const changePhoto = async (source: 'library' | 'camera') => {
    setPhotoOpen(false);
    setAvatarError(undefined);
    setAvatarBusy(true);
    try {
      const res = await pickAndUploadAvatar(user, source);
      if (!res) return; // cancelled
      if (res.ok && res.user) setCurrentUser(res.user);
      else setAvatarError(res.message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const clearPhoto = async () => {
    setPhotoOpen(false);
    setAvatarBusy(true);
    try {
      const res = await removeAvatar(user);
      if (res.ok && res.user) setCurrentUser(res.user);
      else setAvatarError(res.message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const stats: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'Vehicles', value: '1', icon: 'car-sport' },
    { label: 'Saved', value: `${favorites.length}`, icon: 'heart' },
    { label: 'Services', value: '0', icon: 'construct' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <LinearGradient colors={t.gradients.hero} style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.row}>
            <Pressable
              onPress={() => setPhotoOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              style={[styles.avatarRing, { borderColor: solid(t.colors.accent) }]}
            >
              <Avatar user={user} size={68} variant="headlineSmall" />
              <View style={[styles.cameraBadge, { backgroundColor: solid(t.colors.accent), borderColor: t.colors.background }]}>
                {avatarBusy ? (
                  <ActivityIndicator size="small" color={t.colors.onAccent} />
                ) : (
                  <Ionicons name="camera" size={13} color={t.colors.onAccent} />
                )}
              </View>
            </Pressable>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Txt variant="titleLarge">{fullName(user)}</Txt>
              <Txt variant="bodySmall" tone="secondary">
                {user.email}
              </Txt>
              <View style={[styles.verified, { backgroundColor: tint(t.colors.accent, 0.133) }]}>
                <Ionicons name="checkmark-circle" size={14} color={t.colors.accentDark} />
                <Txt variant="labelSmall" color={t.colors.textPrimary} style={{ marginLeft: 4 }}>
                  Verified Member
                </Txt>
              </View>
            </View>
            <Ionicons name="settings-outline" size={22} color={t.colors.textSecondary} />
          </View>
          {avatarError ? (
            <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: spacing.sm }}>
              {avatarError}
            </Txt>
          ) : null}
        </LinearGradient>

        {/* Stats */}
        <View style={[styles.row, { paddingHorizontal: spacing.screenH, marginTop: spacing.md, gap: 8 }]}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.stat, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}>
              <Ionicons name={s.icon} size={22} color={t.colors.primary} />
              <Txt variant="titleLarge" style={{ marginTop: 6 }}>
                {s.value}
              </Txt>
              <Txt variant="bodySmall" tone="secondary">
                {s.label}
              </Txt>
            </View>
          ))}
        </View>

        <Group title="My Garage">
          <Row icon="car-sport-outline" label="My Vehicles" onPress={() => router.push('/garage')} />
          <Row icon="eye-outline" label="Watchlist" onPress={() => router.push('/watchlist')} />
          <Row icon="shield-checkmark-outline" label="Warranty & Recalls" onPress={() => router.push('/warranty')} />
          <Row icon="time-outline" label="Service History" onPress={() => router.push('/(tabs)/service')} last />
        </Group>

        <Group title="Account">
          <Row icon="person-outline" label="Personal Details" />
          <Row icon="card-outline" label="Driving License" />
          <Row icon="wallet-outline" label="Payment Methods" last />
        </Group>

        <Group title="Preferences">
          <ThemeSelector />
          <Divider />
          <Row icon="notifications-outline" label="Notifications" />
          <Divider />
          <Row icon="language-outline" label="Language" trailing="English" />
          <Divider />
          <Row icon="cash-outline" label="Currency" trailing="₦ NGN" last />
        </Group>

        <Group title="Support">
          <Row icon="shield-checkmark-outline" label="Privacy & Security" />
          <Row icon="help-circle-outline" label="Help Center" />
          <Row icon="log-out-outline" label="Logout" danger last onPress={signOut} />
        </Group>
      </ScrollView>

      {/* Choose a photo source */}
      <Modal visible={photoOpen} transparent animationType="slide" onRequestClose={() => setPhotoOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setPhotoOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={[styles.handle, { backgroundColor: t.colors.border }]} />
            <Txt variant="titleLarge" style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>
              Profile photo
            </Txt>
            <View style={{ padding: spacing.lg, gap: 10 }}>
              <PhotoOption icon="images-outline" label="Choose from library" onPress={() => changePhoto('library')} />
              <PhotoOption icon="camera-outline" label="Take a photo" onPress={() => changePhoto('camera')} />
              {user.avatar ? (
                <PhotoOption icon="trash-outline" label="Remove photo" danger onPress={clearPhoto} />
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

/** Light / Dark / System appearance selector. */
function ThemeSelector() {
  const t = useTheme();
  const mode = useStore((s) => s.themeMode);
  const setMode = useStore((s) => s.setThemeMode);
  const options: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'light', label: 'Light', icon: 'sunny-outline' },
    { key: 'dark', label: 'Dark', icon: 'moon-outline' },
    { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];
  return (
    <View style={{ padding: spacing.md, gap: 12 }}>
      <View style={styles.row}>
        <IconBox icon="contrast-outline" />
        <Txt variant="titleSmall" style={{ flex: 1 }}>
          Appearance
        </Txt>
      </View>
      <View style={[styles.themeSeg, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
        {options.map((o) => {
          const active = mode === o.key;
          return (
            <Pressable key={o.key} style={{ flex: 1 }} onPress={() => setMode(o.key)}>
              <View style={[styles.themeSegItem, active && { backgroundColor: solid(t.colors.accent) }]}>
                <Ionicons name={o.icon} size={16} color={active ? t.colors.onAccent : t.colors.textSecondary} />
                <Txt
                  variant="labelMedium"
                  color={active ? t.colors.onAccent : t.colors.textSecondary}
                  style={{ marginLeft: 6 }}
                >
                  {o.label}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
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
  themeSeg: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, borderWidth: 1, gap: 4 },
  themeSegItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: radius.pill,
  },
});
