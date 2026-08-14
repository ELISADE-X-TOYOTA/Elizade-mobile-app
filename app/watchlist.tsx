import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
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

/**
 * Saved models watchlist — backed by GET/PATCH/DELETE /watchlist.
 */
export default function WatchlistScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const items = useWatchlistStore((s) => s.items);
  const loading = useWatchlistStore((s) => s.loading);
  const error = useWatchlistStore((s) => s.error);
  const load = useWatchlistStore((s) => s.load);
  const remove = useWatchlistStore((s) => s.remove);
  const update = useWatchlistStore((s) => s.update);

  const [editing, setEditing] = useState<WatchlistItem | null>(null);
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

  const confirmRemove = (item: WatchlistItem) => {
    Alert.alert('Remove from watchlist?', `${item.model} will no longer be tracked.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          remove(item.id).catch((e) =>
            setActionError(e instanceof Error ? e.message : 'Could not remove this item.'),
          );
        },
      },
    ]);
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
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          Watchlist
        </Txt>
        <Txt tone="secondary" style={{ marginTop: 4 }}>
          Models you are tracking
        </Txt>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.colors.primary} />}
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
                  <Ionicons name="heart" size={20} color={t.colors.error} />
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
                  <Txt variant="titleSmall" color={t.colors.primary} style={{ marginLeft: 6 }}>
                    Edit
                  </Txt>
                </Pressable>
                <Pressable onPress={() => confirmRemove(item)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color={t.colors.error} />
                  <Txt variant="titleSmall" color={t.colors.error} style={{ marginLeft: 6 }}>
                    Remove
                  </Txt>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setEditing(null)} />
          <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={[styles.handle, { backgroundColor: t.colors.border }]} />
            <Txt variant="titleLarge" style={{ paddingHorizontal: spacing.lg }}>
              Edit preferences
            </Txt>
            <Txt tone="secondary" style={{ paddingHorizontal: spacing.lg, marginTop: 4 }}>
              {editing?.model}
            </Txt>
            <View style={{ padding: spacing.lg, gap: 12 }}>
              <Field label="Trim" value={trim} onChangeText={setTrim} placeholder="e.g. XLE" />
              <Field label="Colour" value={color} onChangeText={setColor} placeholder="e.g. Pearl White" />
              {actionError ? (
                <Txt variant="bodySmall" color={t.colors.errorText}>
                  {actionError}
                </Txt>
              ) : null}
              <PrimaryButton label="Save" loading={saving} onPress={saveEdit} />
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
  return (
    <View>
      <Txt variant="titleSmall" style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <TextInput
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
  return (
    <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: spacing.md }}>
      <View style={[styles.emptyIcon, { backgroundColor: t.colors.surfaceAlt }]}>
        <Ionicons name="heart-outline" size={36} color={t.colors.textTertiary} />
      </View>
      <Txt variant="titleLarge" center style={{ marginTop: spacing.md }}>
        No saved models yet
      </Txt>
      <Txt tone="secondary" center style={{ marginTop: spacing.sm }}>
        Tap the heart on any vehicle to track that model.
      </Txt>
      <Pressable onPress={onBrowse} style={[styles.browseBtn, { backgroundColor: t.colors.primary, marginTop: spacing.xl }]}>
        <Txt variant="titleSmall" color={t.colors.onPrimary}>
          Browse showroom
        </Txt>
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
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
});
