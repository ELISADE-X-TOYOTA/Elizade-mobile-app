import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { FlatList, ListRenderItemInfo, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CarCard } from '../../src/components/CarCard';
import { NetworkCarImage } from '../../src/components/NetworkCarImage';
import { CarCardSkeleton } from '../../src/components/Skeleton';
import { SectionHeader } from '../../src/components/SectionHeader';
import { Txt } from '../../src/components/Txt';
import { MOCK_USER } from '../../src/data/mock';
import { CATEGORY_META, Vehicle, VehicleCategory, initials, vehicleTitle } from '../../src/domain/types';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useVehicles } from '../../src/hooks/useVehicles';
import { useStore } from '../../src/store/useStore';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { greeting, priceCompact } from '../../src/utils/format';

const CATEGORIES = Object.keys(CATEGORY_META) as VehicleCategory[];

/** Carousel card width + gap — used by getItemLayout to avoid measuring. */
const CAROUSEL_W = 280;
const CAROUSEL_STRIDE = CAROUSEL_W + 14;

const keyExtractor = (v: Vehicle) => v.id;
const getCarouselLayout = (_: unknown, index: number) => ({
  length: CAROUSEL_STRIDE,
  offset: CAROUSEL_STRIDE * index,
  index,
});

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const category = useStore((s) => s.categoryFilter);
  const setCategory = useStore((s) => s.setCategoryFilter);
  const user = useStore((s) => s.currentUser) ?? MOCK_USER;
  const { vehicles, loading, error, reload } = useVehicles();
  const { unread, reload: reloadNotifs } = useNotifications();
  useFocusEffect(useCallback(() => { reloadNotifs(); }, [reloadNotifs]));

  const list = useMemo(
    () => (category ? vehicles.filter((v) => v.category === category) : vehicles),
    [vehicles, category],
  );

  // PERF: stable identities so memoised CarCards aren't invalidated each render.
  const renderPopular = useCallback(
    ({ item, index }: ListRenderItemInfo<Vehicle>) => (
      <Animated.View entering={FadeInRight.delay(Math.min(index, 4) * 60)}>
        <CarCard vehicle={item} wide width={CAROUSEL_W} onPress={() => router.push(`/car/${item.id}`)} />
      </Animated.View>
    ),
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceAlt }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={t.colors.primary} />}
      >
        {/* Header */}
        <LinearGradient colors={t.gradients.hero} style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: t.colors.surfaceAlt }]}>
              <Txt variant="titleMedium">{initials(user)}</Txt>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Txt variant="bodySmall" tone="secondary">
                {greeting()} 👋
              </Txt>
              <Txt variant="titleLarge">{user.firstName}</Txt>
            </View>
            <Pressable onPress={() => router.push('/notifications')} style={[styles.iconBtn, { backgroundColor: t.colors.surfaceAlt }]}>
              <Ionicons name="notifications-outline" size={22} color={t.colors.textPrimary} />
              {unread > 0 && <View style={styles.badgeDot} />}
            </Pressable>
          </View>

          {/* Search */}
          <View
            style={[
              styles.search,
              { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
              t.shadows.soft,
            ]}
          >
            <Ionicons name="search" size={20} color={t.colors.textSecondary} style={{ marginHorizontal: 8 }} />
            <Txt tone="secondary" style={{ flex: 1 }}>
              What car are you looking for?
            </Txt>
            <LinearGradient colors={t.gradients.accent} style={styles.searchBtn}>
              <Ionicons name="options" size={20} color={t.colors.primaryDark} />
            </LinearGradient>
          </View>
        </LinearGradient>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.screenH, gap: 10, paddingVertical: spacing.lg }}
        >
          <Chip label="All" icon="grid" active={category === null} onPress={() => setCategory(null)} />
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={CATEGORY_META[c].label}
              mci={CATEGORY_META[c].icon}
              active={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </ScrollView>

        {/* Popular */}
        <View style={{ paddingHorizontal: spacing.screenH, marginBottom: spacing.sm }}>
          <SectionHeader title="Popular Cars" onAction={() => router.push('/(tabs)/shop')} />
        </View>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.screenH, gap: 14 }}
          >
            {[0, 1, 2].map((i) => (
              <CarCardSkeleton key={i} width={280} />
            ))}
          </ScrollView>
        ) : (
          // PERF: FlatList virtualises the carousel (only visible cards mount)
          // and getItemLayout skips per-frame measurement while flinging.
          <FlatList
            horizontal
            data={list}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.screenH, gap: 14 }}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews
            getItemLayout={getCarouselLayout}
            renderItem={renderPopular}
            ListEmptyComponent={
              <Txt tone="secondary" style={{ paddingVertical: 40 }}>
                No cars in this category yet.
              </Txt>
            }
          />
        )}

        {/* Recommended */}
        {!loading && !error && list.length > 0 && (
          <>
            <View style={{ paddingHorizontal: spacing.screenH, marginTop: spacing.xl, marginBottom: spacing.sm }}>
              <SectionHeader title="Recommended For You" />
            </View>
            <View style={{ paddingHorizontal: spacing.screenH, gap: 14 }}>
              {list.map((v) => (
                <RecommendedTile key={v.id} vehicle={v} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  icon,
  mci,
  active,
  onPress,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  mci?: string;
  active: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? t.colors.accent : t.colors.surface, borderColor: active ? t.colors.accent : t.colors.border },
      ]}
    >
      {mci ? (
        <MaterialCommunityIcons name={mci as any} size={17} color={active ? t.colors.onAccent : t.colors.primary} />
      ) : (
        <Ionicons name={icon!} size={17} color={active ? t.colors.onAccent : t.colors.primary} />
      )}
      <Txt variant="titleSmall" color={active ? t.colors.onAccent : t.colors.textPrimary} style={{ marginLeft: 7 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing.screenH, paddingVertical: 28 }}>
      <Txt tone="secondary">Couldn't load cars. {message}</Txt>
      <Pressable onPress={onRetry} style={{ marginTop: 10 }}>
        <Txt variant="titleSmall" color={t.colors.primary}>
          Tap to retry
        </Txt>
      </Pressable>
    </View>
  );
}

const RecommendedTile = memo(function RecommendedTile({ vehicle }: { vehicle: Vehicle }) {
  const t = useTheme();
  const v = vehicle;
  return (
    <Pressable
      onPress={() => router.push(`/car/${v.id}`)}
      style={[styles.tile, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}
    >
      <View style={styles.thumb}>
        <LinearGradient colors={['#2A2A2E', '#141416']} style={StyleSheet.absoluteFill} />
        <NetworkCarImage uri={v.images[0]} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Txt variant="titleMedium" numberOfLines={1}>
          {vehicleTitle(v)}
        </Txt>
        <View style={[styles.row, { marginTop: 2 }]}>
          <Ionicons name="star" size={13} color={t.colors.warning} />
          <Txt variant="bodySmall" tone="secondary" numberOfLines={1} style={{ marginLeft: 3 }}>
            {v.rating} · {v.location}
          </Txt>
        </View>
        <Txt variant="titleSmall" color={t.colors.primary} style={{ marginTop: 8 }}>
          {priceCompact(v.price)}
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={20} color={t.colors.textSecondary} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screenH,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F5B301',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    marginTop: spacing.xl,
  },
  searchBtn: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  tile: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: radius.lg, borderWidth: 1 },
  thumb: { width: 96, height: 76, borderRadius: radius.md, overflow: 'hidden' },
});
