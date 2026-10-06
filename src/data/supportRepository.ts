import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
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
import { toUploadableImage } from './imageFormat';
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
const DOCUMENT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
] as const;

function promptAttachmentSource(): Promise<'library' | 'camera' | 'document' | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Add attachment',
      'Choose photos, videos, or a PDF document.',
      [
        { text: 'Photo library', onPress: () => resolve('library') },
        { text: 'Take photo', onPress: () => resolve('camera') },
        { text: 'Document (PDF)', onPress: () => resolve('document') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

async function pickDocumentAttachment(uploadPath: string): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [...DOCUMENT_MIMES],
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const mime = (asset.mimeType ?? 'application/octet-stream').toLowerCase();
  const name = asset.name || `attachment-${Date.now()}`;
  const isVideo = mime.startsWith('video/');
  const isPdf = mime === 'application/pdf';
  const isImage = mime.startsWith('image/');

  if (!isVideo && !isPdf && !isImage) {
    return { ok: false, message: 'Only JPEG, PNG, WebP, PDF, MP4, or MOV files can be attached.' };
  }

  const fileSize = asset.size ?? 0;
  if (fileSize > (isVideo ? MAX_ATTACHMENT_BYTES : MAX_IMAGE_BYTES)) {
    return {
      ok: false,
      message: isVideo ? 'Videos must be 50MB or smaller.' : 'Images and PDFs must be 10MB or smaller.',
    };
  }

  if (APP.useMock) {
    return { ok: true, attachment: { url: asset.uri, previewUri: asset.uri, name, kind: isPdf ? 'document' : isVideo ? 'video' : 'image' } };
  }

  try {
    const file = isImage
      ? await toUploadableImage({ uri: asset.uri, name, mimeType: mime })
      : { uri: asset.uri, name, mimeType: isPdf ? 'application/pdf' : mime };
    const url = await uploadMediaAttachment(file.uri, file.name, file.mimeType, uploadPath);
    const kind = isPdf ? 'document' : isVideo ? 'video' : 'image';
    return { ok: true, attachment: { url, previewUri: asset.uri, name: file.name, kind } };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not upload that file.' };
  }
}

export async function pickTicketAttachment(
  source: 'library' | 'camera' | 'choose' = 'choose',
  uploadPath = '/support/attachments/upload',
): Promise<PickResult> {
  let pickSource = source;
  if (source === 'choose') {
    const choice = await promptAttachmentSource();
    if (!choice) return null;
    if (choice === 'document') return pickDocumentAttachment(uploadPath);
    pickSource = choice;
  }

  const perm =
    pickSource === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!perm.granted) {
    return {
      ok: false,
      message:
        pickSource === 'camera'
          ? 'Camera access is needed to take a photo.'
          : 'Photo and video access is needed to attach media.',
    };
  }

  const result =
    pickSource === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, exif: false })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          quality: 0.8,
          exif: false,
          ...(Platform.OS === 'ios' ? { preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible } : {}),
        });

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

  // A local `file://` URI is not an attachment the API will accept — it only
  // stores URLs its own upload endpoint issued. Sending one produced the
  // opaque "Attachments must be uploaded via /support/attachments/upload"
  // from the server AFTER the customer had written the whole ticket. The
  // guard below (`isUploadedAttachment`) stops that reaching the wire.

  try {
    /*
      HEIC, converted before it reaches the wire.

      iPhones shoot HEIC and `expo-image-picker` passes it through untouched
      (its iOS source special-cases `UTType.heic` and returns the raw data),
      while converting most other formats to JPEG. The upload endpoints do
      not accept HEIC, so every camera-roll photo from an iPhone came back
      415 — and the same action on Android, which shoots JPEG, worked. See
      `toUploadableImage`.
    */
    const file =
      kind === 'video'
        ? { uri: asset.uri, name, mimeType: asset.mimeType ?? 'video/mp4' }
        : await toUploadableImage({
            uri: asset.uri,
            name,
            mimeType: asset.mimeType ?? 'image/jpeg',
          });

    const url = await uploadMediaAttachment(file.uri, file.name, file.mimeType, uploadPath);
    return { ok: true, attachment: { url, previewUri: asset.uri, name: file.name, kind } };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not upload that file.' };
  }
}


/**
 * Is this URL one the upload endpoint actually issued?
 *
 * The API stores only URLs it minted itself — an arbitrary-URL field would be
 * an injection sink in the staff console. A local `file://` or `content://`
 * URI therefore fails server-side validation, but only after the customer has
 * written the whole ticket and pressed send. Checking here turns that into a
 * message they can act on, before anything is lost.
 */
export function isUploadedAttachment(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
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
  const extra = await supportApi.messagesSince(id).catch(() => []);
  const byId = new Map<string, (typeof extra)[number]>();
  for (const message of [...(detail.messages ?? []), ...extra]) {
    byId.set(message.id, message);
  }
  const msgs = [...byId.values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((m) => mapTicketMessage(m, id));
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
