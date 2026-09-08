/**
 * Which media URLs may carry the session token.
 *
 * THE BUG THIS CLOSES: `SecureAttachment` attached
 * `Authorization: Bearer <jwt>` to EVERY image it rendered. That is correct
 * for `/media/documents/...`, which our own API serves and protects — and
 * wrong for everything else. Production stores attachments in DigitalOcean
 * Spaces, so the URL is an absolute `https://<bucket>...` and the header went
 * there instead. Spaces is S3-compatible: it parses `Authorization` as an AWS
 * signature, does not recognise "Bearer", and answers 400 InvalidArgument.
 *
 * Verified against a real production attachment: a plain GET returns 200 and
 * a 97KB JPEG; the identical request with the app's header returns 400. So
 * every chat attachment uploaded fine, stored fine, and then refused to
 * render — and only in production, because local development has no Spaces
 * and serves the same files from `/media/`, where the token is required.
 *
 * SECOND REASON, INDEPENDENT OF THE BUG: a bearer token is a credential. It
 * should never be transmitted to a host that is not ours, whoever operates
 * it, and every image load was doing exactly that.
 */

/** `https://host:port` from an absolute URL, lowercased. `''` if not absolute. */
export function originOf(url: string): string {
  const match = /^(https?:\/\/[^/?#]+)/i.exec(url.trim());
  return match ? match[1].toLowerCase() : '';
}

/**
 * True only when the URL is served by OUR API, which is the only host that
 * should ever see the session token.
 *
 * Fails CLOSED: anything unrecognised gets no header. A missing token on a
 * public object is a rendered image; a token sent to a stranger cannot be
 * taken back.
 */
export function mediaNeedsAuth(url: string | null | undefined, apiBaseUrl: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();

  // A root-relative path can only be resolved against our own API host, so it
  // is ours by construction. `/media` is the authenticated document route.
  if (trimmed.startsWith('/media')) return true;
  if (trimmed.startsWith('/')) return false;

  const target = originOf(trimmed);
  if (!target) return false;

  const api = originOf(apiBaseUrl);
  return api !== '' && target === api;
}
