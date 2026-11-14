// Pure helpers for the API proxy route (app/api/v1/[...path]/route.ts).
//
// They live here, not in the route file, so they can be unit-tested without a server:
// which backend a path goes to, whether a path is safe to forward, and whether a response
// is a Server-Sent Events stream that must be passed through unbuffered.

export interface Backends {
  auth: string;
  incidents: string;
  ai: string;
}

const INCIDENT_SEGMENTS = new Set(["incidents", "logs"]);

// ai-service routes (the paths the service really exposes; see its API in the architecture doc).
const AI_SEGMENTS = new Set([
  "investigations",
  "repositories",
  "service-repositories",
  "ai-settings",
]);

/** The backend a path belongs to, by its first segment. Auth is the default, as before. */
export function targetBase(segments: string[], backends: Backends): string {
  const first = segments[0];
  if (first && INCIDENT_SEGMENTS.has(first)) return backends.incidents;
  if (first && AI_SEGMENTS.has(first)) return backends.ai;
  return backends.auth;
}

/**
 * A path is forwarded only if every segment is an ordinary name. A decoded `..`, a segment
 * holding a slash or a backslash, or a control character could otherwise change where the
 * request lands on the upstream (the segments are joined into a URL).
 */
export function isSafeSegments(segments: string[]): boolean {
  if (segments.length === 0) return false;
  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment !== "." &&
      segment !== ".." &&
      !/[/\\\u0000-\u001f\u007f]/.test(segment)
  );
}

/** `<base>/api/v1/<segments>` plus the original query string, with each segment URL-encoded. */
export function buildTarget(
  base: string,
  segments: string[],
  search: string
): string {
  return `${base.replace(/\/+$/, "")}/api/v1/${segments.map(encodeURIComponent).join("/")}${search}`;
}

/** True when an upstream response is a Server-Sent Events stream (it must not be buffered). */
export function isEventStream(contentType: string | null): boolean {
  return (contentType ?? "").toLowerCase().startsWith("text/event-stream");
}

// Hop-by-hop / encoding headers that must not be forwarded verbatim.
export const STRIP_REQUEST = ["host", "connection", "content-length"];
export const STRIP_RESPONSE = [
  "transfer-encoding",
  "content-encoding",
  "content-length",
  "connection",
];

/** Headers for a streamed response: nothing may cache, transform or buffer it on the way to the browser. */
export function streamHeaders(upstream: Headers): Headers {
  const headers = new Headers(upstream);
  STRIP_RESPONSE.forEach((name) => headers.delete(name));
  headers.set("cache-control", "no-cache, no-transform");
  headers.set("x-accel-buffering", "no");
  return headers;
}
