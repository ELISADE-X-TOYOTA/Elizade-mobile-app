import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextField } from '../src/components/AppTextField';
import { KeyboardAwareScrollView } from '../src/components/KeyboardAware';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Txt } from '../src/components/Txt';
import { profileApi } from '../src/api/profile';
import { useStore } from '../src/store/useStore';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { clean, cleanEmail, cleanName, isValidEmail } from '../src/utils/sanitize';

/**
 * Editing your own details.
 *
 * THIS SCREEN DID NOT EXIST. The Profile tab listed "Personal details" as a
 * row with no `onPress` and no destination, so tapping it did nothing at all —
 * which QA reported as "personal detail updates fail to save". Nothing failed
 * to save; there was nowhere to type them.
 *
 * `PATCH /users/me` has been there the whole time, and the backend already
 * treats an email change as a security event: it notifies the account AND
 * warns the address being replaced. Only the screen was missing.
 */
export default function EditProfile() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const currentUser = useStore((s) => s.currentUser);
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [firstName, setFirstName] = useState(currentUser?.firstName ?? '');
  const [lastName, setLastName] = useState(currentUser?.lastName ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [city, setCity] = useState(currentUser?.city ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const emailChanged = email.trim().toLowerCase() !== (currentUser?.email ?? '').toLowerCase();

  const save = async () => {
    if (!firstName.trim()) return setError(tr('profile.firstNameRequired'));
    if (!lastName.trim()) return setError(tr('profile.lastNameRequired'));
    if (!isValidEmail(email)) return setError(tr('profile.emailInvalid'));

    setSaving(true);
    setError(undefined);
    try {
      // Only what changed. Sending every field back would make an unchanged
      // email look like an email change to the backend, which fires a security
      // alert to the customer and a warning to their previous address — for
      // someone who only corrected a typo in their city.
      const body: Record<string, string> = {};
      if (firstName.trim() !== currentUser?.firstName) body.firstName = cleanName(firstName);
      if (lastName.trim() !== currentUser?.lastName) body.lastName = cleanName(lastName);
      if (emailChanged) body.email = email.trim();
      if (city.trim() !== (currentUser?.city ?? '')) body.city = clean(city, 100);

      if (Object.keys(body).length === 0) {
        router.back();
        return;
      }

      const updated = await profileApi.update(body);
      setCurrentUser(updated);
      setSaved(true);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={tr('common.back')}
          style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          {tr('profile.personalDetails')}
        </Txt>
        <Txt tone="secondary">{tr('profile.personalDetailsSubtitle')}</Txt>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 60 }}
      >
        <View style={{ gap: spacing.lg }}>
          <AppTextField
            label={tr('auth.firstName')}
            icon="person-outline"
            value={firstName}
            onChangeText={setFirstName}
            sanitize={cleanName}
            maxLength={100}
            autoCapitalize="words"
          />
          <AppTextField
            label={tr('auth.lastName')}
            icon="person-outline"
            value={lastName}
            onChangeText={setLastName}
            sanitize={cleanName}
            maxLength={100}
            autoCapitalize="words"
          />
          <AppTextField
            label={tr('auth.email')}
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={255}
          />
          <AppTextField
            label={tr('profile.city')}
            icon="location-outline"
            value={city}
            onChangeText={setCity}
            maxLength={100}
            autoCapitalize="words"
          />
        </View>

        {/*
          Said BEFORE the change, not after. Your email address is your sign-in
          credential here, so moving it is not the same kind of edit as
          correcting a city — the customer should know that before they save,
          not discover it from the alert that lands afterwards.
        */}
        {emailChanged ? (
          <View style={[styles.notice, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
            <Ionicons name="information-circle" size={20} color={t.colors.primary} />
            <Txt variant="bodySmall" tone="secondary" style={{ flex: 1, marginLeft: 10 }}>
              {tr('profile.emailChangeNotice')}
            </Txt>
          </View>
        ) : null}

        {error ? (
          <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: spacing.md }}>
            {error}
          </Txt>
        ) : null}

        <View style={{ height: spacing.xl }} />
        <PrimaryButton
          label={saved ? tr('common.done') : tr('common.save')}
          icon="checkmark"
          loading={saving}
          onPress={save}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
});
