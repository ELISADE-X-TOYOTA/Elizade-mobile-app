import { Alert, Linking } from 'react-native';

import { APP } from '../constants/app';
import { telUrl, whatsappUrl } from './contactLinks';

/**
 * Reaching a human at Elizade.
 *
 * Extracted because the Support tab's Call and WhatsApp cards did nothing at
 * all — plain `View`s with no handler — while the car-details dealer card had
 * its own private copy of the dialling logic. One place means the number, the
 * URL scheme and the failure behaviour cannot disagree between screens.
 *
 * Every function here fails LOUDLY. A contact button that silently does
 * nothing is indistinguishable from a broken one, which is exactly how the
 * Support tab's buttons went unnoticed: they looked like buttons, they were
 * decoration, and nothing on screen ever said so.
 */

/**
 * Dial the support line.
 *
 * `tel:` cannot be opened on a tablet or simulator with no dialler, so a
 * failure shows the number instead. Reading it off the screen is worse than a
 * call connecting and enormously better than a tap that appears to do nothing.
 */
export async function callSupport(title = 'Call Elizade'): Promise<void> {
  try {
    await Linking.openURL(telUrl(APP.supportPhone));
  } catch {
    Alert.alert(title, APP.supportPhone);
  }
}

/**
 * Open a WhatsApp chat with Elizade.
 *
 * `https://wa.me/<digits>` rather than the `whatsapp://` scheme on purpose.
 * The custom scheme needs `LSApplicationQueriesSchemes` in the iOS build to be
 * detectable at all, and opening it blind on a device without WhatsApp fails
 * with nothing shown. The https form is a universal link: WhatsApp takes it
 * when installed, the browser handles it when not.
 */
export async function openWhatsApp(title = 'WhatsApp'): Promise<void> {
  try {
    await Linking.openURL(whatsappUrl(APP.supportWhatsApp));
  } catch {
    Alert.alert(title, APP.supportWhatsApp);
  }
}
