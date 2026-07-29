import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { UserProfile, initials } from '../domain/types';
import { resolveMediaUrl } from '../api/mappers';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';

interface Props {
  user: UserProfile;
  size?: number;
  /** Typography variant for the initials fallback. */
  variant?: 'titleMedium' | 'headlineSmall';
}

/**
 * User avatar: the uploaded profile photo when one exists, otherwise the
 * initials badge. Relative `/media/...` paths are resolved against the API
 * host, so an uploaded image works the same as an absolute URL.
 */
export function Avatar({ user, size = 48, variant = 'titleMedium' }: Props) {
  const t = useTheme();
  const uri = user.avatar ? resolveMediaUrl(user.avatar) : '';

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.surfaceAlt },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={uri}
        />
      ) : (
        <Txt variant={variant}>{initials(user)}</Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
