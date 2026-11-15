import { describe, expect, it } from "vitest";
import { buildFeedback, validateFeedback } from "@/lib/feedback";
import {
  buildRunbook,
  titleFromFilename,
  validateRunbook,
} from "@/lib/runbooks";

describe("feedback", () => {
  it("drops an empty note and trims a real one", () => {
    expect(buildFeedback("helpful", "   ")).toEqual({
      verdict: "helpful",
      note: null,
    });
    expect(buildFeedback("wrong", "  it blamed the db ")).toEqual({
      verdict: "wrong",
      note: "it blamed the db",
    });
  });

  it("rejects a note over 1000 characters", () => {
    expect(validateFeedback("x".repeat(1000))).toBeNull();
    expect(validateFeedback("x".repeat(1001))).not.toBeNull();
  });
});

describe("runbooks", () => {
  it("needs a plain title and some text", () => {
    expect(validateRunbook({ title: "", markdown: "text" })).toMatch(/title/i);
    expect(validateRunbook({ title: "a\u0007b", markdown: "text" })).toMatch(
      /plain/i
    );
    expect(validateRunbook({ title: "Pool", markdown: "  " })).toMatch(/text/i);
    expect(
      validateRunbook({ title: "Pool", markdown: "# Pool\nSteps" })
    ).toBeNull();
  });

  it("refuses text beyond the service limit", () => {
    expect(
      validateRunbook({ title: "Big", markdown: "x".repeat(200_001) })
    ).toMatch(/long/i);
  });

  it("makes a title from a file name and trims on build", () => {
    expect(titleFromFilename("db-pool_exhausted.md")).toBe("db pool exhausted");
    expect(buildRunbook({ title: "  Pool ", markdown: "# x" }).title).toBe(
      "Pool"
    );
  });
});
