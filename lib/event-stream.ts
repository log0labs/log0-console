// Follow an investigation's events: read the live stream, reconnect when it drops, and fall back to polling.
//
// Why not EventSource: it cannot send an Authorization header, and the ai-service needs the user's token.
// So the stream is read with fetch(), the frames are parsed by lib/sse.ts, and everything that can go wrong
// with a long-lived connection is handled here, in plain code with no React in it (the hook in
// hooks/use-investigation-events.ts is a thin wrapper), so it can be tested against a real HTTP server.
//
//  * The service sends every event with its sequence number (`id:`). After a drop we reconnect with
//    `Last-Event-ID`, and the service resumes right after it: nothing is missed, nothing repeats.
//  * A 401 means the access token expired: refresh it once and try again.
//  * 404 or 403: the investigation is not there or not ours; retrying cannot help, so stop and say so.
//  * After several failed connections in a row (a proxy that buffers, a network that cuts streams) switch to
//    polling `/events?after=<seq>`, which works anywhere ordinary requests do.
//  * The run is over when a terminal event arrives (completed, failed, cancelled). A review that is waiting
//    for a decision is not terminal: the stream stays open.

import { createSseParser } from "@/lib/sse";
import { TERMINAL_EVENT_TYPES, type StreamEvent } from "@/types/investigation";

export type ConnectionState =
  | "connecting"
  | "live"
  | "reconnecting"
  | "polling"
  | "closed"
  | "error";

export interface FollowOptions {
  /** `/api/v1/investigations/{id}/stream` */
  streamUrl: string;
  /** `/api/v1/investigations/{id}/events` (the polling fallback; `?after=<seq>` is added) */
  eventsUrl: string;
  /** The events already known: only newer ones are requested. */
  afterSeq: number;
  getToken: () => string | null;
  /** Returns a fresh access token after a 401, or null if the session is gone. */
  refreshToken: () => Promise<string | null>;
  onEvents: (events: StreamEvent[]) => void;
  onState?: (state: ConnectionState) => void;
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Consecutive failed connections before polling takes over. */
  maxStreamFailures?: number;
  backoffMs?: (attempt: number) => number;
  pollIntervalMs?: number;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

const defaultBackoff = (attempt: number) =>
  Math.min(500 * 2 ** (attempt - 1), 8000);

export function sleepUnlessAborted(
  ms: number,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", done);
      resolve();
    }, ms);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", done, { once: true });
  });
}

/** Add `events` to `existing`: sorted by sequence number, each sequence number once (the first copy wins). */
export function mergeEvents(
  existing: StreamEvent[],
  incoming: StreamEvent[]
): StreamEvent[] {
  if (incoming.length === 0) return existing;
  const bySeq = new Map<number, StreamEvent>();
  for (const event of existing) bySeq.set(event.seq, event);
  for (const event of incoming)
    if (!bySeq.has(event.seq)) bySeq.set(event.seq, event);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

export function isTerminal(events: StreamEvent[]): boolean {
  return events.some((event) => TERMINAL_EVENT_TYPES.includes(event.type));
}

function parseEvent(data: string): StreamEvent | null {
  try {
    const value = JSON.parse(data) as Partial<StreamEvent>;
    if (typeof value.seq === "number" && typeof value.type === "string")
      return value as StreamEvent;
  } catch {
    /* a frame that is not JSON is skipped: one bad frame must not end the stream */
  }
  return null;
}

/**
 * Follow the investigation until it ends (a terminal event), the signal aborts, or it cannot be followed.
 * Resolves in all three cases; never throws.
 */
export async function followInvestigation(
  options: FollowOptions
): Promise<void> {
  const {
    streamUrl,
    eventsUrl,
    getToken,
    refreshToken,
    onEvents,
    onState = () => undefined,
    signal,
    fetchImpl = fetch,
    maxStreamFailures = 3,
    backoffMs = defaultBackoff,
    pollIntervalMs = 3000,
    sleep = sleepUnlessAborted,
  } = options;

  let seq = options.afterSeq;
  let token = getToken();

  /** Deliver events, advance the position, and say whether the run is over. */
  function deliver(events: StreamEvent[]): boolean {
    const fresh = events.filter((event) => event.seq > seq);
    if (fresh.length === 0) return false;
    seq = Math.max(seq, ...fresh.map((event) => event.seq));
    onEvents(fresh);
    return isTerminal(fresh);
  }

  async function authorizedFetch(
    url: string,
    headers: Record<string, string>
  ): Promise<Response> {
    const send = () =>
      fetchImpl(url, {
        headers: {
          ...headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal,
      });
    let response = await send();
    if (response.status === 401) {
      token = await refreshToken();
      if (!token) throw new HttpError(401);
      response = await send();
    }
    if (!response.ok) throw new HttpError(response.status);
    return response;
  }

  /** One connection to the stream. Returns true when the run is over. */
  async function readStream(): Promise<{ over: boolean; gotEvents: boolean }> {
    const headers: Record<string, string> = { Accept: "text/event-stream" };
    if (seq > 0) headers["Last-Event-ID"] = String(seq);
    const response = await authorizedFetch(streamUrl, headers);
    if (!response.body) throw new HttpError(502);
    onState("live");

    let over = false;
    let gotEvents = false;
    const parser = createSseParser((message) => {
      const event = parseEvent(message.data);
      if (event && deliver([event])) over = true;
      if (event) gotEvents = true;
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
        if (over) break;
      }
      parser.end();
    } finally {
      reader.cancel().catch(() => undefined);
    }
    return { over, gotEvents };
  }

  async function poll(): Promise<void> {
    onState("polling");
    while (!signal.aborted) {
      try {
        const response = await authorizedFetch(
          `${eventsUrl}?after=${seq}&limit=500`,
          { Accept: "application/json" }
        );
        const events = (await response.json()) as StreamEvent[];
        if (deliver(events)) return onState("closed");
      } catch (error) {
        if (signal.aborted) return;
        if (
          error instanceof HttpError &&
          (error.status === 404 || error.status === 403 || error.status === 401)
        ) {
          return onState("error");
        }
        // anything else (network, 5xx): wait and ask again
      }
      await sleep(pollIntervalMs, signal);
    }
  }

  let failures = 0;
  onState("connecting");
  while (!signal.aborted) {
    if (failures >= maxStreamFailures) return poll();
    try {
      const { over, gotEvents } = await readStream();
      if (over) return onState("closed");
      // The stream ended without a terminal event (the server or something on the way closed it): ask again.
      failures = gotEvents ? 0 : failures + 1;
    } catch (error) {
      if (signal.aborted) return;
      if (
        error instanceof HttpError &&
        (error.status === 404 || error.status === 403 || error.status === 401)
      ) {
        return onState("error");
      }
      failures += 1;
    }
    if (signal.aborted) return;
    onState("reconnecting");
    await sleep(backoffMs(Math.max(failures, 1)), signal);
  }
}
