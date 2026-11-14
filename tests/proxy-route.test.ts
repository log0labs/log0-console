// The real route handler against a real local HTTP server standing in for the ai-service.
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let upstream: Server;
let port: number;
const seen: {
  url?: string;
  auth?: string | string[];
  lastEventId?: string | string[];
  body?: string;
}[] = [];
let streamClosedByClient = false;
let releaseStream: (() => void) | undefined;

function handle(req: IncomingMessage, res: ServerResponse) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    seen.push({
      url: req.url,
      auth: req.headers.authorization,
      lastEventId: req.headers["last-event-id"],
      body,
    });
    if (req.url?.endsWith("/stream")) {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      });
      res.write("id: 1\nevent: investigation.started\ndata: {}\n\n"); // sent at once...
      res.on("close", () => (streamClosedByClient = true));
      releaseStream = () => {
        res.write("id: 2\nevent: investigation.completed\ndata: {}\n\n"); // ...and this one only when the test says so
        res.end();
      };
      return;
    }
    res.writeHead(req.url?.includes("missing") ? 404 : 202, {
      "content-type": "application/json",
      "x-upstream": "yes",
    });
    res.end(JSON.stringify({ ok: true }));
  });
}

beforeAll(async () => {
  upstream = createServer(handle);
  await new Promise<void>((resolve) =>
    upstream.listen(0, "127.0.0.1", resolve)
  );
  port = (upstream.address() as AddressInfo).port;
  process.env.AI_API_URL = `http://127.0.0.1:${port}`;
  process.env.AUTH_API_URL = "";
  process.env.INCIDENTS_API_URL = "";
});

afterAll(async () => {
  upstream.closeAllConnections();
  await new Promise<void>((resolve) => upstream.close(() => resolve()));
});

async function route() {
  return await import("@/app/api/v1/[...path]/route");
}

function request(
  path: string,
  init?: ConstructorParameters<typeof NextRequest>[1]
) {
  return new NextRequest(`http://console.test/api/v1/${path}`, init);
}

describe("the proxy route", () => {
  it("forwards an ai-service call with its method, query, body and Authorization header", async () => {
    const { POST } = await route();
    const response = await POST(
      request("investigations/abc/resume?x=1", {
        method: "POST",
        headers: {
          authorization: "Bearer t0k3n",
          "content-type": "application/json",
        },
        body: '{"action":"approve"}',
      }),
      { params: Promise.resolve({ path: ["investigations", "abc", "resume"] }) }
    );
    expect(response.status).toBe(202);
    expect(response.headers.get("x-upstream")).toBe("yes");
    expect(await response.json()).toEqual({ ok: true });
    const call = seen.at(-1);
    expect(call).toMatchObject({
      url: "/api/v1/investigations/abc/resume?x=1",
      auth: "Bearer t0k3n",
      body: '{"action":"approve"}',
    });
  });

  it("passes the upstream status through", async () => {
    const { GET } = await route();
    const response = await GET(request("investigations/missing"), {
      params: Promise.resolve({ path: ["investigations", "missing"] }),
    });
    expect(response.status).toBe(404);
  });

  it("streams server-sent events as they arrive instead of buffering them", async () => {
    const { GET } = await route();
    const response = await GET(
      request("investigations/abc/stream", {
        headers: {
          authorization: "Bearer t0k3n",
          "last-event-id": "7",
          accept: "text/event-stream",
        },
      }),
      { params: Promise.resolve({ path: ["investigations", "abc", "stream"] }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("cache-control")).toBe(
      "no-cache, no-transform"
    );
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(seen.at(-1)).toMatchObject({
      auth: "Bearer t0k3n",
      lastEventId: "7",
    }); // the reconnect position reaches the service

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const first = decoder.decode((await reader.read()).value);
    expect(first).toContain("event: investigation.started"); // arrived while the upstream is still open
    expect(first).not.toContain("investigation.completed");

    releaseStream!();
    let rest = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      rest += decoder.decode(value);
    }
    expect(rest).toContain("event: investigation.completed");
  });

  it("closes the upstream stream when the browser goes away", async () => {
    const { GET } = await route();
    streamClosedByClient = false;
    const controller = new AbortController();
    const response = await GET(
      request("investigations/abc/stream", { signal: controller.signal }),
      { params: Promise.resolve({ path: ["investigations", "abc", "stream"] }) }
    );
    const reader = response.body!.getReader();
    await reader.read();
    controller.abort();
    await reader.cancel().catch(() => undefined);
    for (let i = 0; i < 50 && !streamClosedByClient; i++)
      await new Promise((r) => setTimeout(r, 20));
    expect(streamClosedByClient).toBe(true);
  });

  it("refuses a path that would climb out of the api prefix, without calling any backend", async () => {
    const { GET } = await route();
    const before = seen.length;
    for (const path of [
      ["investigations", ".."],
      ["..", "admin"],
      ["investigations", "a/b"],
    ]) {
      const response = await GET(request("investigations/x"), {
        params: Promise.resolve({ path }),
      });
      expect(response.status).toBe(400);
    }
    expect(seen.length).toBe(before);
  });

  it("says so when the backend for a path is not configured", async () => {
    const { GET } = await route();
    const response = await GET(request("users"), {
      params: Promise.resolve({ path: ["users"] }),
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Backend URL not configured",
    });
  });

  it("answers 502 when the upstream cannot be reached", async () => {
    const { GET } = await route();
    const saved = process.env.AI_API_URL;
    process.env.AI_API_URL = "http://127.0.0.1:1";
    try {
      const response = await GET(request("investigations"), {
        params: Promise.resolve({ path: ["investigations"] }),
      });
      expect(response.status).toBe(502);
    } finally {
      process.env.AI_API_URL = saved;
    }
  });
});
