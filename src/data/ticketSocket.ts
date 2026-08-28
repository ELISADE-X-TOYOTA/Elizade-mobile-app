import { AppState, type AppStateStatus } from 'react-native';
import { getToken } from '../api/session';
import { APP } from '../constants/app';
import { reconnectDelay, toWebSocketUrl } from './socketBackoff';

/**
 * Realtime client for one support ticket.
 *
 * The socket is BEST EFFORT. Everything it delivers is also readable from
 * `GET /support/tickets/{id}/messages?since=`, and the caller re-syncs through
 * that endpoint on every reconnect. That split is deliberate: a socket cannot
 * promise delivery across a tunnel change or a backgrounded app, so it is
 * treated as an accelerator over a REST source of truth rather than as the
 * source of truth itself. Nothing is lost when it drops — only speed.
 *
 * Auth travels in the `Authorization` header. React Native's WebSocket accepts
 * headers (browsers do not), so the token stays out of the query string and
 * therefore out of proxy access logs. The server accepts `?token=` as well,
 * for the admin console, but we do not need it.
 */

/** Server -> client. Mirrors `app/realtime/events.py`. */
export const SERVER_EVENTS = {
  joined: 'ticket:joined',
  messageReceived: 'ticket:message_received',
  typingStart: 'ticket:typing_start',
  typingStop: 'ticket:typing_stop',
  statusChanged: 'ticket:status_changed',
  messageRead: 'ticket:message_read',
  error: 'error',
} as const;

/** Client -> server. */
export const CLIENT_EVENTS = {
  messageSent: 'ticket:message_sent',
  typingStart: 'ticket:typing_start',
  typingStop: 'ticket:typing_stop',
  markRead: 'ticket:mark_read',
  ping: 'ping',
} as const;

export interface SocketMessage {
  ticketId: string;
  id: string;
  senderId: string | null;
  senderRole: string;
  body: string;
  attachments: string[];
  createdAt: string | null;
  readAt: string | null;
  /** Echo of the ref we sent, present only on our own messages. */
  clientRef?: string;
}

export interface TicketSocketHandlers {
  /** Fired after a successful join — including every RE-join after a drop. */
  onJoined?: (info: { status: string; role: string; reconnected: boolean }) => void;
  onMessage?: (message: SocketMessage) => void;
  onTyping?: (info: { userId: string; role: string; typing: boolean }) => void;
  onStatusChanged?: (info: { status: string; previousStatus: string }) => void;
  onRead?: (info: { messageIds: string[]; readerRole: string }) => void;
  /** A message we sent was rejected. `clientRef` identifies which. */
  onError?: (info: { detail: string; clientRef?: string }) => void;
  /** Connection state, for a "reconnecting…" hint in the UI. */
  onConnectionChange?: (connected: boolean) => void;
}

export interface TicketSocket {
  /** Queues or sends a message. Returns the ref to match the echo against. */
  send: (body: string, attachments: string[], clientRef: string) => boolean;
  setTyping: (typing: boolean) => void;
  markRead: (messageIds: string[]) => void;
  close: () => void;
  isConnected: () => boolean;
}

/** Typing events stop being sent after this much silence. */
const TYPING_IDLE_MS = 3_000;
/** Keeps intermediaries from reaping an idle but healthy socket. */
const PING_INTERVAL_MS = 25_000;

export function connectTicketSocket(
  ticketId: string,
  handlers: TicketSocketHandlers,
): TicketSocket {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let hasConnectedBefore = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let typingTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let typingSent = false;
  let appState: AppStateStatus = AppState.currentState;

  const connected = () => socket?.readyState === WebSocket.OPEN;

  const clearTimers = () => {
    if (retryTimer) clearTimeout(retryTimer);
    if (typingTimer) clearTimeout(typingTimer);
    if (pingTimer) clearInterval(pingTimer);
    retryTimer = typingTimer = null;
    pingTimer = null;
  };

  const teardown = () => {
    if (!socket) return;
    // Detach before closing: our own close event would otherwise schedule a
    // reconnect for a socket we deliberately discarded.
    socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
    try {
      socket.close();
    } catch {
      /* already gone */
    }
    socket = null;
  };

  const scheduleReconnect = () => {
    if (closed || appState !== 'active') return;
    const delay = reconnectDelay(attempt);
    attempt += 1;
    retryTimer = setTimeout(() => void connect(), delay);
  };

  const connect = async () => {
    if (closed || appState !== 'active') return;

    const token = await getToken();
    // Without a session the handshake is refused, and retrying a refusal in a
    // loop is just noise. The caller reconnects after signing in.
    if (!token || APP.useMock) return;

    teardown();
    const url = toWebSocketUrl(APP.apiBaseUrl, `/support/ws/tickets/${ticketId}`);

    let ws: WebSocket;
    try {
      // RN's WebSocket takes headers as a third argument. Typed loosely
      // because the DOM lib's signature does not include it.
      ws = new (WebSocket as unknown as {
        new (url: string, protocols?: string | string[], options?: { headers: Record<string, string> }): WebSocket;
      })(url, undefined, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      scheduleReconnect();
      return;
    }
    socket = ws;

    ws.onopen = () => {
      if (ws !== socket) return;
      // Reset only on a socket that actually opened. Resetting when one is
      // merely attempted turns backoff into a tight retry loop.
      attempt = 0;
      handlers.onConnectionChange?.(true);
      pingTimer = setInterval(() => {
        if (connected()) ws.send(JSON.stringify({ event: CLIENT_EVENTS.ping, data: {} }));
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (raw) => {
      if (ws !== socket) return;
      let frame: { event?: string; data?: Record<string, unknown> };
      try {
        frame = JSON.parse(String(raw.data));
      } catch {
        return; // a malformed frame must not kill the connection
      }
      const data = frame.data ?? {};

      switch (frame.event) {
        case SERVER_EVENTS.joined: {
          const reconnected = hasConnectedBefore;
          hasConnectedBefore = true;
          // `reconnected` tells the caller to run the REST catch-up. On a
          // FIRST join the screen has just loaded the thread over REST
          // anyway, so re-fetching would be a wasted round-trip.
          handlers.onJoined?.({
            status: String(data.status ?? ''),
            role: String(data.role ?? ''),
            reconnected,
          });
          break;
        }
        case SERVER_EVENTS.messageReceived:
          handlers.onMessage?.(data as unknown as SocketMessage);
          break;
        case SERVER_EVENTS.typingStart:
        case SERVER_EVENTS.typingStop:
          handlers.onTyping?.({
            userId: String(data.userId ?? ''),
            role: String(data.role ?? ''),
            typing: frame.event === SERVER_EVENTS.typingStart,
          });
          break;
        case SERVER_EVENTS.statusChanged:
          handlers.onStatusChanged?.({
            status: String(data.status ?? ''),
            previousStatus: String(data.previousStatus ?? ''),
          });
          break;
        case SERVER_EVENTS.messageRead:
          // The server sends `readerRole`, not a timestamp — the receipt
          // says WHO read it, and the client already knows when it arrived.
          handlers.onRead?.({
            messageIds: (data.messageIds as string[]) ?? [],
            readerRole: String(data.readerRole ?? ''),
          });
          break;
        case SERVER_EVENTS.error:
          handlers.onError?.({
            detail: String(data.detail ?? 'Something went wrong'),
            clientRef: data.clientRef ? String(data.clientRef) : undefined,
          });
          break;
      }
    };

    ws.onerror = () => {
      // `onclose` always follows, and that is where reconnection is handled.
      // Doing it here too would schedule two retries for one failure.
    };

    ws.onclose = () => {
      if (ws !== socket) return;
      socket = null;
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = null;
      handlers.onConnectionChange?.(false);
      scheduleReconnect();
    };
  };

  const rawSend = (event: string, data: Record<string, unknown>): boolean => {
    if (!connected()) return false;
    try {
      socket?.send(JSON.stringify({ event, data }));
      return true;
    } catch {
      return false;
    }
  };

  // A backgrounded app cannot hold a socket open — the OS suspends it, and the
  // reconnect attempts it queues all fire at once on resume.
  const onAppStateChange = (next: AppStateStatus) => {
    const wasActive = appState === 'active';
    appState = next;
    if (next === 'active' && !wasActive) {
      attempt = 0;
      void connect();
    } else if (next !== 'active' && wasActive) {
      if (retryTimer) clearTimeout(retryTimer);
      teardown();
    }
  };

  const subscription = AppState.addEventListener('change', onAppStateChange);
  void connect();

  return {
    send: (body, attachments, clientRef) =>
      rawSend(CLIENT_EVENTS.messageSent, { body, attachments, clientRef }),

    setTyping: (typing) => {
      if (typing) {
        // Only the FIRST keystroke sends an event; the rest just push the
        // idle timer out. Emitting per character would send dozens of frames
        // for one sentence.
        if (!typingSent) {
          typingSent = rawSend(CLIENT_EVENTS.typingStart, {});
        }
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          typingSent = false;
          rawSend(CLIENT_EVENTS.typingStop, {});
        }, TYPING_IDLE_MS);
        return;
      }
      // Explicit stop — the message was sent or the field was cleared.
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = null;
      if (typingSent) {
        typingSent = false;
        rawSend(CLIENT_EVENTS.typingStop, {});
      }
    },

    markRead: (messageIds) => {
      if (messageIds.length) rawSend(CLIENT_EVENTS.markRead, { messageIds });
    },

    close: () => {
      closed = true;
      subscription.remove();
      clearTimers();
      teardown();
    },

    isConnected: connected,
  };
}
