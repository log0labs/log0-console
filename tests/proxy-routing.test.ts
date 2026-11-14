import { describe, expect, it } from "vitest";
import {
  buildTarget,
  isEventStream,
  isSafeSegments,
  streamHeaders,
  targetBase,
} from "@/lib/proxy-routing";

const backends = {
  auth: "http://auth",
  incidents: "http://incidents",
  ai: "http://ai",
};

describe("targetBase", () => {
  it.each([
    [["incidents", "abc"], "http://incidents"],
    [["logs"], "http://incidents"],
    [["investigations"], "http://ai"],
    [["investigations", "42", "stream"], "http://ai"],
    [["repositories"], "http://ai"],
    [["service-repositories", "payment-service"], "http://ai"],
    [["ai-settings", "investigation", "test"], "http://ai"],
    [["auth", "login"], "http://auth"],
    [["users"], "http://auth"],
    [["api-keys"], "http://auth"],
  ])("%j goes to %s", (segments, expected) => {
    expect(targetBase(segments, backends)).toBe(expected);
  });

  it("sends an unknown first segment to the auth service as before, and an empty path too", () => {
    expect(targetBase(["something-else"], backends)).toBe("http://auth");
    expect(targetBase([], backends)).toBe("http://auth");
  });

  it("does not treat a lookalike as an ai route", () => {
    expect(targetBase(["investigations-admin"], backends)).toBe("http://auth");
    expect(targetBase(["Investigations"], backends)).toBe("http://auth");
  });
});

describe("isSafeSegments", () => {
  it("accepts ordinary paths", () => {
    expect(isSafeSegments(["investigations"])).toBe(true);
    expect(
      isSafeSegments([
        "investigations",
        "c9d8e7f6-a5b4-4c3d-8e1f-0a9b8c7d6e5f",
        "resume",
      ])
    ).toBe(true);
    expect(isSafeSegments(["service-repositories", "payment service"])).toBe(
      true
    );
  });

  it.each([
    [[]],
    [[""]],
    [["investigations", ""]],
    [["investigations", ".."]],
    [["..", "admin"]],
    [["."]],
    [["a/b"]],
    [["a\\b"]],
    [["a\u0000b"]],
    [["a\nb"]],
    [["a\u007fb"]],
  ])("refuses %j", (segments) => {
    expect(isSafeSegments(segments)).toBe(false);
  });
});

describe("buildTarget", () => {
  it("joins base, api prefix, segments and the query string", () => {
    expect(
      buildTarget("http://ai", ["investigations", "1", "events"], "?after=5")
    ).toBe("http://ai/api/v1/investigations/1/events?after=5");
    expect(buildTarget("http://ai", ["investigations"], "")).toBe(
      "http://ai/api/v1/investigations"
    );
  });

  it("tolerates a trailing slash on the base", () => {
    expect(buildTarget("http://ai/", ["x"], "")).toBe("http://ai/api/v1/x");
    expect(buildTarget("http://ai///", ["x"], "")).toBe("http://ai/api/v1/x");
  });

  it("encodes each segment so it cannot change the path", () => {
    expect(
      buildTarget("http://ai", ["service-repositories", "a b?c#d"], "")
    ).toBe("http://ai/api/v1/service-repositories/a%20b%3Fc%23d");
    expect(buildTarget("http://ai", ["a%2fb"], "")).toBe(
      "http://ai/api/v1/a%252fb"
    );
  });
});

describe("isEventStream", () => {
  it.each([
    ["text/event-stream", true],
    ["text/event-stream; charset=utf-8", true],
    ["TEXT/EVENT-STREAM", true],
    ["application/json", false],
    ["text/plain", false],
    ["", false],
    [null, false],
  ])("%j -> %s", (value, expected) => {
    expect(isEventStream(value as string | null)).toBe(expected);
  });
});

describe("streamHeaders", () => {
  it("keeps the content type, drops the hop-by-hop headers and forbids caching and buffering", () => {
    const headers = streamHeaders(
      new Headers({
        "content-type": "text/event-stream",
        "transfer-encoding": "chunked",
        "content-length": "10",
        connection: "keep-alive",
        "content-encoding": "gzip",
        "x-request-id": "r1",
      })
    );
    expect(headers.get("content-type")).toBe("text/event-stream");
    expect(headers.get("x-request-id")).toBe("r1");
    for (const name of [
      "transfer-encoding",
      "content-length",
      "connection",
      "content-encoding",
    ]) {
      expect(headers.has(name)).toBe(false);
    }
    expect(headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(headers.get("x-accel-buffering")).toBe("no");
  });
});
