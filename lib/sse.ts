// A Server-Sent Events frame parser, written by hand because the browser's EventSource cannot send an
// Authorization header, so the console reads the stream with fetch() and parses the frames itself.
//
// Format (https://html.spec.whatwg.org/multipage/server-sent-events.html): frames are separated by a
// blank line; each line is `field: value`; a line starting with `:` is a comment (a heartbeat); several
// `data:` lines of one frame are joined with a newline. Lines end with \n, \r\n or \r, and a chunk from
// the network can end anywhere, even between the \r and the \n.

export interface SseMessage {
  /** The `id:` of the frame, if any (used as Last-Event-ID when reconnecting). */
  id: string | null;
  /** The `event:` name; "message" when the frame has none. */
  event: string;
  data: string;
}

export interface SseParser {
  /** Feed the next piece of text from the stream. Complete frames are passed to `onMessage`. */
  feed(chunk: string): void;
  /** Call when the stream ends: a final frame without its closing blank line is still delivered. */
  end(): void;
}

export function createSseParser(
  onMessage: (message: SseMessage) => void
): SseParser {
  let buffer = "";
  let event = "";
  let data: string[] = [];
  let sawField = false;
  let lastId: string | null = null; // the stream's last event id persists across frames

  function dispatch() {
    if (data.length > 0 || event !== "") {
      onMessage({
        id: lastId,
        event: event || "message",
        data: data.join("\n"),
      });
    }
    event = "";
    data = [];
    sawField = false;
  }

  function processLine(line: string) {
    if (line === "") {
      if (sawField) dispatch();
      return;
    }
    if (line.startsWith(":")) return; // comment / heartbeat
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    switch (field) {
      case "event":
        event = value;
        sawField = true;
        break;
      case "data":
        data.push(value);
        sawField = true;
        break;
      case "id":
        if (!value.includes("\u0000")) lastId = value;
        sawField = true;
        break;
      default:
        break; // "retry" and unknown fields are ignored
    }
  }

  return {
    feed(chunk: string) {
      buffer += chunk;
      // A lone "\r" at the very end may be the first half of "\r\n": wait for the next chunk.
      const hold = buffer.endsWith("\r") ? 1 : 0;
      const ready = buffer.slice(0, buffer.length - hold);
      const lines = ready.split(/\r\n|\n|\r/);
      buffer = lines.pop()! + buffer.slice(buffer.length - hold);
      lines.forEach(processLine);
    },
    end() {
      if (buffer !== "") processLine(buffer.replace(/\r$/, ""));
      buffer = "";
      if (sawField) dispatch();
    },
  };
}
