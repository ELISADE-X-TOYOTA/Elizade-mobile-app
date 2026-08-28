import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { getToken } from '../api/session';
import { resolveMediaUrl } from '../api/mappers';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';

interface Props {
  uri: string;
  style?: StyleProp<ViewStyle>;
}

/** Authenticated preview for media returned by the API. */
export function SecureAttachment({ uri, style }: Props) {
  const t = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const isVideo = /\.(mp4|mov)(?:$|[?#])/i.test(uri);

  useEffect(() => {
    let alive = true;
    getToken().then((value) => alive && setToken(value));
    return () => {
      alive = false;
    };
  }, []);

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
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
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
