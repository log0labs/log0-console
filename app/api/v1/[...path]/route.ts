// Server-side proxy for all /api/v1/* calls to the backend services.
//
// Replaces the next.config.mjs rewrites, which 500 on Vercel when the external
// origin returns a 200 with Transfer-Encoding: chunked (no Content-Length).
// A Route Handler buffers the upstream response and returns a clean Response,
// so the browser still only ever talks to the console origin (no CORS, cookies
// stay first-party).
//
// Routing (lib/proxy-routing.ts):
//   /api/v1/incidents/* and /api/v1/logs                    -> INCIDENTS_API_URL
//   /api/v1/investigations, repositories, service-repositories, ai-settings -> AI_API_URL
//   everything else (auth, tenants, users, api-keys)        -> AUTH_API_URL
//
// Streaming: an investigation's progress arrives as Server-Sent Events. When the upstream
// answers `text/event-stream` the body is passed through as it arrives, unbuffered, and the
// upstream request is aborted as soon as the browser disconnects.

import type { NextRequest } from "next/server";
import {
  STRIP_REQUEST,
  STRIP_RESPONSE,
  buildTarget,
  isEventStream,
  isSafeSegments,
  streamHeaders,
  targetBase,
} from "@/lib/proxy-routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A stream stays open while an investigation runs (up to its 5 minute budget).
export const maxDuration = 300;

function backends() {
  return {
    auth: process.env.AUTH_API_URL ?? "",
    incidents: process.env.INCIDENTS_API_URL ?? "",
    ai: process.env.AI_API_URL ?? "",
  };
}

async function proxy(req: NextRequest, segments: string[]): Promise<Response> {
  if (!isSafeSegments(segments)) {
    return Response.json({ error: "Bad request path" }, { status: 400 });
  }
  const base = targetBase(segments, backends());
  if (!base) {
    return Response.json(
      { error: "Backend URL not configured" },
      { status: 500 }
    );
  }

  const target = buildTarget(base, segments, new URL(req.url).search);

  const headers = new Headers(req.headers);
  STRIP_REQUEST.forEach((h) => headers.delete(h));

  // `signal`: when the browser goes away (closes the tab, navigates), the upstream
  // request, and with it a long-lived stream, is cancelled instead of leaking.
  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    signal: req.signal,
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    return Response.json(
      { error: "Upstream request failed", detail: String(err) },
      { status: 502 }
    );
  }

  if (isEventStream(upstream.headers.get("content-type")) && upstream.body) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: streamHeaders(upstream.headers),
    });
  }

  const respHeaders = new Headers(upstream.headers);
  STRIP_RESPONSE.forEach((h) => respHeaders.delete(h));

  const body = await upstream.arrayBuffer();
  return new Response(body, { status: upstream.status, headers: respHeaders });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
