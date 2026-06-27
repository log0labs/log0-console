// Lightweight backend reachability probe for the console's connection banner.
// Server-side fetch to the incident service's actuator health through the same
// tunnel the app uses. Returns ok:true (200) or ok:false (503) - never throws.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INCIDENTS_API_URL = process.env.INCIDENTS_API_URL ?? "";

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${INCIDENTS_API_URL}/actuator/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}
