import { APP } from '../constants/app';
import { getToken, setToken } from './session';

/**
 * API error surfaced to the UI.
 *
 * SECURITY: `message` is always a safe, user-facing string. Raw server text
 * (which can contain stack traces, SQL, or internal hostnames) is never
 * propagated — see `safeMessage`.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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
}

/** Thin fetch wrapper around the shared Elizade REST API: HTTPS-only, bearer
 *  auth, timeout, and sanitized errors. */
export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const base = resolveBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
    throw new ApiError(
      aborted ? 'The request timed out. Please check your connection.' : 'No connection. Please check your network and try again.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      const data = await res.json();
      detail = typeof data?.detail === 'string' ? data.detail : Array.isArray(data?.detail) ? data.detail[0]?.msg : undefined;
    } catch {
      /* non-JSON error body — fall through to the generic status message */
    }
    // An expired/invalid token should not linger in secure storage.
    if (res.status === 401) await setToken(null);
    throw new ApiError(safeMessage(detail, res.status), res.status);
  }

  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError('Received an unexpected response. Please try again.', res.status);
  }
}
