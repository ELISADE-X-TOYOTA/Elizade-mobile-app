import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ListRenderItemInfo, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CarCard } from '../../src/components/CarCard';
import { IMAGE_FALLBACK, NetworkCarImage } from '../../src/components/NetworkCarImage';
import { CarCardSkeleton } from '../../src/components/Skeleton';
import { SectionHeader } from '../../src/components/SectionHeader';
import { clean } from '../../src/utils/sanitize';
import { Txt } from '../../src/components/Txt';
import { MOCK_USER } from '../../src/data/mock';
import { CATEGORY_META, Vehicle, VehicleCategory, vehicleTitle } from '../../src/domain/types';
import { Avatar } from '../../src/components/Avatar';
import { DashboardPanel } from '../../src/components/DashboardPanel';
import { FilterSheet, VehicleFilters } from '../../src/components/FilterSheet';
import { IntroGuide } from '../../src/components/IntroGuide';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useVehicles } from '../../src/hooks/useVehicles';
import { useStore } from '../../src/store/useStore';
import { useWatchlistStore } from '../../src/store/useWatchlistStore';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { greeting, priceCompact } from '../../src/utils/format';
import { solid } from '../../src/theme/colors';

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
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const category = useStore((s) => s.categoryFilter);
  const setCategory = useStore((s) => s.setCategoryFilter);
  const user = useStore((s) => s.currentUser) ?? MOCK_USER;

  // Search box + server-side filters.
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);

  // Debounce typing so we filter on a pause, not on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [search]);

  // First-run walkthrough: only for a signed-in user who hasn't seen it.
  const hasOnboarded = useStore((s) => s.hasCompletedOnboarding);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const signedInUser = useStore((s) => s.currentUser);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (signedInUser && !hasOnboarded(signedInUser.id)) {
      // Let the dashboard paint first so the spotlight lands on real content.
      const id = setTimeout(() => setTourOpen(true), 700);
      return () => clearTimeout(id);
    }
  }, [signedInUser, hasOnboarded]);

  const finishTour = useCallback(() => {
    setTourOpen(false);
    if (signedInUser) completeOnboarding(signedInUser.id);
  }, [signedInUser, completeOnboarding]);

  const { vehicles, loading, error, reload } = useVehicles(filters);
  const { unread, reload: reloadNotifs } = useNotifications();
  const { summary, loading: summaryLoading, reload: reloadSummary } = useDashboard();
  const loadWatchlist = useWatchlistStore((s) => s.load);

  // Refresh the personal panel whenever Home regains focus — bookings made or
  // approvals given elsewhere in the app should show here immediately.
  useFocusEffect(
    useCallback(() => {
      reloadNotifs();
      reloadSummary();
      loadWatchlist();
    }, [reloadNotifs, reloadSummary, loadWatchlist]),
  );

  /**
   * The hook's count already merges the server list with the local welcome
   * notice, so it — not the dashboard figure — is what the bell reflects.
   */
  const unreadCount = unread;

  /**
   * Category is derived client-side (the API has no category field), and the
   * free-text query matches make, model, trim or location.
   */
  const list = useMemo(() => {
    let out = category ? vehicles.filter((v) => v.category === category) : vehicles;
    if (query) {
      out = out.filter((v) =>
        `${v.make} ${v.model} ${v.trim} ${v.location}`.toLowerCase().includes(query),
      );
    }
    return out;
  }, [vehicles, category, query]);

  /** Only offer filter options the loaded inventory actually contains. */
  const fuelTypes = useMemo(
    () => [...new Set(vehicles.map((v) => v.fuelType).filter(Boolean))].sort(),
    [vehicles],
  );
  const transmissions = useMemo(
    () => [...new Set(vehicles.map((v) => v.transmission).filter(Boolean))].sort(),
    [vehicles],
  );
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const isSearching = query.length > 0 || !!category || activeFilters > 0;

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
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={t.colors.primary}
              colors={[t.colors.primary]}
              progressBackgroundColor={t.colors.surface} />}
      >
        {/* Header */}
        <LinearGradient colors={t.gradients.hero} style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.row}>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel={tr('home.openProfile')}
              hitSlop={6}
            >
              <Avatar user={user} size={48} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Txt variant="bodySmall" tone="secondary">
                {greeting()}
              </Txt>
              <Txt variant="titleLarge">{user.firstName}</Txt>
            </View>
            <Pressable onPress={() => router.push('/notifications')} style={[styles.iconBtn, { backgroundColor: t.colors.surfaceAlt }]}>
              <Ionicons name="notifications-outline" size={22} color={t.colors.textPrimary} />
              {unreadCount > 0 && <View style={[styles.badgeDot, { backgroundColor: solid(t.colors.accent) }]} />}
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
            <TextInput
          // iOS renders a LIGHT keyboard in dark mode without this.
          keyboardAppearance={t.isDark ? 'dark' : 'light'}
              value={search}
              onChangeText={(v) => setSearch(clean(v, 60))}
              placeholder={tr('shop.whatCarLooking')}
              placeholderTextColor={t.colors.textTertiary}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel={tr('shop.searchVehicles')}
              style={[t.type.bodyMedium, { flex: 1, color: t.colors.textPrimary, paddingVertical: 0 }]}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel={tr('shop.clearSearch')}>
                <Ionicons name="close-circle" size={18} color={t.colors.textTertiary} />
              </Pressable>
            )}
            <Pressable
              onPress={() => setFilterOpen(true)}
              accessibilityLabel={tr('shop.filterVehicles')}
              style={{ marginLeft: 8 }}
            >
              <LinearGradient colors={t.gradients.accent} style={styles.searchBtn}>
                <Ionicons name="options" size={20} color={t.colors.primaryDark} />
              </LinearGradient>
              {activeFilters > 0 && (
                <View style={[styles.filterCount, { backgroundColor: t.colors.primary }]}>
                  <Txt variant="labelSmall" color={t.colors.onPrimary}>
                    {activeFilters}
                  </Txt>
                </View>
              )}
            </Pressable>
          </View>
        </LinearGradient>

        {/* Personal at-a-glance: next appointment / service due + alerts */}
        <DashboardPanel summary={summary} loading={summaryLoading} />

        {/* Categories */}
        <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.screenH, gap: 10, paddingVertical: spacing.lg }}
        >
          <Chip label={tr('common.all')} icon="grid" active={category === null} onPress={() => setCategory(null)} />
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
        </View>

        {/* Popular */}
        <View style={{ paddingHorizontal: spacing.screenH, marginBottom: spacing.sm }}>
          <SectionHeader
            title={isSearching ? `${list.length} result${list.length === 1 ? '' : 's'}` : 'Popular Cars'}
            actionLabel={isSearching ? 'Clear' : 'See all'}
            onAction={
              isSearching
                ? () => {
                    setSearch('');
                    setCategory(null);
                    setFilters({});
                  }
                : () => router.push('/(tabs)/shop')
            }
          />
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
              <Txt tone="secondary" style={{ paddingVertical: 40, paddingHorizontal: spacing.screenH }}>
                {isSearching
                  ? 'No vehicles match your search. Try a different make, model or filter.'
                  : 'No vehicles available right now.'}
              </Txt>
            }
          />
        )}

        {/* Recommended — hidden while searching, since the list above IS the result set */}
        {!loading && !error && !isSearching && list.length > 0 && (
          <>
            <View style={{ paddingHorizontal: spacing.screenH, marginTop: spacing.xl, marginBottom: spacing.sm }}>
              <SectionHeader title={tr('shop.recommended')} />
            </View>
            <View style={{ paddingHorizontal: spacing.screenH, gap: 14 }}>
              {list.map((v) => (
                <RecommendedTile key={v.id} vehicle={v} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <FilterSheet
        visible={filterOpen}
        value={filters}
        fuelTypes={fuelTypes}
        transmissions={transmissions}
        onApply={setFilters}
        onClose={() => setFilterOpen(false)}
      />

      <IntroGuide visible={tourOpen} onDone={finishTour} />
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
  const { t: tr } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? solid(t.colors.accent) : t.colors.surface, borderColor: active ? solid(t.colors.accent) : t.colors.border },
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
  const { t: tr } = useTranslation();
  return (
    <View style={{ paddingHorizontal: spacing.screenH, paddingVertical: 28 }}>
      <Txt tone="secondary">{tr('shop.loadCarsError', { message })}</Txt>
      <Pressable onPress={onRetry} style={{ marginTop: 10 }}>
        <Txt variant="titleSmall" color={t.colors.primary}>{tr('common.tapToRetry')}</Txt>
      </Pressable>
    </View>
  );
}

const RecommendedTile = memo(function RecommendedTile({ vehicle }: { vehicle: Vehicle }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const v = vehicle;
  return (
    <Pressable
      onPress={() => router.push(`/car/${v.id}`)}
      style={[styles.tile, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, t.shadows.soft]}
    >
      <View style={styles.thumb}>
        <LinearGradient colors={IMAGE_FALLBACK} style={StyleSheet.absoluteFill} />
        <NetworkCarImage uri={v.images[0]} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Txt variant="titleMedium" numberOfLines={1}>
          {vehicleTitle(v)}
        </Txt>
        <View style={[styles.row, { marginTop: 2 }]}>
          <Ionicons name="star" size={13} color={t.colors.warningText} />
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
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: { position: 'absolute', top: 12, right: 12, width: 9, height: 9, borderRadius: 5 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    marginTop: spacing.xl,
  },
  filterCount: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
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
