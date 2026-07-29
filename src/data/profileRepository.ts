import * as ImagePicker from 'expo-image-picker';
import { profileApi, uploadImage } from '../api/profile';
import { APP } from '../constants/app';
import { UserProfile } from '../domain/types';

export interface AvatarResult {
  ok: boolean;
  /** Updated profile when the change succeeded. */
  user?: UserProfile;
  message?: string;
}

/**
 * Pick an image, upload it, and set it as the user's avatar.
 *
 * Returns a result rather than throwing so the caller can show an inline
 * message; a cancelled picker is a no-op, not an error.
 */
export async function pickAndUploadAvatar(
  current: UserProfile,
  source: 'library' | 'camera' = 'library',
): Promise<AvatarResult | null> {
  // Permissions are requested lazily, only when the user asks to change it.
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!perm.granted) {
    return {
      ok: false,
      message:
        source === 'camera'
          ? 'Camera access is needed to take a photo.'
          : 'Photo access is needed to choose an image.',
    };
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    // Compress: avatars display small, and the endpoint caps uploads at 10 MB.
    quality: 0.7,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  if (APP.useMock) {
    // Offline demo: show the local image without a round-trip.
    return { ok: true, user: { ...current, avatar: asset.uri } };
  }

  try {
    const url = await uploadImage(asset.uri, asset.fileName ?? 'avatar.jpg');
    const user = await profileApi.update({ avatar: url });
    return { ok: true, user };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not update your photo.' };
  }
}

/** Remove the current avatar, falling back to initials. */
export async function removeAvatar(current: UserProfile): Promise<AvatarResult> {
  if (APP.useMock) return { ok: true, user: { ...current, avatar: undefined } };
  try {
    const user = await profileApi.update({ avatar: '' });
    return { ok: true, user };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not remove your photo.' };
  }
}
