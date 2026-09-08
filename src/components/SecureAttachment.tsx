import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { getToken } from '../api/session';
import { resolveMediaUrl } from '../api/mappers';
import { APP } from '../constants/app';
import { mediaNeedsAuth } from '../utils/mediaAuth';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';

interface Props {
  uri: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Preview for media returned by the API, authenticated ONLY when the file is
 * served by us.
 *
 * It used to send the session token with every image. That is right for
 * `/media/documents/...`, which our API protects, and wrong for everything
 * else — and in production attachments live in DigitalOcean Spaces, so the
 * header went there. Spaces is S3-compatible: it reads `Authorization` as an
 * AWS signature, does not recognise "Bearer", and answers 400. Every chat
 * attachment uploaded correctly and then failed to display, in production
 * only, because development serves the same files from `/media/` where the
 * token IS required.
 */
export function SecureAttachment({ uri, style }: Props) {
  const t = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const isVideo = /\.(mp4|mov)(?:$|[?#])/i.test(uri);
  const needsAuth = mediaNeedsAuth(uri, APP.apiBaseUrl);

  useEffect(() => {
    if (!needsAuth) return;
    let alive = true;
    getToken().then((value) => alive && setToken(value));
    return () => {
      alive = false;
    };
  }, [needsAuth]);

  if (isVideo) {
    return (
      <View style={[styles.video, style, { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }]}>
        <Ionicons name="play-circle-outline" size={36} color={t.colors.primary} />
        <Txt variant="labelSmall" tone="secondary" style={{ marginTop: 4 }}>
          VIDEO
        </Txt>
      </View>
    );
  }

  return (
    <Image
      source={{
        uri: resolveMediaUrl(uri),
        // Only our own host is ever given the token — see `mediaNeedsAuth`.
        ...(needsAuth && token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      }}
      style={style as StyleProp<any>}
      contentFit="cover"
      transition={150}
      cachePolicy="memory-disk"
    />
  );
}

const styles = StyleSheet.create({
  video: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
});
