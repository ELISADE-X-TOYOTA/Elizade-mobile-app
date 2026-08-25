import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestQuote } from '../data/salesRepository';
import { useBranches } from '../hooks/useBranches';
import { Vehicle, vehicleTitle } from '../domain/types';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { price } from '../utils/format';
import { PrimaryButton } from './PrimaryButton';
import { Txt } from './Txt';
import { tint } from '../theme/colors';

interface Props {
  visible: boolean;
  vehicle: Vehicle;
  onClose: () => void;
}

const ADDONS = ['Extended Warranty', 'Tinted Windows', 'Floor Mats & Boot Liner', 'Roof Rails', 'Dash Cam'];

/** Request a formal quotation — colour, showroom, optional add-ons. */
export function QuoteModal({ visible, vehicle, onClose }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showroom, setShowroom] = useState(0);
  const [addons, setAddons] = useState<string[]>([]);
  const { branches } = useBranches();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const close = () => {
    onClose();
    setTimeout(() => {
      setDone(false);
      setError(undefined);
    }, 250);
  };

  const submit = async () => {
    setLoading(true);
    setError(undefined);
    try {
      // Showroom + add-ons ride along as notes: the quote endpoint takes the
      // vehicle and free-text, and sales price the extras manually.
      const notes = [
        `Preferred showroom: ${branches[showroom]?.name ?? 'Any'}`,
        addons.length ? `Add-ons: ${addons.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('. ');
      await requestQuote({ vehicleId: vehicle.id, notes });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not request a quote.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (a: string) => setAddons((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: t.colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={[styles.handle, { backgroundColor: t.colors.border }]} />

          {done ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Animated.View entering={ZoomIn.duration(500)} style={[styles.successIcon, { backgroundColor: tint(t.colors.success, 0.12) }]}>
                <Ionicons name="document-text" size={56} color={t.colors.successText} />
              </Animated.View>
              <Txt variant="headlineMedium" style={{ marginTop: 20 }}>{tr('quote.requested')}</Txt>
              <Txt tone="secondary" center style={{ marginTop: 8 }}>
                A formal quotation for your {vehicleTitle(vehicle)} will be sent to your email and appear in Support shortly.
              </Txt>
              <View style={{ height: 20 }} />
              <PrimaryButton label={tr('common.done')} onPress={close} style={{ width: '100%' }} />
            </View>
          ) : (
            <>
              <Txt variant="titleLarge" style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>{tr('quote.title')}</Txt>
              <Txt tone="secondary" style={{ paddingHorizontal: spacing.lg, marginTop: 2 }}>
                {vehicleTitle(vehicle)} · {price(vehicle.price)}
              </Txt>

              <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
                <Txt variant="titleMedium" style={{ marginBottom: spacing.sm }}>{tr('quote.pickupShowroom')}</Txt>
                {branches.slice(0, 4).map((s, i) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setShowroom(i)}
                    style={[styles.row, { backgroundColor: t.colors.surfaceAlt, borderColor: showroom === i ? t.colors.primary : t.colors.border }]}
                  >
                    <Ionicons name="business-outline" size={20} color={t.colors.primary} />
                    <Txt variant="titleSmall" style={{ flex: 1, marginLeft: 12 }}>
                      {s.name}
                    </Txt>
                    <Ionicons name={showroom === i ? 'radio-button-on' : 'radio-button-off'} size={20} color={showroom === i ? t.colors.primary : t.colors.textTertiary} />
                  </Pressable>
                ))}

                <Txt variant="titleMedium" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>{tr('quote.addOns')}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ADDONS.map((a) => {
                    const on = addons.includes(a);
                    return (
                      <Pressable
                        key={a}
                        onPress={() => toggle(a)}
                        style={[styles.chip, { backgroundColor: on ? t.colors.primary : t.colors.surfaceAlt, borderColor: on ? t.colors.primary : t.colors.border }]}
                      >
                        {on && <Ionicons name="checkmark" size={14} color={t.colors.onPrimary} style={{ marginRight: 4 }} />}
                        <Txt variant="titleSmall" color={on ? t.colors.onPrimary : t.colors.textPrimary}>
                          {a}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>
                {error ? (
                  <Txt variant="bodySmall" color={t.colors.errorText} style={{ marginBottom: spacing.sm }}>
                    {error}
                  </Txt>
                ) : null}
                <PrimaryButton label={tr('shop.requestQuote')} icon="document-text" loading={loading} onPress={submit} />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.md, borderWidth: 1, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 40, borderRadius: radius.pill, borderWidth: 1 },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});
