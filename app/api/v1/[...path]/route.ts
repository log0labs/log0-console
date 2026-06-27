// Server-side proxy for all /api/v1/* calls to the backend services.
//
// Replaces the next.config.mjs rewrites, which 500 on Vercel when the external
// origin returns a 200 with Transfer-Encoding: chunked (no Content-Length).
// A Route Handler buffers the upstream response and returns a clean Response,
// so the browser still only ever talks to the console origin (no CORS, cookies
// stay first-party).
//
// Routing: /api/v1/incidents/* and /api/v1/logs -> INCIDENTS_API_URL,
// everything else (auth, tenants, users, api-keys) -> AUTH_API_URL.

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTH_API_URL = process.env.AUTH_API_URL ?? "";
const INCIDENTS_API_URL = process.env.INCIDENTS_API_URL ?? "";

// Hop-by-hop / encoding headers that must not be forwarded verbatim.
const STRIP_REQUEST = ["host", "connection", "content-length"];
const STRIP_RESPONSE = ["transfer-encoding", "content-encoding", "content-length", "connection"];

function targetBase(segments: string[]): string {
  const first = segments[0];
  if (first === "incidents" || first === "logs") return INCIDENTS_API_URL;
  return AUTH_API_URL;
}

async function proxy(req: NextRequest, segments: string[]): Promise<Response> {
  const base = targetBase(segments);
  if (!base) {
    return Response.json({ error: "Backend URL not configured" }, { status: 500 });
  }

  const search = new URL(req.url).search;
  const target = `${base}/api/v1/${segments.join("/")}${search}`;

  const headers = new Headers(req.headers);
  STRIP_REQUEST.forEach((h) => headers.delete(h));

  const init: RequestInit = { method: req.method, headers, redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    return Response.json(
      { error: "Upstream request failed", detail: String(err) },
      { status: 502 },
    );
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
