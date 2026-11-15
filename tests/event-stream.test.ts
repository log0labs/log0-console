// followInvestigation against a real local HTTP server that plays the ai-service's stream and events endpoints.
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  followInvestigation,
  isTerminal,
  mergeEvents,
  type ConnectionState,
} from "@/lib/event-stream";
import type { StreamEvent } from "@/types/investigation";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let server: Server;
let base: string;
let queue: Handler[] = [];
const requests: {
  url: string;
  auth?: string;
  lastEventId?: string;
  accept?: string;
}[] = [];

function event(
  seq: number,
  type = "evidence.added",
  payload: object = { id: `ev_${seq}` }
): StreamEvent {
  return {
    investigationId: "inv-1",
    seq,
    type,
    payload,
    createdAt: "2026-11-15T10:00:00Z",
  } as StreamEvent;
}

function frame(e: StreamEvent): string {
  return `id: ${e.seq}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`;
}

const sse =
  (...events: StreamEvent[]): Handler =>
  (_req, res) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    events.forEach((e) => res.write(frame(e)));
    res.end(); // the stream closes after these: a terminal event is what ends the run, not the close
  };
const status =
  (code: number): Handler =>
  (_req, res) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end("{}");
  };
const json =
  (value: unknown): Handler =>
  (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(value));
  };

beforeAll(async () => {
  server = createServer((req, res) => {
    requests.push({
      url: req.url ?? "",
      auth: req.headers.authorization,
      lastEventId: req.headers["last-event-id"] as string | undefined,
      accept: req.headers.accept,
    });
    (queue.shift() ?? status(500))(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(() => {
  queue = [];
  requests.length = 0;
});

interface Run {
  events: StreamEvent[];
  states: ConnectionState[];
  sleeps: number[];
  refreshes: number;
}

async function follow(
  overrides: Partial<Parameters<typeof followInvestigation>[0]> = {},
  controller = new AbortController()
): Promise<Run> {
  const run: Run = { events: [], states: [], sleeps: [], refreshes: 0 };
  await followInvestigation({
    streamUrl: `${base}/api/v1/investigations/inv-1/stream`,
    eventsUrl: `${base}/api/v1/investigations/inv-1/events`,
    afterSeq: 0,
    getToken: () => "tok-1",
    refreshToken: async () => {
      run.refreshes += 1;
      return "tok-2";
    },
    onEvents: (events) => run.events.push(...events),
    onState: (state) => run.states.push(state),
    signal: controller.signal,
    sleep: async (ms) => void run.sleeps.push(ms), // never really wait in tests
    ...overrides,
  });
  return run;
}

const seqs = (run: Run) => run.events.map((e) => e.seq);

describe("followInvestigation: the stream", () => {
  it("delivers events in order, sends the token, and stops at a terminal event", async () => {
    queue.push(
      sse(
        event(1, "investigation.started", {}),
        event(2),
        event(3, "investigation.completed", {})
      )
    );
    const run = await follow();

    expect(seqs(run)).toEqual([1, 2, 3]);
    expect(run.states).toEqual(["connecting", "live", "closed"]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      auth: "Bearer tok-1",
      accept: "text/event-stream",
    });
    expect(requests[0].lastEventId).toBeUndefined(); // nothing is known yet
  });

  it("asks for events after the ones it already has", async () => {
    queue.push(sse(event(8, "investigation.completed", {})));
    const run = await follow({ afterSeq: 7 });
    expect(requests[0].lastEventId).toBe("7");
    expect(seqs(run)).toEqual([8]);
  });

  it("reconnects with Last-Event-ID when the stream drops, without losing or repeating an event", async () => {
    queue.push(sse(event(1), event(2))); // closes with no terminal event
    queue.push(sse(event(3), event(4, "investigation.completed", {})));
    const run = await follow();

    expect(seqs(run)).toEqual([1, 2, 3, 4]);
    expect(requests.map((r) => r.lastEventId)).toEqual([undefined, "2"]);
    expect(run.states).toEqual([
      "connecting",
      "live",
      "reconnecting",
      "live",
      "closed",
    ]);
    expect(run.sleeps).toHaveLength(1);
  });

  it("drops an event the server repeats after a reconnect", async () => {
    queue.push(sse(event(1), event(2)));
    queue.push(sse(event(2), event(3, "investigation.completed", {})));
    expect(seqs(await follow())).toEqual([1, 2, 3]);
  });

  it("ignores heartbeats, a frame that is not JSON, and a frame that is not an event", async () => {
    queue.push((_req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(": keep-alive\n\n");
      res.write("event: garbage\ndata: {not json\n\n");
      res.write('event: odd\ndata: {"hello":"world"}\n\n'); // no seq, no type
      res.write(frame(event(1)));
      res.write(frame(event(2, "investigation.failed", { error: "x" })));
      res.end();
    });
    expect(seqs(await follow())).toEqual([1, 2]);
  });

  it("reads a frame that arrives in two pieces", async () => {
    queue.push((_req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const text = frame(event(1, "investigation.completed", {}));
      res.write(text.slice(0, 15));
      setTimeout(() => {
        res.write(text.slice(15));
        res.end();
      }, 30);
    });
    expect(seqs(await follow())).toEqual([1]);
  });

  it("stays on a review that is waiting: AWAITING_REVIEW is not the end", async () => {
    queue.push(sse(event(1), event(2, "review.requested", { round: 1 }))); // closes, but the run is not over
    queue.push(
      sse(
        event(3, "review.decided", { action: "approve" }),
        event(4, "investigation.completed", {})
      )
    );
    const run = await follow();
    expect(seqs(run)).toEqual([1, 2, 3, 4]);
    expect(requests).toHaveLength(2);
  });
});

describe("followInvestigation: trouble", () => {
  it("refreshes the token once on a 401 and carries on", async () => {
    queue.push(status(401));
    queue.push(sse(event(1, "investigation.completed", {})));
    const run = await follow();

    expect(run.refreshes).toBe(1);
    expect(requests.map((r) => r.auth)).toEqual([
      "Bearer tok-1",
      "Bearer tok-2",
    ]);
    expect(seqs(run)).toEqual([1]);
  });

  it("gives up when the session is gone (refresh returns nothing)", async () => {
    queue.push(status(401));
    const run = await follow({ refreshToken: async () => null });
    expect(run.states.at(-1)).toBe("error");
    expect(requests).toHaveLength(1);
  });

  it.each([404, 403])("stops on a %s: retrying cannot help", async (code) => {
    queue.push(status(code));
    const run = await follow();
    expect(run.states.at(-1)).toBe("error");
    expect(requests).toHaveLength(1);
    expect(run.events).toEqual([]);
  });

  it("backs off between failed connections, with growing waits", async () => {
    queue.push(
      status(502),
      status(502),
      sse(event(1, "investigation.completed", {}))
    );
    const run = await follow({ backoffMs: (attempt) => attempt * 100 });
    expect(run.sleeps).toEqual([100, 200]);
    expect(seqs(run)).toEqual([1]);
  });

  it("falls back to polling after repeated failures and follows the run to its end", async () => {
    queue.push(status(502), status(502), status(502)); // three failed connections
    queue.push(json([event(1), event(2)]));
    queue.push(json([])); // nothing new this time
    queue.push(json([event(3, "investigation.completed", {})]));
    const run = await follow({ maxStreamFailures: 3, pollIntervalMs: 1234 });

    expect(seqs(run)).toEqual([1, 2, 3]);
    expect(run.states).toContain("polling");
    expect(run.states.at(-1)).toBe("closed");
    const polls = requests.slice(3);
    expect(polls.map((p) => p.url.replace(/^.*\/events/, ""))).toEqual([
      "?after=0&limit=500",
      "?after=2&limit=500",
      "?after=2&limit=500",
    ]);
    expect(polls[0]).toMatchObject({
      auth: "Bearer tok-1",
      accept: "application/json",
    });
    expect(run.sleeps.filter((ms) => ms === 1234)).toHaveLength(2); // waits between polls, not after the last
  });

  it("keeps polling through a failed poll", async () => {
    queue.push(
      json([event(1)]),
      status(500),
      json([event(2, "investigation.completed", {})])
    );
    const run = await follow({ maxStreamFailures: 0 });
    expect(seqs(run)).toEqual([1, 2]);
  });

  it("a poll that finds the investigation missing ends with an error", async () => {
    queue.push(status(404));
    const run = await follow({ maxStreamFailures: 0 });
    expect(run.states.at(-1)).toBe("error");
  });

  it("stops at once when aborted, including in the middle of a stream", async () => {
    const controller = new AbortController();
    queue.push((_req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(frame(event(1)));
      // never ends: the client has to leave
    });
    const running = follow({}, controller);
    for (let i = 0; i < 100 && requests.length === 0; i++)
      await new Promise((r) => setTimeout(r, 10));
    await new Promise((r) => setTimeout(r, 50));
    controller.abort();
    const run = await running;
    expect(seqs(run)).toEqual([1]);
    expect(requests).toHaveLength(1); // no reconnect after an abort
  });

  it("does nothing when it is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const run = await follow({}, controller);
    expect(requests).toHaveLength(0);
    expect(run.events).toEqual([]);
  });
});

describe("mergeEvents and isTerminal", () => {
  it("keeps one copy of each sequence number, in order", () => {
    const merged = mergeEvents(
      [event(2), event(1)],
      [event(3), event(2, "other"), event(0)]
    );
    expect(merged.map((e) => e.seq)).toEqual([0, 1, 2, 3]);
    expect(merged.find((e) => e.seq === 2)?.type).toBe("evidence.added"); // the first copy wins
  });

  it("returns the same array when there is nothing to add", () => {
    const existing = [event(1)];
    expect(mergeEvents(existing, [])).toBe(existing);
  });

  it("recognises the three terminal events only", () => {
    for (const type of [
      "investigation.completed",
      "investigation.failed",
      "investigation.cancelled",
    ]) {
      expect(isTerminal([event(1), event(2, type, {})])).toBe(true);
    }
    expect(
      isTerminal([
        event(1, "review.requested", {}),
        event(2, "investigation.started", {}),
      ])
    ).toBe(false);
    expect(isTerminal([])).toBe(false);
  });
});
