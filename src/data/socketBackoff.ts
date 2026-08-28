/**
 * Reconnection timing, kept pure so it can be tested without a socket.
 *
 * Reconnect logic is where a realtime client quietly becomes a denial-of-
 * service tool against its own backend: every app on every phone notices the
 * outage at the same moment and, without backoff and jitter, retries in
 * lockstep forever. The numbers below matter more than the socket code.
 */

/** First retry waits this long. */
export const BASE_DELAY_MS = 1_000;
/** No retry ever waits longer than this. */
export const MAX_DELAY_MS = 30_000;

/**
 * Delay before retry number `attempt` (0 = the first retry).
 *
 * Exponential, capped, then jittered across the full range. Full jitter rather
 * than a small ± window on purpose: if ten thousand clients drop together,
 * a narrow jitter still reconnects them in a tight burst that knocks the
 * server over again. Spreading uniformly across [0, delay] flattens it.
 *
 * `random` is injectable so the tests can be deterministic.
 */
export function reconnectDelay(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** Math.max(0, attempt), MAX_DELAY_MS);
  return Math.round(random() * exponential);
}

/**
 * Turns an http(s) API base into the ws(s) origin for the socket.
 *
 * A plain string swap of "http" would also rewrite an "http" appearing later
 * in the URL, so only the scheme at the start is replaced. `wss` is required
 * in production for the same reason `https` is — see `resolveBaseUrl` in the
 * REST client.
 */
export function toWebSocketUrl(apiBaseUrl: string, path: string): string {
  const base = apiBaseUrl.replace(/\/+$/, '');
  const ws = base.replace(/^http(s?):\/\//i, (_m, s) => `ws${s}://`);
  return `${ws}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * The instant to resume from after a reconnect.
 *
 * The server returns messages created STRICTLY after `since`, so passing the
 * newest timestamp we hold is correct and cannot re-deliver what we already
 * have. Passing `undefined` when the thread is empty asks for everything,
 * which is also correct — a client with no messages has missed all of them.
 *
 * Timestamps are compared as ISO strings deliberately: they are UTC and
 * fixed-width, so lexical order is chronological order, and it avoids a
 * Date round-trip losing sub-second precision on some engines.
 */
export function resumeFrom(timestamps: readonly string[]): string | undefined {
  let newest: string | undefined;
  for (const ts of timestamps) {
    if (!ts) continue;
    if (newest === undefined || ts > newest) newest = ts;
  }
  return newest;
}
