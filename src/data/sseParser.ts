/**
 * Server-Sent Events frame parser.
 *
 * Split out from `notificationStream.ts` so it carries no React Native
 * imports and can be compiled and tested on its own. It is also the part
 * most likely to be subtly wrong: frames arrive split across TCP reads, and
 * a parser that assumes each chunk is a whole frame works perfectly in
 * development and drops events under real network conditions.
 */

export interface SseEvent {
  event: string;
  data: string;
}

/**
 * Extracts complete frames from an accumulating buffer.
 *
 * Returns the events found plus the trailing partial text, which the caller
 * keeps and prepends to the next chunk. Anything after the last blank line is
 * deliberately NOT parsed — it may be half a frame still in flight.
 */
export function parseSseChunk(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];

  // Normalise CRLF first: the spec allows CR, LF or CRLF as line endings and
  // proxies rewrite them. Splitting on "\n\n" against a CRLF stream finds no
  // frame boundaries at all, so the buffer grows forever and nothing fires.
  const normalised = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = normalised.split('\n\n');

  // The last element is either empty (the buffer ended exactly on a
  // separator) or an incomplete frame. Either way, not ours yet.
  const rest = parts.pop() ?? '';

  for (const frame of parts) {
    let event = 'message';
    const dataLines: string[] = [];

    for (const line of frame.split('\n')) {
      // Comment frames (": keep-alive") exist only to stop proxies timing the
      // connection out. They carry no payload.
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) event = line.slice(6).trim();
      // Per the spec a frame may carry several data: lines, joined by newline.
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }

    if (dataLines.length) events.push({ event, data: dataLines.join('\n') });
  }

  return { events, rest };
}
