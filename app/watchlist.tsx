import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Skeleton } from '../src/components/Skeleton';
import { Txt } from '../src/components/Txt';
import { WatchlistItem } from '../src/domain/types';
import { useWatchlistStore } from '../src/store/useWatchlistStore';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { ON_DARK_INK, solid, tint } from '../src/theme/colors';

/**
 * Saved models watchlist — backed by GET/PATCH/DELETE /watchlist.
 */
export default function WatchlistScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const items = useWatchlistStore((s) => s.items);
  const loading = useWatchlistStore((s) => s.loading);
  const error = useWatchlistStore((s) => s.error);
  const load = useWatchlistStore((s) => s.load);
  const remove = useWatchlistStore((s) => s.remove);
  const update = useWatchlistStore((s) => s.update);

  const [editing, setEditing] = useState<WatchlistItem | null>(null);
  const [removing, setRemoving] = useState<WatchlistItem | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  // Separate from `actionError`, which renders at the top of the list — sharing
  // it would show the same message twice when a removal fails.
  const [removeError, setRemoveError] = useState<string>();
  const [trim, setTrim] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openEdit = (item: WatchlistItem) => {
    setEditing(item);
    setTrim(item.trim ?? '');
    setColor(item.color ?? '');
    setActionError(undefined);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setActionError(undefined);
    try {
      await update(editing.id, { trim: trim.trim() || null, color: color.trim() || null });
      setEditing(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update this item.');
    } finally {
      setSaving(false);
    }
  };

  /*
    A themed sheet rather than `Alert.alert`.

    Native alerts follow the OS appearance, not the in-app theme — so a
    customer running Dark in the app with a Light phone got a white dialog on
    top of a black screen. This also lets the destructive action carry the
    error state inline instead of firing a second alert on failure.
  */
  const confirmRemove = (item: WatchlistItem) => {
    setRemoveError(undefined);
    setRemoving(item);
  };

  const doRemove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    setRemoveError(undefined);
    try {
      await remove(removing.id);
      setRemoving(null);
    } catch (e) {
      // Keep the sheet open so the message has somewhere to land.
      setRemoveError(e instanceof Error ? e.message : 'Could not remove this item.');
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>{tr('profile.watchlist')}</Txt>
        <Txt tone="secondary" style={{ marginTop: 4 }}>{tr('watchlist.subtitle')}</Txt>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.colors.primary}
              colors={[t.colors.primary]}
              progressBackgroundColor={t.colors.surface} />}
      >
        {error || actionError ? (
          <Txt color={t.colors.errorText} style={{ marginBottom: spacing.md }}>
            {actionError ?? error}
          </Txt>
        ) : null}

        {loading && items.length === 0 ? (
          <>
            <Skeleton height={88} radius={radius.lg} />
            <View style={{ height: 12 }} />
            <Skeleton height={88} radius={radius.lg} />
          </>
        ) : items.length === 0 ? (
          <EmptyState onBrowse={() => router.push('/(tabs)/shop')} />
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconWrap, { backgroundColor: t.colors.primary + '14' }]}>
                  <Ionicons name="heart" size={20} color={solid(t.colors.error)} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Txt variant="titleMedium" numberOfLines={1}>
                    {item.model}
                  </Txt>
                  <Txt variant="bodySmall" tone="secondary" numberOfLines={1}>
                    {[item.trim, item.color].filter(Boolean).join(' · ') || 'No trim or colour set'}
                  </Txt>
                </View>
              </View>
              <View style={[styles.actions, { borderTopColor: t.colors.border }]}>
                <Pressable onPress={() => openEdit(item)} style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={18} color={t.colors.primary} />
                  <Txt variant="titleSmall" color={t.colors.primary} style={{ marginLeft: 6 }}>{tr('common.edit')}</Txt>
                </Pressable>
                <Pressable onPress={() => confirmRemove(item)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color={t.colors.errorText} />
                  <Txt variant="titleSmall" color={t.colors.errorText} style={{ marginLeft: 6 }}>{tr('common.remove')}</Txt>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)} statusBarTranslucent>
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setEditing(null)} />
          <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={[styles.handle, { backgroundColor: t.colors.border }]} />
            <Txt variant="titleLarge" style={{ paddingHorizontal: spacing.lg }}>{tr('watchlist.editPreferences')}</Txt>
            <Txt tone="secondary" style={{ paddingHorizontal: spacing.lg, marginTop: 4 }}>
              {editing?.model}
            </Txt>
            <View style={{ padding: spacing.lg, gap: 12 }}>
              <Field label={tr('watchlist.trim')} value={trim} onChangeText={setTrim} placeholder={tr('watchlist.trimPlaceholder')} />
              <Field label={tr('shop.colour')} value={color} onChangeText={setColor} placeholder={tr('watchlist.colourPlaceholder')} />
              {actionError ? (
                <Txt variant="bodySmall" color={t.colors.errorText}>
                  {actionError}
                </Txt>
              ) : null}
              <PrimaryButton label={tr('common.save')} loading={saving} onPress={saveEdit} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Destructive confirm — themed, so it matches the app rather than the OS. */}
      <Modal
        visible={!!removing}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !removeBusy && setRemoving(null)}
      >
        <View style={styles.alertBackdrop}>
          {/* Tapping outside cancels — but not mid-request, or the sheet would
              vanish while the delete is still in flight. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !removeBusy && setRemoving(null)}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <View
            style={[
              styles.alertCard,
              { backgroundColor: t.colors.surface, borderColor: t.colors.border },
            ]}
          >
            <View style={[styles.alertIcon, { backgroundColor: tint(t.colors.error, 0.12) }]}>
              <Ionicons name="trash-outline" size={22} color={t.colors.errorText} />
            </View>

            <Txt variant="titleLarge" center style={{ marginTop: spacing.md }}>{tr('watchlist.removeConfirm')}</Txt>
            <Txt tone="secondary" center style={{ marginTop: 6 }}>
              {removing?.model} will no longer be tracked. You can add it again at any time.
            </Txt>

            {removeError ? (
              <Txt variant="bodySmall" color={t.colors.errorText} center style={{ marginTop: spacing.sm }}>
                {removeError}
              </Txt>
            ) : null}

            <View style={styles.alertActions}>
              <Pressable
                onPress={() => setRemoving(null)}
                disabled={removeBusy}
                accessibilityRole="button"
                style={[
                  styles.alertBtn,
                  { borderColor: t.colors.border, opacity: removeBusy ? 0.5 : 1 },
                ]}
              >
                <Txt variant="titleSmall">{tr('common.cancel')}</Txt>
              </Pressable>

              <Pressable
                onPress={doRemove}
                disabled={removeBusy}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${removing?.model ?? ''} from watchlist`}
                style={[
                  styles.alertBtn,
                  { backgroundColor: solid(t.colors.error), borderColor: solid(t.colors.error) },
                ]}
              >
                {removeBusy ? (
                  <ActivityIndicator size="small" color={ON_DARK_INK} />
                ) : (
                  <Txt variant="titleSmall" color={ON_DARK_INK}>{tr('common.remove')}</Txt>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View>
      <Txt variant="titleSmall" style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <TextInput
          // iOS renders a LIGHT keyboard in dark mode without this.
          keyboardAppearance={t.isDark ? 'dark' : 'light'}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textTertiary}
        style={[
          t.type.bodyLarge,
          {
            color: t.colors.textPrimary,
            backgroundColor: t.colors.surfaceAlt,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: t.colors.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
          },
        ]}
      />
    </View>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: spacing.md }}>
      <View style={[styles.emptyIcon, { backgroundColor: t.colors.surfaceAlt }]}>
        <Ionicons name="heart-outline" size={36} color={t.colors.textTertiary} />
      </View>
      <Txt variant="titleLarge" center style={{ marginTop: spacing.md }}>{tr('watchlist.empty')}</Txt>
      <Txt tone="secondary" center style={{ marginTop: spacing.sm }}>{tr('watchlist.emptyHint')}</Txt>
      <Pressable onPress={onBrowse} style={[styles.browseBtn, { backgroundColor: t.colors.primary, marginTop: spacing.xl }]}>
        <Txt variant="titleSmall" color={t.colors.onPrimary}>{tr('common.browseShowroom')}</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  browseBtn: { paddingHorizontal: 20, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  alertCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  alertIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  alertActions: { flexDirection: 'row', gap: 10, marginTop: spacing.lg, alignSelf: 'stretch' },
  alertBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
});
