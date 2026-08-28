import * as DocumentPicker from 'expo-document-picker';
import { garageApi } from '../api/garage';
import { getToken } from '../api/session';
import { APP } from '../constants/app';

/**
 * Picking and uploading proof-of-ownership documents.
 *
 * Reached from the "we need more documents" notification, which is the only
 * thing standing between a blocked claim and a reviewed one — so the failure
 * modes matter more than usual. Every rejection below is surfaced with the
 * reason and the limit, because "Upload failed" on a 12 MB scan tells the
 * customer nothing they can act on.
 */

/** Matches the server's cap in `app/services/uploads.py`. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_MB = 10;

/** Matches the server allowlist in `ownership/storage.py`. */
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export interface PickedDocument {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export type DocumentPickResult =
  | { ok: true; document: PickedDocument }
  | { ok: false; message: string }
  /** Cancelled — not an error, show nothing. */
  | null;

/**
 * Opens the system picker for a PDF or image.
 *
 * Size is checked HERE as well as on the server. The server is the authority,
 * but letting a 30 MB scan upload over a mobile connection before rejecting it
 * wastes the customer's data and a minute of their time.
 */
export async function pickDocument(): Promise<DocumentPickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ACCEPTED_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  if (asset.size != null && asset.size > MAX_DOCUMENT_BYTES) {
    const mb = (asset.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      message: `That file is ${mb} MB. The limit is ${MAX_DOCUMENT_MB} MB — try a photo instead of a scan.`,
    };
  }

  const mimeType = asset.mimeType ?? 'application/octet-stream';
  if (!ACCEPTED_TYPES.includes(mimeType)) {
    return { ok: false, message: 'Only PDF, JPG and PNG files can be uploaded.' };
  }

  return {
    ok: true,
    document: {
      uri: asset.uri,
      name: asset.name || `document-${Date.now()}`,
      mimeType,
      size: asset.size ?? undefined,
    },
  };
}

/**
 * Uploads one document, reporting progress 0..1.
 *
 * XHR rather than `fetch` for one reason: fetch has no upload-progress event.
 * A 10 MB file over a Nigerian mobile connection is a genuinely slow operation,
 * and a spinner with no movement is indistinguishable from a hang — people
 * background the app and the upload dies.
 */
export function uploadDocument(
  doc: PickedDocument,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const token = await getToken();
    const form = new FormData();
    // React Native's FormData accepts this file-descriptor shape.
    form.append('file', {
      uri: doc.uri,
      name: doc.name,
      type: doc.mimeType,
    } as unknown as Blob);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${APP.apiBaseUrl.replace(/\/+$/, '')}/ownership/documents/upload`);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // Content-Type is deliberately NOT set: the runtime adds it with the
    // multipart boundary, and setting it by hand produces a body the server
    // cannot parse.

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.min(1, event.loaded / event.total));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { url?: string };
          if (data.url) {
            onProgress?.(1);
            resolve(data.url);
            return;
          }
        } catch {
          /* fall through to the error below */
        }
        reject(new Error('The server did not return a document link.'));
        return;
      }
      if (xhr.status === 413) {
        reject(new Error(`That file is too large (max ${MAX_DOCUMENT_MB} MB).`));
        return;
      }
      if (xhr.status === 415) {
        reject(new Error('Only PDF, JPG and PNG files can be uploaded.'));
        return;
      }
      if (xhr.status === 401) {
        reject(new Error('Your session has expired. Please sign in again.'));
        return;
      }
      reject(new Error('Could not upload that document. Please try again.'));
    };

    xhr.onerror = () => reject(new Error('No connection. Please check your network and try again.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));

    xhr.send(form);
  });
}

/** Attaches uploaded documents to the claim and returns the refreshed request. */
export async function submitDocuments(requestId: string, urls: string[]) {
  return garageApi.addDocuments(requestId, urls);
}

/** Is this a PDF, for choosing between a thumbnail and a file icon? */
export function isPdf(nameOrUrl: string): boolean {
  return /\.pdf($|\?)/i.test(nameOrUrl) || nameOrUrl === 'application/pdf';
}
