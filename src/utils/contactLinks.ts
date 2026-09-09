/**
 * URL construction for the "reach a human" buttons.
 *
 * Separated from `contact.ts` — which imports react-native — so it can be
 * tested in plain node. The formatting rules here are the kind that fail
 * quietly on a device and nowhere else:
 *
 *   * `wa.me` resolves DIGITS ONLY. A `+`, a space or a dash yields "phone
 *     number shared via url is invalid" in WhatsApp, which reads to a customer
 *     as the business being unreachable.
 *   * `tel:` is the opposite — it tolerates separators but is unreliable with
 *     them across diallers, so E.164 with nothing else is the safe form.
 *
 * Neither mistake raises anything. Both just fail in front of a customer.
 */

/** Digits only, no leading `+`. */
export function whatsappUrl(rawNumber: string): string {
  return `https://wa.me/${rawNumber.replace(/\D/g, '')}`;
}

/**
 * `mailto:` with an optional subject.
 *
 * The subject is percent-encoded: an unencoded `&` or `#` truncates the whole
 * link silently, so the mail app opens with a blank or half-written subject
 * and nobody notices until a customer sends one.
 */
export function mailtoUrl(address: string, subject?: string): string {
  const to = address.trim();
  if (!subject) return `mailto:${to}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}`;
}

/** E.164, separators stripped, `+` preserved. */
export function telUrl(rawNumber: string): string {
  const digits = rawNumber.replace(/\D/g, '');
  return `tel:${rawNumber.trim().startsWith('+') ? '+' : ''}${digits}`;
}
