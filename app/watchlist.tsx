import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextField } from '../src/components/AppTextField';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Txt } from '../src/components/Txt';
import {
  AlreadyWatchedError,
  addToWatchlist,
  removeFromWatchlist,
  updateWatchlistItem,
} from '../src/data/watchlistRepository';
import { WatchlistItem } from '../src/domain/types';
import { useWatchlist } from '../src/hooks/useWatchlist';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';
import { clean } from '../src/utils/sanitize';
import { tint } from '../src/theme/colors';

/**
 * Models the customer is tracking.
 *
 * This is a MODEL watchlist, not saved listings — one entry per model, refined
 * by trim and colour. The favourites heart on a car card is a different thing
 * and deliberately stays separate.
 *
 * Deep link: `/watchlist?model=Land%20Cruiser&trim=300%20VX&color=Black`
 * opens straight into the add sheet, prefilled — that is how "Track this model"
 * on a vehicle page hands off.
 */
export default function Watchlist() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading, error, reload, patch, drop, prepend } = useWatchlist();
  const params = useLocalSearchParams<{ model?: string; trim?: string; color?: string }>();

  const [sheet, setSheet] = useState<{ mode: 'add' | 'edit'; item?: WatchlistItem } | null>(null);
  const [busyId, setBusyId] = useState<string>();

  // Arriving with a `model` param means "track this" was tapped elsewhere.
  useEffect(() => {
    if (params.model) setSheet({ mode: 'add' });
  }, [params.model]);

  const remove = async (item: WatchlistItem) => {
    setBusyId(item.id);
    try {
      await removeFromWatchlist(item.id);
      drop(item.id);
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.screenH }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backBtn, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
        </Pressable>
        <Txt variant="headlineMedium" style={{ marginTop: spacing.md }}>
          Watchlist
        </Txt>
        <Txt tone="secondary">
          Models you're tracking. We'll let you know when stock or pricing changes.
        </Txt>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screenH, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={t.colors.primary} />
        }
      >
        {error ? (
          <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
            <Ionicons name="cloud-offline-outline" size={40} color={t.colors.textTertiary} />
            <Txt tone="secondary" center style={{ marginTop: spacing.md }}>
              {error}
            </Txt>
            <Pressable onPress={reload} style={{ marginTop: spacing.md }}>
              <Txt variant="titleSmall" color={t.colors.primary}>
                Tap to retry
              </Txt>
            </Pressable>
          </View>
        ) : loading && !items.length ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{ height: 84, borderRadius: radius.md, backgroundColor: t.colors.surfaceAlt }}
              />
            ))}
          </View>
        ) : items.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
            <Ionicons name="eye-outline" size={44} color={t.colors.textTertiary} />
            <Txt variant="titleMedium" center style={{ marginTop: spacing.md }}>
              Nothing tracked yet
            </Txt>
            <Txt tone="secondary" center style={{ marginTop: 4 }}>
              Add a model and we'll keep you posted on new arrivals and price changes.
            </Txt>
          </View>
        ) : (
          items.map((item) => (
            <Animated.View
              key={item.id}
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(140)}
              layout={LinearTransition.duration(180)}
              style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
            >
              <View style={[styles.icon, { backgroundColor: tint(t.colors.accent, 0.12) }]}>
                <Ionicons name="car-sport-outline" size={20} color={t.colors.accentText} />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Txt variant="titleMedium" numberOfLines={1}>
                  {item.model}
                </Txt>
                <Txt variant="bodySmall" tone="secondary" numberOfLines={1}>
                  {[item.trim, item.color].filter(Boolean).join(' · ') || 'Any trim · any colour'}
                </Txt>
              </View>

              <Pressable
                onPress={() => setSheet({ mode: 'edit', item })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.model}`}
                style={{ padding: 6 }}
              >
                <Ionicons name="create-outline" size={19} color={t.colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => remove(item)}
                disabled={busyId === item.id}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Stop tracking ${item.model}`}
                style={{ padding: 6 }}
              >
                {busyId === item.id ? (
                  <ActivityIndicator size="small" color={t.colors.textSecondary} />
                ) : (
                  <Ionicons name="trash-outline" size={19} color={t.colors.errorText} />
                )}
              </Pressable>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <PrimaryButton
          label="Track a model"
          icon="add"
          onPress={() => setSheet({ mode: 'add' })}
        />
      </View>

      {sheet && (
        <EditSheet
          mode={sheet.mode}
          item={sheet.item}
          initial={
            sheet.mode === 'add'
              ? { model: params.model ?? '', trim: params.trim ?? '', color: params.color ?? '' }
              : undefined
          }
          onClose={() => setSheet(null)}
          onSaved={(item, mode) => {
            mode === 'add' ? prepend(item) : patch(item);
            setSheet(null);
          }}
        />
      )}
    </View>
  );
}

function EditSheet({
  mode,
  item,
  initial,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit';
  item?: WatchlistItem;
  initial?: { model: string; trim: string; color: string };
  onClose: () => void;
  onSaved: (item: WatchlistItem, mode: 'add' | 'edit') => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [model, setModel] = useState(item?.model ?? initial?.model ?? '');
  const [trim, setTrim] = useState(item?.trim ?? initial?.trim ?? '');
  const [color, setColor] = useState(item?.color ?? initial?.color ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const valid = model.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(undefined);
    try {
      const saved =
        mode === 'add'
          ? await addToWatchlist({
              model: clean(model, 100),
              trim: clean(trim, 100) || null,
              color: clean(color, 100) || null,
            })
          : await updateWatchlistItem(item!.id, {
              trim: clean(trim, 100) || null,
              color: clean(color, 100) || null,
            });
      onSaved(saved, mode);
    } catch (e) {
      // A 409 means this model is already tracked — say that, rather than
      // showing a conflict code the customer can do nothing with.
      setError(
        e instanceof AlreadyWatchedError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not save that.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: t.colors.border }]} />
          <Txt variant="headlineSmall" style={{ marginBottom: 4 }}>
            {mode === 'add' ? 'Track a model' : `Edit ${item?.model}`}
          </Txt>
          <Txt tone="secondary" style={{ marginBottom: spacing.lg }}>
            {mode === 'add'
              ? "Tell us what you're after and we'll watch for it."
              : 'Refine the trim and colour you want.'}
          </Txt>

          <View style={{ gap: spacing.lg }}>
            {/* Model is immutable after creation — the API keys uniqueness on
                it, and PATCH accepts only trim/color/isActive. */}
            {mode === 'add' ? (
              <AppTextField
                label="Model"
                placeholder="e.g. Land Cruiser"
                icon="car-outline"
                value={model}
                onChangeText={setModel}
                maxLength={100}
                autoCapitalize="words"
              />
            ) : null}
            <AppTextField
              label="Trim (optional)"
              placeholder="e.g. 300 VX"
              icon="options-outline"
              value={trim}
              onChangeText={setTrim}
              maxLength={100}
              autoCapitalize="words"
            />
            <AppTextField
              label="Colour (optional)"
              placeholder="e.g. Attitude Black"
              icon="color-palette-outline"
              value={color}
              onChangeText={setColor}
              maxLength={100}
              autoCapitalize="words"
            />
          </View>

          {error ? (
            <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginTop: spacing.md }}>
              {error}
            </Txt>
          ) : null}

          <View style={{ height: spacing.xl }} />
          <PrimaryButton
            label={mode === 'add' ? 'Start tracking' : 'Save changes'}
            loading={saving}
            disabled={!valid}
            onPress={save}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  icon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: spacing.screenH, right: spacing.screenH, bottom: 0 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: spacing.screenH,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
});
