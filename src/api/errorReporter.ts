import { Platform } from 'react-native';

import { APP } from '../constants/app';
import { ApiErrorReport, setApiErrorReporter } from './client';
import { getToken } from './session';

/**
 * Sends API failures the app experienced to `POST /telemetry/client-errors`.
 *
 * THE HOOK WAS NEVER INSTALLED. `setApiErrorReporter` has been in
 * `src/api/client.ts` from the start, its comment says the layout registers
 * the real reporter, and nothing ever called it — so `report()` was a no-op
 * and every client-side failure was computed, shown to the customer, and
 * dropped.
 *
 * That is why a reported outage across the warranty screens could not be
 * explained. The message the tester saw is the client's text for an HTTP 5xx,
 * so something genuinely failed; driving every warranty endpoint against the
 * live database for all 45 customer accounts produced 135 requests and zero
 * errors. With no record from the app's side there was nothing left to check.
 *
 * Three rules, all of them about never making things worse:
 *
 *   1. NEVER report the reporter. A failing telemetry endpoint would generate
 *      a failure, which would be reported, which would fail — a loop that
 *      turns one broken endpoint into a flood.
 *   2. NEVER throw, and never block. Telemetry runs after the error has
 *      already been handled; if it fails, it fails silently.
 *   3. NEVER grow without bound. An offline device buffers, and the buffer is
 *      capped — the oldest go, because the newest describe what is wrong now.
 */

const ENDPOINT = '/telemetry/client-errors';

/** Beyond this the oldest are dropped. Small: this is a diagnosis aid, not a log. */
const MAX_BUFFERED = 20;

/** Batched rather than sent per failure — a burst is usually one broken screen. */
const FLUSH_AFTER_MS = 4000;

let buffer: ApiErrorReport[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let sending = false;

function schedule(): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_AFTER_MS);
}

async function flush(): Promise<void> {
  if (sending || buffer.length === 0) return;
  sending = true;

  // Taken before the request, so failures arriving mid-flight are kept for the
  // next flush rather than lost with this one.
  const batch = buffer;
  buffer = [];

  try {
    const token = await getToken();
    const base = APP.apiBaseUrl.replace(/\/+$/, '');
    await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Attached when present so a failure can be tied to an account, and
        // omitted when absent — a failing sign-in still gets recorded.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        items: batch.map((r) => ({
          status: r.status,
          code: r.code,
          path: r.path,
          method: r.method,
          requestId: r.requestId,
          isNetwork: r.isNetwork,
          durationMs: r.durationMs,
          appVersion: APP.version,
          platform: Platform.OS,
        })),
      }),
    });
  } catch {
    // Deliberately silent, and deliberately NOT re-queued. Retrying a report
    // about a failure, through the same network that just failed, is how a bad
    // connection becomes a busy loop.
  } finally {
    sending = false;
    if (buffer.length > 0) schedule();
  }
}

export function installApiErrorReporter(): void {
  setApiErrorReporter((report) => {
    // Rule 1. Without this, one broken telemetry endpoint feeds itself.
    if (report.path.startsWith(ENDPOINT)) return;

    buffer.push(report);
    if (buffer.length > MAX_BUFFERED) buffer = buffer.slice(-MAX_BUFFERED);
    schedule();
  });
}
