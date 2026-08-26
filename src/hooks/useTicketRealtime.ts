import { useCallback, useEffect, useRef, useState } from 'react';
import { supportApi } from '../api/support';
import { mapTicketMessage } from '../api/customer-mappers';
import { APP } from '../constants/app';
import { resumeFrom } from '../data/socketBackoff';
import { connectTicketSocket, type SocketMessage, type TicketSocket } from '../data/ticketSocket';
import type { TicketMessage } from '../domain/types';

/**
 * Binds one ticket thread to the realtime socket.
 *
 * THE GUARANTEE: no message is lost. The socket is fast but unreliable — a
 * tunnel change, a backgrounded app or a proxy timeout all drop frames without
 * telling anyone. So every reconnect is followed by a REST catch-up for
 * everything created after the newest message we hold. The socket makes the
 * thread feel live; the REST query is what makes it correct.
 *
 * De-duplication is by message id, because the same message legitimately
 * arrives more than once: over the socket just before a drop was noticed, and
 * again in the catch-up response.
 *
 * SENDING STAYS ON REST. The socket can carry a message, but `POST
 * /support/tickets/{id}/messages` already persists it AND broadcasts the same
 * event to the room, while additionally returning the updated ticket (status,
 * SLA, updatedAt) in the same round-trip. Sending over the socket instead
 * would trade a guaranteed write for a fire-and-forget one and still need the
 * REST call to refresh the header. So: send over REST, receive over the
 * socket, and let id-dedupe absorb the echo of our own message.
 */
export interface TicketRealtime {
  /** Someone on the other side is typing. */
  peerTyping: boolean;
  /** False while reconnecting, for a subtle "offline" hint. */
  connected: boolean;
  /** Live status pushed by an agent, if it has changed since load. */
  liveStatus?: string;
  /** Call on every keystroke; the client debounces. */
  onTyping: (typing: boolean) => void;
  markRead: (ids: string[]) => void;
}

export function useTicketRealtime(
  ticketId: string,
  messages: TicketMessage[],
  setMessages: React.Dispatch<React.SetStateAction<TicketMessage[]>>,
): TicketRealtime {
  const [peerTyping, setPeerTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>();
  const socketRef = useRef<TicketSocket | null>(null);

  // Read inside socket callbacks, which are created once and must not close
  // over a stale messages array.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  /** Merge without duplicating — the same id can arrive twice after a drop. */
  const mergeMessages = useCallback(
    (incoming: TicketMessage[]) => {
      if (!incoming.length) return;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const fresh = incoming.filter((m) => m.id && !seen.has(m.id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    },
    [setMessages],
  );

  /** Everything created after the newest message we hold. */
  const catchUp = useCallback(async () => {
    const since = resumeFrom(messagesRef.current.map((m) => m.createdAt));
    try {
      const rows = await supportApi.messagesSince(ticketId, since);
      mergeMessages(rows.map((r) => mapTicketMessage(r, ticketId)));
    } catch {
      // The screen already shows what it had; the next reconnect tries again.
    }
  }, [ticketId, mergeMessages]);

  useEffect(() => {
    if (!ticketId || APP.useMock) return;

    const socket = connectTicketSocket(ticketId, {
      onConnectionChange: setConnected,

      onJoined: ({ status, reconnected }) => {
        setLiveStatus(status);
        // Only after a RE-join. On the first one the screen has just loaded
        // the thread over REST, so catching up would repeat that request.
        if (reconnected) void catchUp();
      },

      onMessage: (m: SocketMessage) => {
        // Built as a real TicketMessageDto, not cast.
        //
        // The mapper keys attribution off `senderType`; the socket calls the
        // same value `senderRole`. Casting past that mismatch would have made
        // `isCustomer` false for every message, so the customer's own replies
        // would have rendered as "Elizade Support" — on the correct side of
        // the thread, with the wrong name and the wrong colour.
        mergeMessages([
          mapTicketMessage(
            {
              id: m.id,
              senderType: m.senderRole,
              senderName: null,
              body: m.body,
              attachments: m.attachments,
              createdAt: m.createdAt ?? new Date().toISOString(),
            },
            ticketId,
          ),
        ]);
        // Anything arriving while the thread is open has been seen.
        if (m.senderRole !== 'customer' && m.id) socketRef.current?.markRead([m.id]);
      },

      onTyping: ({ role, typing }) => {
        // The gateway already excludes the sender, so this only fires for the
        // other side. The role check still guards the case of the SAME
        // customer signed in on a second device — their own typing there is
        // not something to surface here.
        if (role === 'customer') return;
        setPeerTyping(typing);
      },

      onStatusChanged: ({ status }) => setLiveStatus(status),
    });

    socketRef.current = socket;
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [ticketId, catchUp, mergeMessages]);

  // A typing indicator that never clears is worse than none — if the other
  // side disconnects mid-sentence, no stop event ever arrives.
  useEffect(() => {
    if (!peerTyping) return;
    const timer = setTimeout(() => setPeerTyping(false), 8_000);
    return () => clearTimeout(timer);
  }, [peerTyping]);

  return {
    peerTyping,
    connected,
    liveStatus,
    onTyping: (typing) => socketRef.current?.setTyping(typing),
    markRead: (ids) => socketRef.current?.markRead(ids),
  };
}
