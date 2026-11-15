import { describe, expect, it } from "vitest";
import { createSseParser, type SseMessage } from "@/lib/sse";

function parse(...chunks: string[]): SseMessage[] {
  const out: SseMessage[] = [];
  const parser = createSseParser((m) => out.push(m));
  chunks.forEach((c) => parser.feed(c));
  parser.end();
  return out;
}

describe("createSseParser", () => {
  it("parses the frames the ai-service sends", () => {
    const frame =
      'id: 3\nevent: evidence.added\ndata: {"id":"ev_1","kind":"log"}\n\n';
    expect(parse(frame)).toEqual([
      { id: "3", event: "evidence.added", data: '{"id":"ev_1","kind":"log"}' },
    ]);
  });

  it("parses several frames in one chunk, in order", () => {
    const messages = parse(
      "id: 1\nevent: a\ndata: x\n\nid: 2\nevent: b\ndata: y\n\n"
    );
    expect(messages.map((m) => [m.id, m.event, m.data])).toEqual([
      ["1", "a", "x"],
      ["2", "b", "y"],
    ]);
  });

  it("handles a chunk that ends anywhere, byte by byte", () => {
    const text =
      "id: 7\nevent: gap.recorded\ndata: one\ndata: two\n\nid: 8\nevent: x\ndata: y\n\n";
    expect(parse(...text.split(""))).toEqual(parse(text));
    expect(parse(...text.split(""))).toHaveLength(2);
  });

  it("joins several data lines with a newline", () => {
    expect(parse("event: m\ndata: line one\ndata: line two\n\n")[0].data).toBe(
      "line one\nline two"
    );
  });

  it("accepts CRLF and bare CR line endings, even split between chunks", () => {
    expect(parse("event: a\r\ndata: x\r\n\r\n")[0]).toMatchObject({
      event: "a",
      data: "x",
    });
    expect(parse("event: a\rdata: x\r\r")[0]).toMatchObject({
      event: "a",
      data: "x",
    });
    expect(parse("event: a\r", "\ndata: x\r", "\n\r", "\n")[0]).toMatchObject({
      event: "a",
      data: "x",
    });
  });

  it("ignores comments, which the service sends as heartbeats", () => {
    expect(parse(": keep-alive\n\n")).toEqual([]);
    expect(parse(": ping\nid: 1\nevent: a\ndata: x\n: another\n\n")).toEqual([
      { id: "1", event: "a", data: "x" },
    ]);
  });

  it("uses 'message' when a frame has no event name, and tolerates a missing space after the colon", () => {
    expect(parse("data:hello\n\n")).toEqual([
      { id: null, event: "message", data: "hello" },
    ]);
    expect(parse("data: hello\n\n")[0].data).toBe("hello");
    expect(parse("data:  two spaces\n\n")[0].data).toBe(" two spaces"); // only one leading space is dropped
  });

  it("keeps the last event id for later frames that carry none, as the standard says", () => {
    const messages = parse("id: 5\nevent: a\ndata: x\n\nevent: b\ndata: y\n\n");
    expect(messages.map((m) => m.id)).toEqual(["5", "5"]);
  });

  it("does not deliver a frame without data or an event (a bare id)", () => {
    expect(parse("id: 9\n\n")).toEqual([]);
  });

  it("ignores retry and unknown fields", () => {
    expect(parse("retry: 3000\nfoo: bar\nevent: a\ndata: x\n\n")).toEqual([
      { id: null, event: "a", data: "x" },
    ]);
  });

  it("delivers a last frame that was not closed by a blank line when the stream ends", () => {
    expect(parse("event: a\ndata: x")).toEqual([
      { id: null, event: "a", data: "x" },
    ]);
    expect(parse("event: a\ndata: x\n")).toEqual([
      { id: null, event: "a", data: "x" },
    ]);
  });

  it("does not deliver a frame that is still open until it is complete", () => {
    const out: SseMessage[] = [];
    const parser = createSseParser((m) => out.push(m));
    parser.feed("event: a\ndata: x\n");
    expect(out).toEqual([]);
    parser.feed("\n");
    expect(out).toHaveLength(1);
  });

  it("rejects an id containing NUL and keeps parsing", () => {
    const messages = parse("id: bad\u0000id\nevent: a\ndata: x\n\n");
    expect(messages).toEqual([{ id: null, event: "a", data: "x" }]);
  });

  it("copes with data that contains colons and JSON", () => {
    const json = '{"summary":"a: b","n":1}';
    expect(parse(`event: e\ndata: ${json}\n\n`)[0].data).toBe(json);
  });

  it("copes with an empty stream and with only blank lines", () => {
    expect(parse()).toEqual([]);
    expect(parse("\n\n\n")).toEqual([]);
  });
});
