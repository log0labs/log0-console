// Parse a unified diff (the git format the ai-service produces) into files, hunks and numbered lines
// for display. Pure functions, no React.
//
// Lines are classified by the hunk header's counts (`@@ -a,b +c,d @@`), not by looking for "---" or "+++":
// inside a hunk a removed line "-- comment" starts with "---", and must stay a removed line.

export type LineKind = "add" | "del" | "ctx" | "note";

export interface DiffLine {
  kind: LineKind;
  text: string;
  oldNo: number | null;
  newNo: number | null;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export type FileStatus = "added" | "deleted" | "modified";

export interface DiffFile {
  path: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  binary: boolean;
  hunks: DiffHunk[];
}

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/** Undo git's path quoting: "a/with\ttab\303\251" -> a/with<TAB>e-acute. Unquoted paths pass through. */
export function unquoteGitPath(raw: string): string {
  if (!(raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')))
    return raw;
  const bytes: number[] = [];
  const encoder = new TextEncoder();
  const body = raw.slice(1, -1);
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== "\\") {
      bytes.push(...encoder.encode(ch));
      continue;
    }
    const next = body[++i];
    const octal = /^[0-7]{3}/.exec(body.slice(i, i + 3));
    if (octal) {
      bytes.push(parseInt(octal[0], 8));
      i += 2;
      continue;
    }
    const simple: Record<string, number> = {
      n: 10,
      t: 9,
      r: 13,
      a: 7,
      b: 8,
      f: 12,
      v: 11,
      "\\": 92,
      '"': 34,
    };
    bytes.push(next in simple ? simple[next] : (next?.charCodeAt(0) ?? 92));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function stripPrefix(path: string): string {
  return /^[ab]\//.test(path) ? path.slice(2) : path;
}

/** The path named by a `--- ` / `+++ ` line, or null for /dev/null. */
function headerPath(rest: string): string | null {
  const value = rest.replace(/\t.*$/, ""); // git may append a tab and a timestamp
  if (value === "/dev/null") return null;
  return stripPrefix(unquoteGitPath(value));
}

/** The path from `diff --git a/x b/x` (used when a file has no ---/+++ lines, e.g. a mode-only change). */
function gitHeaderPath(line: string): string {
  const rest = line.slice("diff --git ".length);
  const quoted = /^("(?:[^"\\]|\\.)*") /.exec(rest);
  const first = quoted ? quoted[1] : rest.slice(0, rest.indexOf(" b/"));
  return stripPrefix(unquoteGitPath(first));
}

export function parseUnifiedDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diff.split("\n");
  let file = null as DiffFile | null;
  let hunk = null as DiffHunk | null;
  let oldNo = 0;
  let newNo = 0;
  let oldLeft = 0;
  let newLeft = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inHunk = hunk !== null && (oldLeft > 0 || newLeft > 0);

    if (inHunk && file && hunk) {
      const current: DiffHunk = hunk;
      const sign = line[0];
      if (sign === "\\") {
        current.lines.push({
          kind: "note",
          text: line.slice(2),
          oldNo: null,
          newNo: null,
        });
      } else if (sign === "+") {
        current.lines.push({
          kind: "add",
          text: line.slice(1),
          oldNo: null,
          newNo: newNo++,
        });
        file.additions++;
        newLeft--;
      } else if (sign === "-") {
        current.lines.push({
          kind: "del",
          text: line.slice(1),
          oldNo: oldNo++,
          newNo: null,
        });
        file.deletions++;
        oldLeft--;
      } else {
        // context line (a blank one may have lost its leading space)
        current.lines.push({
          kind: "ctx",
          text: line.slice(1),
          oldNo: oldNo++,
          newNo: newNo++,
        });
        oldLeft--;
        newLeft--;
      }
      continue;
    }

    if (line.startsWith("\\") && hunk) {
      // "\ No newline at end of file" right after the last line of a hunk
      (hunk as DiffHunk).lines.push({
        kind: "note",
        text: line.slice(2),
        oldNo: null,
        newNo: null,
      });
      continue;
    }

    if (line.startsWith("diff --git ")) {
      file = {
        path: gitHeaderPath(line),
        status: "modified",
        additions: 0,
        deletions: 0,
        binary: false,
        hunks: [],
      };
      files.push(file);
      hunk = null;
      oldLeft = newLeft = 0;
    } else if (line.startsWith("new file mode") && file) {
      (file as DiffFile).status = "added";
    } else if (line.startsWith("deleted file mode") && file) {
      (file as DiffFile).status = "deleted";
    } else if (line.startsWith("Binary files ") && file) {
      (file as DiffFile).binary = true;
    } else if (line.startsWith("--- ") && file && !hunk) {
      const path = headerPath(line.slice(4));
      if (path === null) (file as DiffFile).status = "added";
      else (file as DiffFile).path = path;
    } else if (line.startsWith("+++ ") && file && !hunk) {
      const path = headerPath(line.slice(4));
      if (path === null) (file as DiffFile).status = "deleted";
      else (file as DiffFile).path = path;
    } else {
      const m = HUNK.exec(line);
      if (m && file) {
        oldNo = Number(m[1]);
        newNo = Number(m[3]);
        oldLeft = m[2] === undefined ? 1 : Number(m[2]);
        newLeft = m[4] === undefined ? 1 : Number(m[4]);
        hunk = { header: line, lines: [] };
        (file as DiffFile).hunks.push(hunk);
      }
    }
  }
  return files;
}

export function totals(files: DiffFile[]): {
  files: number;
  additions: number;
  deletions: number;
} {
  return {
    files: files.length,
    additions: files.reduce((n, f) => n + f.additions, 0),
    deletions: files.reduce((n, f) => n + f.deletions, 0),
  };
}

/** A file name for the downloaded patch: `investigation-<first 8 of id>.patch`. */
export function patchFilename(investigationId: string): string {
  const safe = investigationId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  return `investigation-${safe || "diff"}.patch`;
}
