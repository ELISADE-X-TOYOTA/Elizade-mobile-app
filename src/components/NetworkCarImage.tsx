import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useState } from 'react';
import { ImageStyle, StyleProp, StyleSheet, View } from 'react-native';

/**
 * Network image with a gradient + car-icon fallback so layouts never break.
 *
 * PERF: uses expo-image (not RN Image) for disk + memory caching, so a photo is
 * decoded once and reused across the carousel, grid and detail screens instead
 * of being re-downloaded on every mount. `transition` cross-fades in on the UI
 * thread; `recyclingKey` lets list recycling swap sources without flashing the
 * previous image.
 */
interface Props {
  uri: string;
  style?: StyleProp<ImageStyle>;
  radius?: number;
  /** Lower priority for offscreen/list thumbnails. */
  priority?: 'low' | 'normal' | 'high';
}

const FALLBACK_COLORS = ['#2A2A2E', '#141416'] as const;

function NetworkCarImageBase({ uri, style, radius = 0, priority = 'normal' }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;

  return (
    <View style={[styles.fill, { borderRadius: radius, overflow: 'hidden' }]}>
      <LinearGradient
        colors={FALLBACK_COLORS}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <MaterialCommunityIcons name="car-sports" size={40} color="rgba(255,255,255,0.5)" />
      </View>
      {showImage && (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, style as object]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={uri}
          priority={priority}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

/** Memoised: list scrolling re-renders parents constantly; the image only needs
 *  to re-render when its uri actually changes. */
export const NetworkCarImage = memo(NetworkCarImageBase);

const styles = StyleSheet.create({
  fill: { flex: 1, width: '100%', height: '100%' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
