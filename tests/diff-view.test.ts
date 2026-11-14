import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseUnifiedDiff,
  patchFilename,
  totals,
  unquoteGitPath,
} from "@/lib/diff-view";

const MODIFY = [
  "diff --git a/app/db.py b/app/db.py",
  "index 1111111..2222222 100644",
  "--- a/app/db.py",
  "+++ b/app/db.py",
  "@@ -1,4 +1,4 @@",
  " import os",
  "-POOL = 5",
  "+POOL = 20",
  " ",
  " def connect():",
  "",
].join("\n");

describe("parseUnifiedDiff", () => {
  it("parses a modified file with numbered lines", () => {
    const [file] = parseUnifiedDiff(MODIFY);
    expect(file).toMatchObject({
      path: "app/db.py",
      status: "modified",
      additions: 1,
      deletions: 1,
      binary: false,
    });
    const lines = file.hunks[0].lines;
    expect(lines.map((l) => l.kind)).toEqual([
      "ctx",
      "del",
      "add",
      "ctx",
      "ctx",
    ]);
    expect(lines[1]).toMatchObject({ text: "POOL = 5", oldNo: 2, newNo: null });
    expect(lines[2]).toMatchObject({
      text: "POOL = 20",
      oldNo: null,
      newNo: 2,
    });
    expect(lines[4]).toMatchObject({ oldNo: 4, newNo: 4 });
  });

  it("parses added and deleted files", () => {
    const diff = [
      "diff --git a/new.txt b/new.txt",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/new.txt",
      "@@ -0,0 +1,2 @@",
      "+one",
      "+two",
      "diff --git a/old.txt b/old.txt",
      "deleted file mode 100644",
      "--- a/old.txt",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-gone",
      "",
    ].join("\n");
    const files = parseUnifiedDiff(diff);
    expect(
      files.map((f) => [f.path, f.status, f.additions, f.deletions])
    ).toEqual([
      ["new.txt", "added", 2, 0],
      ["old.txt", "deleted", 0, 1],
    ]);
  });

  it("keeps a removed line that starts with '---' as a removed line", () => {
    const diff = [
      "diff --git a/q.sql b/q.sql",
      "--- a/q.sql",
      "+++ b/q.sql",
      "@@ -1,2 +1,2 @@",
      "--- a comment",
      "+++ b comment",
      " keep",
      "",
    ].join("\n");
    const [file] = parseUnifiedDiff(diff);
    expect(file.path).toBe("q.sql");
    expect(file.hunks[0].lines.map((l) => [l.kind, l.text])).toEqual([
      ["del", "-- a comment"],
      ["add", "++ b comment"],
      ["ctx", "keep"],
    ]);
  });

  it("handles several hunks, a default count of 1, and the no-newline marker", () => {
    const diff = [
      "diff --git a/f b/f",
      "--- a/f",
      "+++ b/f",
      "@@ -1 +1 @@",
      "-a",
      "\\ No newline at end of file",
      "+b",
      "\\ No newline at end of file",
      "@@ -10,2 +10,2 @@",
      " x",
      "-y",
      "+z",
      "",
    ].join("\n");
    const [file] = parseUnifiedDiff(diff);
    expect(file.hunks).toHaveLength(2);
    expect(file.hunks[0].lines.map((l) => l.kind)).toEqual([
      "del",
      "note",
      "add",
      "note",
    ]);
    expect(file.hunks[0].lines[1].text).toBe("No newline at end of file");
    expect(file.hunks[1].lines[1]).toMatchObject({ oldNo: 11 });
    expect(file).toMatchObject({ additions: 2, deletions: 2 });
  });

  it("reads quoted paths and a binary marker", () => {
    const diff = [
      'diff --git "a/sp\\303\\251c.txt" "b/sp\\303\\251c.txt"',
      "Binary files a/x and b/x differ",
      "",
    ].join("\n");
    const [file] = parseUnifiedDiff(diff);
    expect(file.path).toBe("spéc.txt");
    expect(file.binary).toBe(true);
    expect(file.hunks).toEqual([]);
  });

  it("returns nothing for empty or non-diff text", () => {
    expect(parseUnifiedDiff("")).toEqual([]);
    expect(parseUnifiedDiff("just some words\nnot a diff")).toEqual([]);
  });

  it("does not stop at a context line that is blank", () => {
    const diff = [
      "diff --git a/f b/f",
      "--- a/f",
      "+++ b/f",
      "@@ -1,3 +1,3 @@",
      " a",
      "",
      "-c",
      "+d",
      "",
    ].join("\n");
    const [file] = parseUnifiedDiff(diff);
    expect(file.hunks[0].lines.map((l) => l.kind)).toEqual([
      "ctx",
      "ctx",
      "del",
      "add",
    ]);
  });

  it("agrees with git's own counts on a real diff", () => {
    const dir = mkdtempSync(join(tmpdir(), "diffview-"));
    try {
      const git = (...args: string[]) =>
        execFileSync("git", args, { cwd: dir, encoding: "utf8" });
      git("init", "-q");
      git("config", "user.email", "t@example.com");
      git("config", "user.name", "t");
      git("config", "core.autocrlf", "false");
      const base =
        Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n") + "\n";
      writeFileSync(join(dir, "a.txt"), base);
      writeFileSync(join(dir, "b.txt"), "keep\nold\n");
      git("add", "-A");
      git("commit", "-q", "-m", "base");
      writeFileSync(
        join(dir, "a.txt"),
        base.replace("line 3\n", "THREE\nextra\n").replace("line 25\n", "")
      );
      writeFileSync(join(dir, "b.txt"), "keep\nold");
      writeFileSync(join(dir, "c.txt"), "new\nfile\n");
      git("add", "-A");
      const diff = git("diff", "--cached");
      const stat = git("diff", "--cached", "--numstat")
        .trim()
        .split("\n")
        .map((row) => row.split("\t"));

      const files = parseUnifiedDiff(diff);
      expect(files.map((f) => f.path)).toEqual(stat.map((r) => r[2]));
      files.forEach((f, i) => {
        expect([f.additions, f.deletions]).toEqual([
          Number(stat[i][0]),
          Number(stat[i][1]),
        ]);
      });
      expect(files.find((f) => f.path === "c.txt")?.status).toBe("added");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("totals", () => {
  it("adds up files, additions and deletions", () => {
    expect(totals(parseUnifiedDiff(MODIFY))).toEqual({
      files: 1,
      additions: 1,
      deletions: 1,
    });
    expect(totals([])).toEqual({ files: 0, additions: 0, deletions: 0 });
  });
});

describe("unquoteGitPath", () => {
  it("leaves plain paths alone and decodes escapes", () => {
    expect(unquoteGitPath("a/b.py")).toBe("a/b.py");
    expect(unquoteGitPath('"a/t\\tb\\"q\\\\"')).toBe('a/t\tb"q\\');
  });
});

describe("patchFilename", () => {
  it("uses the start of the id and is safe as a file name", () => {
    expect(patchFilename("3f2a9c1e-77aa-4b1c-9d00-0123456789ab")).toBe(
      "investigation-3f2a9c1e.patch"
    );
    expect(patchFilename("../../x")).toBe("investigation-x.patch");
    expect(patchFilename("")).toBe("investigation-diff.patch");
  });
});
