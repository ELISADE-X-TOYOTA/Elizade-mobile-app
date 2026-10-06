import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

/**
 * Re-encode a picked image to JPEG when the API would refuse its format.
 *
 * THE iOS UPLOAD FAILURE. iPhones shoot HEIC. `expo-image-picker` converts
 * most formats to JPEG on its way out, and passes HEIC through untouched —
 * its own iOS source is explicit about it:
 *
 *     case UTType.heic.identifier:
 *       return (rawData, ".heic")
 *
 * The upload endpoints accept jpeg, png, webp, pdf, mp4 and quicktime. HEIC
 * is not on that list, so every photo from an iPhone camera roll came back
 * 415 while the same action on Android — which shoots JPEG — worked. It read
 * as "file upload is broken on iOS" and was really one missing format.
 *
 * Converting on the client rather than accepting HEIC on the server is
 * deliberate: the admin console renders these files in a browser, and no
 * browser displays HEIC. Storing it would move the failure rather than fix
 * it.
 *
 * TIFF and AVIF take the same path out of the picker and would fail the same
 * way, so this works from an allowlist of what the API accepts rather than a
 * blocklist of what breaks.
 */

/** Image types the upload endpoints will store. Mirrors `_ALLOWED` server-side. */
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export interface PickedImage {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * Returns the asset unchanged when the API already accepts it, and a JPEG
 * copy when it does not. Never throws: if conversion fails the original is
 * returned so the upload can still be attempted and report its own error,
 * rather than the picker dying on a file that might have been fine.
 */
function needsJpegConversion(input: PickedImage): boolean {
  const mime = input.mimeType.toLowerCase();
  if (/heic|heif/.test(mime)) return true;
  if (/\.hei[cf](\?|$)/i.test(input.name) || /\.hei[cf](\?|$)/i.test(input.uri)) return true;
  if (!ACCEPTED_IMAGE_TYPES.has(mime)) return true;
  // iPhones often declare JPEG while the bytes are still HEIC, or the picker
  // hands RN a URI fetch cannot read. Re-encoding on iOS keeps bytes, MIME, and
  // extension aligned with what the API validates.
  return Platform.OS === 'ios';
}

export async function toUploadableImage(input: PickedImage): Promise<PickedImage> {
  if (!needsJpegConversion(input)) return input;

  try {
    const context = ImageManipulator.manipulate(input.uri);
    const image = await context.renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    return {
      uri: result.uri,
      // The extension has to move with the bytes: the server derives what it
      // stores — and therefore how it serves the file back — from these.
      name: input.name.replace(/\.[^.]+$/, '') + '.jpg',
      mimeType: 'image/jpeg',
    };
  } catch {
    return input;
  }
}
