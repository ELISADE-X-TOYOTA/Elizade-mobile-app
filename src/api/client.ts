import { APP } from '../constants/app';
import { clearSession, getRefreshToken, getToken, setRefreshToken, setToken } from './session';
import { singleFlight } from './singleFlight';

/**
 * API error surfaced to the UI.
 *
 * SECURITY: `message` is always a safe, user-facing string. Raw server text
 * (which can contain stack traces, SQL, or internal hostnames) is never
 * propagated — see `safeMessage`.
 */
export class ApiError extends Error {
  status: number;
  /** Machine-readable code from the API envelope, when the server sent one. */
  code?: string;
  /**
   * The server's `X-Request-ID`.
   *
   * This is the whole reason a support conversation can move past "it says
   * something went wrong". Show it on the error screen, and the exact server
   * log line for that failure is one grep away.
   */
  requestId?: string;
  /** True when the request never produced a response (abort, DNS, offline). */
  isNetwork: boolean;

  constructor(
    message: string,
    status: number,
    extra: { code?: string; requestId?: string; isNetwork?: boolean } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = extra.code;
    this.requestId = extra.requestId;
    this.isNetwork = extra.isNetwork ?? false;
  }
}

/* ── Error reporting hook ────────────────────────────────────────────────
 *
 * Deliberately a hook rather than a direct Sentry import: this module is used
 * by tests and by the web build, and hard-wiring a vendor SDK here would drag
 * native dependencies into both. `app/_layout.tsx` registers the real reporter.
 *
 * A reporter that throws must never break the request path — the failure it
 * would mask is the one the user is already having.
 */
export interface ApiErrorReport {
  status: number;
  code?: string;
  requestId?: string;
  /** Path template only — never the query string, which carries emails. */
  path: string;
  method: string;
  isNetwork: boolean;
  durationMs: number;
}

type ApiErrorReporter = (report: ApiErrorReport) => void;
let reporter: ApiErrorReporter | null = null;

export function setApiErrorReporter(fn: ApiErrorReporter | null): void {
  reporter = fn;
}

function report(r: ApiErrorReport): void {
  if (!reporter) return;
  try {
    reporter(r);
  } catch {
    /* observability must never be the thing that breaks the app */
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

/** Request timeout — prevents a hung socket from blocking the UI forever. */
const TIMEOUT_MS = 20_000;

/** Max characters accepted from a server-provided validation message. */
const MAX_DETAIL_LEN = 140;

/** Anything that looks like a stack trace / internals rather than a message. */
const LEAKY = /(\bat\s+\w+\.|Traceback|File "|\.py:|\.js:\d|SELECT\s|INSERT\s|psycopg|sqlalchemy|Exception:|<html)/i;

function statusMessage(status: number): string {
  if (status === 400 || status === 422) return 'Some details are invalid. Please check and try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return 'We couldn’t find what you were looking for.';
  if (status === 409) return 'That conflicts with an existing record.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  // 503 is the server saying "over capacity, retry" — distinct from 500, which
  // means a fault. Worth separating: one is worth retrying immediately, the
  // other is not.
  if (status === 503) return 'Elizade services are busy right now. Please try again in a moment.';
  if (status >= 500) return 'Elizade services are temporarily unavailable. Please try again shortly.';
  return 'Something went wrong. Please try again.';
}

/**
 * Returns a server validation message only when it is short, single-line and
 * free of anything resembling internals; otherwise a generic status message.
 */
function safeMessage(detail: unknown, status: number): string {
  if (typeof detail !== 'string') return statusMessage(status);
  const trimmed = detail.trim();
  if (!trimmed || trimmed.length > MAX_DETAIL_LEN) return statusMessage(status);
  if (trimmed.includes('\n') || LEAKY.test(trimmed)) return statusMessage(status);
  return trimmed;
}

function toQuery(params?: Query): string {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/**
 * Loopback + RFC1918 private ranges, the only hosts allowed over cleartext and
 * only in dev: localhost, 127.x, the Android-emulator host alias 10.0.2.2,
 * 10.x, 192.168.x and 172.16–172.31.x (a physical device reaching the dev
 * machine over Wi-Fi lands in one of these).
 */
const PRIVATE_HOST =
  /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?(\/|$)/;

/** Rejects non-HTTPS bases outside local development (no cleartext in prod). */
function resolveBaseUrl(): string {
  const base = APP.apiBaseUrl.replace(/\/+$/, '');
  if (!base.startsWith('https://') && !(__DEV__ && PRIVATE_HOST.test(base))) {
    throw new ApiError('Insecure API endpoint blocked. HTTPS is required.', 0);
  }
  return base;
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Attach the bearer token (default true). */
  auth?: boolean;
  /** Internal: set on the one retry after a silent refresh, to stop a loop. */
  _retried?: boolean;
}

/* ── Silent refresh ──────────────────────────────────────────────────────
 *
 * THE BUG THIS REPLACES: any 401, from any endpoint, called `setToken(null)`
 * and the session was gone. One expired access token — or one endpoint the
 * user simply lacked rights for — logged the customer out mid-task.
 *
 * NOW: a 401 tries to renew the session once. Only if the REFRESH itself
 * fails is the session cleared, because that is the only response that
 * actually means "you are no longer signed in".
 *
 * SINGLE-FLIGHT: a screen typically fires several requests at once, so an
 * expired token produces a burst of simultaneous 401s. Without a shared
 * promise each one would refresh independently — and since rotation
 * invalidates the previous token, the second call would present a spent one
 * and the backend would revoke the whole family as suspected theft. The app
 * would log itself out by trying too hard to stay signed in. So the first
 * 401 starts the refresh and the rest await the same promise.
 */

/** Listeners notified when the session ends for real (used to redirect). */
type SessionEndedListener = () => void;
const sessionEndedListeners = new Set<SessionEndedListener>();

export function onSessionEnded(listener: SessionEndedListener): () => void {
  sessionEndedListeners.add(listener);
  return () => sessionEndedListeners.delete(listener);
}

async function endSession(): Promise<void> {
  await clearSession();
  sessionEndedListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* a bad listener must not stop the others */
    }
  });
}

/**
 * Exchanges the refresh token for a new pair. Resolves true on success.
 *
 * Deliberately uses bare `fetch`, not `apiFetch`: routing this through the
 * wrapper would let a 401 from the refresh endpoint re-enter this very
 * function, which is a recursion waiting to happen.
 */
async function performRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${resolveBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // 401 here means the grant is genuinely dead — expired, revoked, or
      // reused. Anything else (500, 502) is the server's problem, not proof
      // the user is signed out, so the session is left intact to retry later.
      if (res.status === 401) await endSession();
      return false;
    }

    const data = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) return false;

    // Store both before returning: the rotated refresh token is single-use,
    // so losing it here would strand the session on the next renewal.
    await setToken(data.access_token);
    await setRefreshToken(data.refresh_token);
    return true;
  } catch {
    // Offline. Not an auth failure — keep the session and let the caller fail.
    return false;
  }
}

/**
 * Refreshes at most once concurrently — see `singleFlight` for why that
 * matters here (concurrent refreshes look like token theft to the backend).
 */
const refreshSession = singleFlight(performRefresh);

/** Thin fetch wrapper around the shared Elizade REST API: HTTPS-only, bearer
 *  auth, timeout, and sanitized errors. */
export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, _retried = false } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const base = resolveBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();

  let res: Response;
  try {
    res = await fetch(`${base}${path}${toQuery(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    // Network/abort failures must not leak URLs or native error text.
    const aborted = e instanceof Error && e.name === 'AbortError';
    /*
      A TIMEOUT IS NOT EVIDENCE ABOUT THE USER'S NETWORK.

      This previously said "The request timed out. Please check your
      connection." During the connection-leak outage the server was answering
      in ~30s and this client aborts at 20s, so EVERY request died here — and
      every tester, on four different networks, was told the fault was theirs.
      They said it wasn't. They were right.

      An abort means only that no answer arrived in time. The cause may be the
      network or the server, and the client cannot tell which, so it should not
      assert either. The `isNetwork` flag and the report below are how the
      truth gets established — from aggregate data, not from a guess shown to
      one user.
    */
    const code = aborted ? 'client_timeout' : 'client_offline';
    report({
      status: 0,
      code,
      path,
      method,
      isNetwork: true,
      durationMs: Math.round(Date.now() - startedAt),
    });
    throw new ApiError(
      aborted
        ? 'This is taking longer than usual. Please try again.'
        : 'No connection. Please check your network and try again.',
      0,
      { code, isNetwork: true },
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    /*
      A 401 on an authenticated request means the ACCESS token was rejected —
      not necessarily that the user is signed out. Renew once and replay.

      `_retried` bounds this to a single attempt, so a server that 401s a
      request even with a brand-new token fails cleanly instead of looping.
      `auth` is checked because an unauthenticated call has no session to
      renew, and the refresh endpoint itself must never land here.
    */
    if (res.status === 401 && auth && !_retried) {
      const renewed = await refreshSession();
      if (renewed) {
        return apiFetch<T>(path, { ...options, _retried: true });
      }
      // Refresh failed. If it failed because the grant is dead, endSession()
      // has already run inside performRefresh; if it failed because we are
      // offline, the session is deliberately left alone.
    }

    /*
      Reads the current envelope ({code, message, requestId, ...}) and still
      understands both older shapes, because a rolled-back API or a cached
      gateway response can serve either:
        {"detail": "..."}                    — plain HTTPException
        {"detail": [{"msg": "..."}]}         — raw FastAPI validation
    */
    let detail: unknown;
    let code: string | undefined;
    try {
      const data = await res.json();
      code = typeof data?.code === 'string' ? data.code : undefined;
      detail =
        typeof data?.message === 'string'
          ? data.message
          : typeof data?.detail === 'string'
            ? data.detail
            : Array.isArray(data?.detail)
              ? data.detail[0]?.msg
              : undefined;
    } catch {
      /* non-JSON error body — fall through to the generic status message */
    }

    // Header, not the body: it is present even when the body is HTML from a
    // proxy that never reached the app.
    const requestId = res.headers.get('X-Request-ID') ?? undefined;

    report({
      status: res.status,
      code,
      requestId,
      path,
      method,
      isNetwork: false,
      durationMs: Math.round(Date.now() - startedAt),
    });

    throw new ApiError(safeMessage(detail, res.status), res.status, { code, requestId });
  }

  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError('Received an unexpected response. Please try again.', res.status);
  }
}
