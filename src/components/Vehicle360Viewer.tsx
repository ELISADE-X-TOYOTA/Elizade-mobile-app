import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Vehicle } from '../domain/types';
import { useTheme } from '../theme/useTheme';
import { ON_DARK_INK, OVERLAY_CHIP, OVERLAY_CHIP_INK, solid, tint } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { NetworkCarImage } from './NetworkCarImage';
import { Txt } from './Txt';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIEWER_HEIGHT = 340;

interface Props {
  vehicle: Vehicle;
}

/**
 * Interactive vehicle photography and a lightweight, data-backed configurator.
 *
 * `Vehicle.images` is the current backend detail asset. When the API returns
 * multiple ordered images, paging and the step controls behave as a 360
 * turntable. With one image the same screen remains useful without pretending
 * a missing asset is a full rotation.
 */
export function Vehicle360Viewer({ vehicle }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const frames = useMemo(() => (vehicle.images.length ? vehicle.images : ['']), [vehicle.images]);
  const scrollRef = useRef<ScrollView>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState(() => vehicle.features.slice(0, 3));

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setFrameIndex(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH));
  };

  const moveFrame = (direction: -1 | 1) => {
    const next = (frameIndex + direction + frames.length) % frames.length;
    setFrameIndex(next);
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((current) =>
      current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature],
    );
  };

  return (
    <View>
      <View style={styles.viewer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          scrollEventThrottle={16}
          accessibilityLabel={tr('shop.imageViewer')}
        >
          {frames.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.frame}>
              <NetworkCarImage uri={uri} priority={index === frameIndex ? 'high' : 'low'} />
            </View>
          ))}
        </ScrollView>
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.25)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.viewerTop}>
          <View style={styles.viewChip}>
            <MaterialCommunityIcons name="rotate-360" size={18} color={ON_DARK_INK} />
            <Txt variant="bodySmall" color={ON_DARK_INK} style={{ marginLeft: 6 }}>
              360° View
            </Txt>
          </View>
          <View style={styles.counter}>
            <Txt variant="labelSmall" color={ON_DARK_INK}>
              {frameIndex + 1} / {frames.length}
            </Txt>
          </View>
        </View>

        {frames.length > 1 && (
          <>
            <Pressable
              onPress={() => moveFrame(-1)}
              style={[styles.arrow, styles.arrowLeft]}
              accessibilityRole="button"
              accessibilityLabel={tr('shop.prevAngle')}
            >
              <Ionicons name="chevron-back" size={22} color={OVERLAY_CHIP_INK} />
            </Pressable>
            <Pressable
              onPress={() => moveFrame(1)}
              style={[styles.arrow, styles.arrowRight]}
              accessibilityRole="button"
              accessibilityLabel={tr('shop.nextAngle')}
            >
              <Ionicons name="chevron-forward" size={22} color={OVERLAY_CHIP_INK} />
            </Pressable>
          </>
        )}

        <View style={styles.viewerBottom}>
          <Txt variant="bodySmall" color={ON_DARK_INK}>
            {frames.length > 1 ? 'Swipe to rotate' : 'Vehicle photography'}
          </Txt>
          <Pressable
            onPress={() => setConfigOpen((open) => !open)}
            style={styles.configureChip}
            accessibilityRole="button"
            accessibilityLabel={configOpen ? 'Hide vehicle configurator' : 'Open vehicle configurator'}
          >
            <Ionicons name="options-outline" size={16} color={OVERLAY_CHIP_INK} />
            <Txt variant="labelSmall" color={OVERLAY_CHIP_INK} style={{ marginLeft: 5 }}>{tr('shop.configure')}</Txt>
          </Pressable>
        </View>

        {frames.length > 1 && (
          <View style={styles.dots}>
            {frames.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { width: index === frameIndex ? 20 : 7, backgroundColor: index === frameIndex ? solid(t.colors.accent) : 'rgba(255,255,255,0.6)' },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {configOpen && (
        <View style={[styles.config, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <View style={styles.configHeading}>
            <View style={{ flex: 1 }}>
              <Txt variant="titleLarge">{tr('shop.configureTitle')}</Txt>
              <Txt variant="bodySmall" tone="secondary" style={{ marginTop: 3 }}>{tr('shop.configureSubtitle')}</Txt>
            </View>
            <Ionicons name="sparkles-outline" size={22} color={t.colors.primary} />
          </View>

          <View style={[styles.finish, { backgroundColor: tint(t.colors.accent, 0.1) }]}>
            <View style={[styles.swatch, { backgroundColor: vehicle.colorHex, borderColor: t.colors.border }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Txt variant="labelSmall" tone="secondary">{tr('shop.exteriorFinish')}</Txt>
              <Txt variant="titleSmall">{vehicle.color}</Txt>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={t.colors.successText} />
          </View>

          {!!vehicle.features.length && (
            <>
              <Txt variant="labelMedium" tone="secondary" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>{tr('shop.includedHighlights')}</Txt>
              <View style={styles.featureList}>
                {vehicle.features.map((feature) => {
                  const selected = selectedFeatures.includes(feature);
                  return (
                    <Pressable
                      key={feature}
                      onPress={() => toggleFeature(feature)}
                      style={[
                        styles.feature,
                        {
                          backgroundColor: selected ? tint(t.colors.accent, 0.18) : t.colors.surfaceAlt,
                          borderColor: selected ? solid(t.colors.accent) : t.colors.border,
                        },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                        size={15}
                        color={selected ? t.colors.accentText : t.colors.textSecondary}
                      />
                      <Txt variant="bodySmall" style={{ marginLeft: 5 }}>
                        {feature}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
          <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: spacing.md }}>{tr('shop.configureDisclaimer')}</Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  viewer: { height: VIEWER_HEIGHT, overflow: 'hidden' },
  frame: { width: SCREEN_WIDTH, height: VIEWER_HEIGHT },
  viewerTop: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  counter: { backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill },
  arrow: { position: 'absolute', top: VIEWER_HEIGHT / 2 - 20, width: 40, height: 40, borderRadius: 20, backgroundColor: OVERLAY_CHIP, alignItems: 'center', justifyContent: 'center' },
  arrowLeft: { left: 14 },
  arrowRight: { right: 14 },
  viewerBottom: { position: 'absolute', left: 16, right: 16, bottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  configureChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: OVERLAY_CHIP, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  dots: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 7, borderRadius: 4 },
  config: { margin: spacing.screenH, marginTop: -8, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  configHeading: { flexDirection: 'row', alignItems: 'flex-start' },
  finish: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, padding: spacing.sm, borderRadius: radius.md },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1 },
  featureList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
});
