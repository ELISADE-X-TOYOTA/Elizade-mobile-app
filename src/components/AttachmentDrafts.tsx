import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import type { PickedAttachment } from '../data/supportRepository';
import { radius } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';

interface Props {
  items: PickedAttachment[];
  onRemove: (url: string) => void;
}

/**
 * Thumbnails for attachments staged on an unsent ticket or reply.
 *
 * Renders `previewUri` (the local file) rather than the uploaded URL: the
 * device already has the image, so the thumbnail is instant and costs no
 * round-trip — and it still shows if the network drops between upload and send.
 */
export function AttachmentDrafts({ items, onRemove }: Props) {
  const t = useTheme();
  if (!items.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={{ marginTop: 12 }}
    >
      {items.map((a) => (
        <Animated.View
          key={a.url}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          layout={LinearTransition.duration(180)}
          style={styles.thumb}
        >
          {/* Clipping lives on this inner view so the remove button, which sits
              outside the frame, is not clipped along with the image. */}
          <View
            style={[styles.media, { borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt }]}
          >
            {/* A PDF has no preview frame — show a document glyph instead. */}
            {a.name.toLowerCase().endsWith('.pdf') ? (
              <View style={styles.pdf}>
                <Ionicons name="document-text-outline" size={24} color={t.colors.textSecondary} />
                <Txt variant="labelSmall" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
                  PDF
                </Txt>
              </View>
            ) : (
              <Image
                source={{ uri: a.previewUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={120}
              />
            )}
          </View>

          <Pressable
            onPress={() => onRemove(a.url)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${a.name}`}
            style={[styles.remove, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
          >
            <Ionicons name="close" size={13} color={t.colors.textSecondary} />
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingRight: 4 },
  thumb: { width: 74, height: 74 },
  media: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pdf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
