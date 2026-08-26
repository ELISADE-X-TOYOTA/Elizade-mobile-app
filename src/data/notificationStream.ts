import { AppState, type AppStateStatus } from 'react-native';
import { APP } from '../constants/app';
import { getToken } from '../api/session';
import { parseSseChunk } from './sseParser';

/**
 * Server-Sent Events client for `/notifications/stream`.
 *
 * WHY THIS EXISTS: the backend has streamed unread counts since the
 * notification work landed, but nothing ever connected to it. The app fetched
 * notifications once on mount, so an admin requesting documents for an
 * ownership claim reached the customer only when they next opened the
 * notifications screen and pulled to refresh.
 *
 * WHY NOT `EventSource`: React Native does not ship one, and the usual
 * polyfill is a dependency we cannot add offline. XHR's progressive
 * `responseText` is how SSE was done before EventSource existed and works on
 * both platforms today — `onreadystatechange` fires at LOADING (3) each time
 * more of the body arrives, with everything received so far in `responseText`.
 * We track how much has already been parsed and decode only the new tail.
 *
 * WHY SSE AND NOT A WEBSOCKET: this traffic only goes one way. A socket would
 * add a handshake, a heartbeat and a reconnect protocol to deliver what a
 * plain HTTP response already delivers.
 *
 * PUSH STILL MATTERS. This only runs while the app is in the FOREGROUND — a
 * backgrounded app has no business holding a socket open, and the OS will
 * suspend it anyway. Backgrounded delivery is the push channel's job; the two
 * are complementary, not redundant.
 */

/** The stream ends server-side after ~10 minutes; reconnecting is normal. */
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 60_000;

type UnreadListener = (unread: number) => void;

interface StreamHandle {
  stop: () => void;
}

/**
 * Opens the stream and calls `onUnread` whenever the server reports a change.
 *
 * The payload is deliberately just a count: the caller refetches the list
 * rather than trusting a pushed object, so a notification can never appear in
 * the UI before it is readable from the API.
 */
export function subscribeToNotifications(onUnread: UnreadListener): StreamHandle {
  let stopped = false;
  let xhr: XMLHttpRequest | null = null;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let appState: AppStateStatus = AppState.currentState;

  const closeSocket = () => {
    if (xhr) {
      // Detach first: aborting fires onreadystatechange, and a reconnect
      // scheduled from our own abort would loop.
      xhr.onreadystatechange = null;
      try {
        xhr.abort();
      } catch {
        /* already dead */
      }
      xhr = null;
    }
  };

  const scheduleReconnect = () => {
    if (stopped || appState !== 'active') return;
    // Exponential backoff, capped. A server that is down must not be hammered
    // by every installed app at once.
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
    attempt += 1;
    retryTimer = setTimeout(connect, delay);
  };

  const connect = async () => {
    if (stopped || appState !== 'active') return;

    const token = await getToken();
    // No session, nothing to stream. A reconnect loop against 401 would be
    // pointless traffic.
    if (!token || APP.useMock) return;

    closeSocket();
    const request = new XMLHttpRequest();
    xhr = request;
    let parsed = 0;
    let buffer = '';

    request.open('GET', `${APP.apiBaseUrl.replace(/\/+$/, '')}/notifications/stream`);
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.setRequestHeader('Accept', 'text/event-stream');

    request.onreadystatechange = () => {
      if (request !== xhr) return; // superseded by a newer connection

      // 3 = LOADING: part of the body has arrived and more is coming.
      if (request.readyState === 3 || request.readyState === 4) {
        const text = request.responseText ?? '';
        // Only the part we have not seen. `responseText` is cumulative, so
        // re-parsing it whole would re-emit every earlier event.
        if (text.length > parsed) {
          buffer += text.slice(parsed);
          parsed = text.length;
          const { events, rest } = parseSseChunk(buffer);
          buffer = rest;
          for (const evt of events) {
            if (evt.event !== 'unread') continue;
            try {
              const payload = JSON.parse(evt.data) as { unread?: number };
              if (typeof payload.unread === 'number') {
                // A frame arrived, so the connection is healthy — reset the
                // backoff or a long-lived stream would reconnect slowly after
                // an earlier failure.
                attempt = 0;
                onUnread(payload.unread);
              }
            } catch {
              /* a malformed frame must not kill the stream */
            }
          }
        }
      }

      if (request.readyState === 4) {
        // The server closes after its bounded loop. This is the expected end
        // of a healthy stream, not an error — reconnect.
        xhr = null;
        scheduleReconnect();
      }
    };

    request.onerror = () => {
      if (request !== xhr) return;
      xhr = null;
      scheduleReconnect();
    };

    try {
      request.send();
    } catch {
      xhr = null;
      scheduleReconnect();
    }
  };

  // Streaming from a backgrounded app wastes battery and the OS suspends the
  // connection anyway; push covers that case. Reconnect on return to
  // foreground, which is also when the customer will look at the badge.
  const onAppStateChange = (next: AppStateStatus) => {
    const wasActive = appState === 'active';
    appState = next;
    if (next === 'active' && !wasActive) {
      attempt = 0;
      void connect();
    } else if (next !== 'active' && wasActive) {
      closeSocket();
      if (retryTimer) clearTimeout(retryTimer);
    }
  };

  const subscription = AppState.addEventListener('change', onAppStateChange);
  void connect();

  return {
    stop: () => {
      stopped = true;
      subscription.remove();
      if (retryTimer) clearTimeout(retryTimer);
      closeSocket();
    },
  };
}
