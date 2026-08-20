import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CarCard } from '../../src/components/CarCard';
import { CarCardSkeleton } from '../../src/components/Skeleton';
import { FilterSheet, VehicleFilters } from '../../src/components/FilterSheet';
import { Txt } from '../../src/components/Txt';
import { CATEGORY_META, VehicleCategory } from '../../src/domain/types';
import { useVehicles } from '../../src/hooks/useVehicles';
import { useStore } from '../../src/store/useStore';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';
import { clean } from '../../src/utils/sanitize';

const SCREEN_W = Dimensions.get('window').width;
const CATEGORIES = Object.keys(CATEGORY_META) as VehicleCategory[];

/** Elizade showroom — browse new Toyota / Jetour / JAC inventory. */
export default function Shop() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const category = useStore((s) => s.categoryFilter);
  const setCategory = useStore((s) => s.setCategoryFilter);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  const { vehicles, loading, error, reload } = useVehicles({
    ...filters,
    ...(query ? { q: query } : {}),
  });

  const list = useMemo(
    () => (category ? vehicles.filter((v) => v.category === category) : vehicles),
    [vehicles, category],
  );

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

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.screenH, paddingVertical: spacing.sm }}>
        <Txt variant="headlineMedium">Showroom</Txt>
        <Txt tone="secondary">Explore Elizade's latest Toyota, Jetour & JAC vehicles</Txt>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: spacing.screenH }}>
        <View style={[styles.search, { backgroundColor: t.colors.surface }, t.shadows.soft]}>
          <Ionicons name="search" size={20} color={t.colors.textSecondary} />
          <TextInput
            keyboardAppearance={t.isDark ? 'dark' : 'light'}
            value={search}
            onChangeText={(v) => setSearch(clean(v, 60))}
            placeholder="Search make, model, year…"
            placeholderTextColor={t.colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search vehicles"
            style={[t.type.bodyMedium, { flex: 1, marginLeft: 10, color: t.colors.textPrimary, paddingVertical: 0 }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={t.colors.textTertiary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setFilterOpen(true)}
            accessibilityLabel="Filter vehicles"
            style={{ marginLeft: 8, position: 'relative' }}
            hitSlop={8}
          >
            <Ionicons name="options" size={20} color={t.colors.primary} />
            {activeFilters > 0 && (
              <View style={[styles.filterDot, { backgroundColor: t.colors.primary }]} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Category filter */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[null, ...CATEGORIES]}
        keyExtractor={(c) => c ?? 'all'}
        contentContainerStyle={{ paddingHorizontal: spacing.screenH, gap: 10, paddingVertical: spacing.md }}
        renderItem={({ item }) => (
          <Chip
            label={item ? CATEGORY_META[item].label : 'All'}
            icon={item ? CATEGORY_META[item].icon : undefined}
            active={category === item}
            onPress={() => setCategory(item)}
          />
        )}
      />

      {error ? (
        <View style={{ padding: spacing.screenH }}>
          <Txt tone="secondary">Couldn't load vehicles. {error}</Txt>
          <Pressable onPress={reload} style={{ marginTop: 10 }}>
            <Txt variant="titleSmall" color={t.colors.primary}>
              Tap to retry
            </Txt>
          </Pressable>
        </View>
      ) : loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: spacing.screenH }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: (SCREEN_W - spacing.screenH * 2 - 14) / 2 }}>
              <CarCardSkeleton />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(v) => v.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 14, paddingHorizontal: spacing.screenH }}
          contentContainerStyle={{ gap: 14, paddingBottom: 120 }}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={reload}
              tintColor={t.colors.primary}
              colors={[t.colors.primary]}
              progressBackgroundColor={t.colors.surface}
            />
          }
          ListEmptyComponent={
            <Txt tone="secondary" style={{ padding: spacing.screenH }}>
              {isSearching
                ? 'No vehicles match your search. Try a different term or filter.'
                : 'No vehicles in this category.'}
            </Txt>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <CarCard vehicle={item} onPress={() => router.push(`/car/${item.id}`)} />
            </View>
          )}
        />
      )}

      <FilterSheet
        visible={filterOpen}
        value={filters}
        fuelTypes={fuelTypes}
        transmissions={transmissions}
        onApply={setFilters}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

function Chip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: string;
  active: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? t.colors.primary : t.colors.surface, borderColor: active ? t.colors.primary : t.colors.border },
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={16}
          color={active ? t.colors.onPrimary : t.colors.primary}
          style={{ marginRight: 6 }}
        />
      )}
      <Txt variant="titleSmall" color={active ? t.colors.onPrimary : t.colors.textPrimary}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: radius.md,
    paddingHorizontal: 16,
  },
  filterDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
