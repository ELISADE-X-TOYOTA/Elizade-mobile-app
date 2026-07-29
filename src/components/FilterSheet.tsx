import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { price } from '../utils/format';
import { PrimaryButton } from './PrimaryButton';
import { Txt } from './Txt';

/** Server-side filters supported by `GET /vehicles`. */
export interface VehicleFilters {
  fuelType?: string;
  transmission?: string;
  maxPrice?: number;
  sort?: string;
}

interface Props {
  visible: boolean;
  value: VehicleFilters;
  /** Options discovered from the loaded inventory, so we never offer a dead filter. */
  fuelTypes: string[];
  transmissions: string[];
  onApply: (next: VehicleFilters) => void;
  onClose: () => void;
}

const PRICE_CAPS = [25_000_000, 50_000_000, 100_000_000];
/** Backend sort syntax: field name, prefixed with `-` for descending. */
const SORTS = [
  { key: '-createdAt', label: 'Newest' },
  { key: 'price', label: 'Price: low to high' },
  { key: '-price', label: 'Price: high to low' },
  { key: '-year', label: 'Year: newest' },
];

/**
 * Inventory filter sheet. Every control maps to a real `/vehicles` query
 * parameter, so applying a filter re-queries the backend rather than trimming
 * an already-fetched page.
 */
export function FilterSheet({ visible, value, fuelTypes, transmissions, onApply, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const toggle = (key: keyof VehicleFilters, v: string | number) =>
    onApply({ ...value, [key]: value[key] === v ? undefined : v });

  const activeCount = Object.values(value).filter(Boolean).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={[styles.handle, { backgroundColor: t.colors.border }]} />

          <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
            <Txt variant="titleLarge" style={{ flex: 1 }}>
              Filters
            </Txt>
            {activeCount > 0 && (
              <Pressable onPress={() => onApply({})} hitSlop={8}>
                <Txt variant="titleSmall" color={t.colors.primary}>
                  Clear all
                </Txt>
              </Pressable>
            )}
          </View>

          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
            {fuelTypes.length > 0 && (
              <Section title="Fuel type">
                {fuelTypes.map((f) => (
                  <Chip key={f} label={f} active={value.fuelType === f} onPress={() => toggle('fuelType', f)} />
                ))}
              </Section>
            )}

            {transmissions.length > 0 && (
              <Section title="Transmission">
                {transmissions.map((tr) => (
                  <Chip key={tr} label={tr} active={value.transmission === tr} onPress={() => toggle('transmission', tr)} />
                ))}
              </Section>
            )}

            <Section title="Max price">
              {PRICE_CAPS.map((p) => (
                <Chip
                  key={p}
                  label={`Under ${price(p).replace(/,000,000$/, 'M')}`}
                  active={value.maxPrice === p}
                  onPress={() => toggle('maxPrice', p)}
                />
              ))}
            </Section>

            <Section title="Sort by">
              {SORTS.map((s) => (
                <Chip key={s.key} label={s.label} active={value.sort === s.key} onPress={() => toggle('sort', s.key)} />
              ))}
            </Section>
          </ScrollView>

          <View style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>
            <PrimaryButton label="Show results" icon="checkmark" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Txt variant="titleMedium" style={{ marginBottom: spacing.sm }}>
        {title}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? t.colors.primary : t.colors.surfaceAlt,
          borderColor: active ? t.colors.primary : t.colors.border,
        },
      ]}
    >
      {active && <Ionicons name="checkmark" size={14} color={t.colors.onPrimary} style={{ marginRight: 5 }} />}
      <Txt variant="titleSmall" color={active ? t.colors.onPrimary : t.colors.textPrimary}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
