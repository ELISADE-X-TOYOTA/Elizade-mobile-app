import { Platform, TextInputProps } from 'react-native';

/**
 * Which keyboard the six OTP boxes should raise.
 *
 * THE REPORTED BUG IS A PLATFORM DIFFERENCE. Both screens asked for
 * `numbers-and-punctuation`, which is an iOS-only value: on iOS it opens the
 * numeric plane with an "ABC" key still available, which is exactly right. On
 * ANDROID it is not a supported type, so React Native falls back to the plain
 * text keyboard — a full alphabetic layout, on a field that takes six digits.
 * That is what QA saw.
 *
 * So the platforms need different answers, and Android's is a genuine
 * trade-off rather than an oversight:
 *
 *   * every real customer types six DIGITS, so a number pad is correct;
 *   * the App Store / Play reviewer signs in with a fixed code that must
 *     contain a letter — six digits is a million combinations against an
 *     endpoint with no throttle on that branch, so the letter is what makes
 *     the credential safe.
 *
 * Android has no numeric-first keyboard that still reaches letters. Digits-only
 * it is, and the reviewer PASTES their code instead: pasting is a system
 * action, independent of the keyboard on screen, and the paste handler in both
 * screens spreads an alphanumeric block across the boxes. The submission notes
 * have to say so.
 *
 * The cleaner long-term fix is to throttle the bypass branch so the reviewer
 * code can be all digits — then this file collapses to one value.
 */
export const OTP_KEYBOARD_TYPE: TextInputProps['keyboardType'] = Platform.select({
  // Numeric plane first, letters one key away.
  ios: 'numbers-and-punctuation',
  // Digits only. Letters arrive by paste — see above.
  android: 'number-pad',
  default: 'number-pad',
});
