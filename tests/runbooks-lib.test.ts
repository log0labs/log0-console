import { describe, expect, it } from "vitest";
import {
  classifyFile,
  downloadName,
  titleFromFilename,
  validateRunbook,
} from "@/lib/runbooks";

describe("runbook files", () => {
  it("recognises the four formats by extension, case-insensitively", () => {
    expect(classifyFile("pool.md")).toBe("markdown");
    expect(classifyFile("POOL.MARKDOWN")).toBe("markdown");
    expect(classifyFile("notes.txt")).toBe("text");
    expect(classifyFile("guide.PDF")).toBe("pdf");
    expect(classifyFile("guide.docx")).toBe("docx");
    expect(classifyFile("old.doc")).toBeNull();
    expect(classifyFile("noextension")).toBeNull();
  });

  it("makes a title from any of them", () => {
    expect(titleFromFilename("db-pool_exhausted.pdf")).toBe(
      "db pool exhausted"
    );
    expect(titleFromFilename("Payments Guide.docx")).toBe("Payments Guide");
  });

  it("names a download after the title with the right extension and no unsafe characters", () => {
    expect(downloadName("Database pool", "markdown")).toBe("Database pool.md");
    expect(downloadName('a/b:c*"d', "pdf")).toBe("abcd.pdf");
    expect(downloadName("///", "docx")).toBe("runbook.docx");
    expect(downloadName("Notes", "text")).toBe("Notes.txt");
  });

  it("accepts a file with a title, and refuses one over 5 MB", () => {
    expect(
      validateRunbook({ title: "Guide", fileBase64: "AAAA", fileType: "pdf" })
    ).toBeNull();
    const big = "A".repeat(Math.ceil((5 * 1024 * 1024 * 4) / 3) + 8);
    expect(
      validateRunbook({ title: "Guide", fileBase64: big, fileType: "pdf" })
    ).toMatch(/5 MB/);
    expect(
      validateRunbook({ title: "", fileBase64: "AAAA", fileType: "docx" })
    ).toMatch(/title/i);
  });
});
