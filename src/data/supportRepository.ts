import * as ImagePicker from 'expo-image-picker';
import { mapTicket, mapTicketMessage } from '../api/customer-mappers';
import {
  CreateTicketBody,
  MAX_ATTACHMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  supportApi,
  uploadMediaAttachment,
} from '../api/support';
import { APP } from '../constants/app';
import { SupportTicket, TicketMessage } from '../domain/types';
import { SUPPORT_TICKETS, TICKET_MESSAGES } from './mock';

/** A picked-and-uploaded file, ready to send with a ticket or reply. */
export interface PickedAttachment {
  /** Server URL to send in `attachments`. */
  url: string;
  /** Local uri, for an instant thumbnail while the message is still a draft. */
  previewUri: string;
  name: string;
  kind: 'image' | 'video' | 'document';
}

export type PickResult =
  | { ok: true; attachment: PickedAttachment }
  | { ok: false; message: string }
  /** User backed out of the picker — not an error, show nothing. */
  | null;

/**
 * Prompts for a photo, uploads it, and returns the URL to attach.
 *
 * Permissions are requested lazily, only once the user taps attach — asking on
 * screen load trains people to deny. Mirrors `pickAndUploadAvatar`.
 */
export async function pickTicketAttachment(
  source: 'library' | 'camera' = 'library',
  uploadPath = '/support/attachments/upload',
): Promise<PickResult> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!perm.granted) {
    return {
      ok: false,
      message:
        source === 'camera'
          ? 'Camera access is needed to take a photo.'
          : 'Photo and video access is needed to attach media.',
    };
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.7 });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const kind = asset.type === 'video' ? 'video' : 'image';
  const name = asset.fileName ?? `attachment-${Date.now()}.${kind === 'video' ? 'mp4' : 'jpg'}`;
  const fileSize = asset.fileSize ?? 0;
  if (fileSize > (kind === 'video' ? MAX_ATTACHMENT_BYTES : MAX_IMAGE_BYTES)) {
    return {
      ok: false,
      message: kind === 'video' ? 'Videos must be 50MB or smaller.' : 'Images must be 10MB or smaller.',
    };
  }
  if (kind === 'video' && asset.duration != null && asset.duration > MAX_VIDEO_DURATION_SECONDS * 1000) {
    return { ok: false, message: `Videos must be ${MAX_VIDEO_DURATION_SECONDS} seconds or shorter.` };
  }

  if (APP.useMock) {
    // Offline demo: skip the round-trip and show the local file.
    return { ok: true, attachment: { url: asset.uri, previewUri: asset.uri, name, kind } };
  }

  try {
    const url = await uploadMediaAttachment(
      asset.uri,
      name,
      asset.mimeType ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      uploadPath,
    );
    return { ok: true, attachment: { url, previewUri: asset.uri, name, kind } };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not upload that file.' };
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let tickets: SupportTicket[] = [...SUPPORT_TICKETS];
const messages: Record<string, TicketMessage[]> = JSON.parse(JSON.stringify(TICKET_MESSAGES));

export async function fetchTickets(): Promise<SupportTicket[]> {
  if (APP.useMock) {
    await delay(400);
    return [...tickets];
  }
  return (await supportApi.list()).map((t) => mapTicket(t));
}

export async function fetchTicket(
  id: string,
): Promise<{ ticket?: SupportTicket; messages: TicketMessage[] }> {
  if (APP.useMock) {
    await delay(300);
    return { ticket: tickets.find((t) => t.id === id), messages: messages[id] ?? [] };
  }
  const detail = await supportApi.get(id);
  const msgs = (detail.messages ?? []).map((m) => mapTicketMessage(m, id));
  return {
    ticket: mapTicket(detail, msgs[msgs.length - 1]?.body ?? ''),
    messages: msgs,
  };
}

export async function createTicket(body: CreateTicketBody): Promise<SupportTicket> {
  if (APP.useMock) {
    await delay(700);
    const id = `tk${Date.now()}`;
    const iso = new Date().toISOString();
    const ticket: SupportTicket = {
      id,
      reference: `SUP-${Math.floor(1000 + Math.random() * 8999)}`,
      subject: body.subject,
      category: body.category,
      status: 'open',
      createdAt: iso,
      updatedAt: iso,
      lastMessage: body.body,
    };
    tickets = [ticket, ...tickets];
    messages[id] = [
      {
        id: `m${Date.now()}`,
        ticketId: id,
        author: 'customer',
        authorName: 'You',
        body: body.body,
        attachments: body.attachments ?? [],
        createdAt: iso,
      },
    ];
    return ticket;
  }
  return mapTicket(await supportApi.create(body), body.body);
}

/**
 * Posts a reply and returns BOTH the stored message and the refreshed ticket.
 *
 * The endpoint returns the ticket alongside the message because replying moves
 * its status, SLA and updatedAt — so the caller can update the header without a
 * second round-trip.
 */
export interface ReplyResult {
  message: TicketMessage;
  ticket?: SupportTicket;
}

export async function replyToTicket(
  id: string,
  body: string,
  attachments: string[] = [],
): Promise<ReplyResult> {
  if (APP.useMock) {
    await delay(300);
    const msg: TicketMessage = {
      id: `m${Date.now()}`,
      ticketId: id,
      author: 'customer',
      authorName: 'You',
      body,
      attachments,
      createdAt: new Date().toISOString(),
    };
    messages[id] = [...(messages[id] ?? []), msg];
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      ticket.lastMessage = body;
      ticket.updatedAt = msg.createdAt;
    }
    return { message: msg, ticket };
  }
  // `{ ticket, message }` — NOT a bare message. Reading the wrapper as a
  // message yields undefined for every field, which surfaces as blank bubbles
  // and a missing React key.
  const res = await supportApi.reply(id, body, attachments);
  return {
    message: mapTicketMessage(res.message, id),
    ticket: mapTicket(res.ticket),
  };
}

export async function rateTicket(id: string, rating: number): Promise<void> {
  if (APP.useMock) {
    await delay(300);
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) ticket.satisfactionRating = rating;
    return;
  }
  await supportApi.rate(id, rating);
}
