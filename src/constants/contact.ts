/**
 * Elizade's official contact channels and social presence.
 *
 * ONE SOURCE, because the previous numbers were scattered and wrong. The
 * support line was `+2347003549233`, a 0700 service number with no WhatsApp
 * account behind it, so the WhatsApp button answered "The phone number
 * +234 700 354 9233 isn't on WhatsApp." The dealer card on the car screen
 * dialled the same number from its own hardcoded copy.
 *
 * Anything user-facing that reaches Elizade should come from here.
 */

/** Dialled as-is. National format, which is what `tel:` wants locally. */
export const SUPPORT_PHONE = '09013248553';

/**
 * WhatsApp resolves an ACCOUNT, and `wa.me` takes international digits with
 * no `+` — so this is deliberately a different string from the dial number,
 * not a formatting variant of it.
 */
export const SUPPORT_WHATSAPP = '2349013248553';

/** Reaches a human. Used for `mailto:`, and printed where a link cannot be. */
export const SUPPORT_EMAIL = 'info@elizade.net';

export const WEBSITE = 'https://www.elizade.net';

/**
 * Official accounts, in the order they are shown.
 *
 * `icon` names are Ionicons; every one used here exists in the bundled set —
 * a missing glyph renders as a blank box rather than failing loudly, so the
 * list is deliberately limited to logos that ship.
 */
export interface SocialLink {
  key: string;
  label: string;
  handle: string;
  url: string;
  icon: 'logo-twitter' | 'logo-instagram' | 'logo-facebook' | 'logo-linkedin' | 'logo-youtube' | 'globe-outline';
}

export const SOCIALS: SocialLink[] = [
  {
    key: 'website',
    label: 'Website',
    handle: 'elizade.net',
    url: WEBSITE,
    icon: 'globe-outline',
  },
  {
    key: 'x',
    label: 'X',
    handle: '@contactelizade',
    url: 'https://twitter.com/contactelizade',
    icon: 'logo-twitter',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    handle: '@contactelizade',
    url: 'https://www.instagram.com/contactelizade/',
    icon: 'logo-instagram',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    handle: 'Elizade Nigeria Limited',
    url: 'https://www.facebook.com/contactelizadenigeria/',
    icon: 'logo-facebook',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    handle: 'Elizade Nigeria Limited',
    url: 'https://www.linkedin.com/company/elizade-nigeria-limited',
    icon: 'logo-linkedin',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    handle: 'Elizade Official',
    url: 'https://www.youtube.com/channel/UCPnsZLmgI0rttkxzLZ1OVNg/about',
    icon: 'logo-youtube',
  },
];
