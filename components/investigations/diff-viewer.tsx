"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  parseUnifiedDiff,
  patchFilename,
  totals,
  type DiffLine,
} from "@/lib/diff-view";

const LINE_CLASS: Record<DiffLine["kind"], string> = {
  add: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  del: "bg-red-500/10 text-red-700 dark:text-red-300",
  ctx: "",
  note: "italic text-muted-foreground",
};

const SIGN: Record<DiffLine["kind"], string> = {
  add: "+",
  del: "-",
  ctx: " ",
  note: "\\",
};

const STATUS_LABEL = {
  added: "new file",
  deleted: "deleted",
  modified: "modified",
} as const;

/** The validated change as a unified diff, with copy and download (it applies cleanly with `git apply`). */
export function DiffViewer({
  diff,
  investigationId,
}: {
  diff: string;
  investigationId: string;
}) {
  const files = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const sum = totals(files);

  async function copy() {
    try {
      await navigator.clipboard.writeText(diff);
      toast.success("Diff copied");
    } catch {
      toast.error("Could not copy. Use Download instead.");
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([diff], { type: "text/x-diff;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = patchFilename(investigationId);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {sum.files} {sum.files === 1 ? "file" : "files"},{" "}
          <span className="text-emerald-600 dark:text-emerald-400">
            +{sum.additions}
          </span>{" "}
          <span className="text-red-600 dark:text-red-400">
            -{sum.deletions}
          </span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void copy()}>
            Copy diff
          </Button>
          <Button variant="outline" size="sm" onClick={download}>
            Download .patch
          </Button>
        </div>
      </div>

      {files.map((file) => (
        <details
          key={file.path}
          open={files.length <= 3}
          className="overflow-hidden rounded-md border"
        >
          <summary className="flex cursor-pointer items-center gap-2 bg-muted/40 px-3 py-2 text-xs">
            <span className="min-w-0 flex-1 truncate font-mono">
              {file.path}
            </span>
            <Badge variant="outline">{STATUS_LABEL[file.status]}</Badge>
            <span className="text-emerald-600 dark:text-emerald-400">
              +{file.additions}
            </span>
            <span className="text-red-600 dark:text-red-400">
              -{file.deletions}
            </span>
          </summary>

          {file.binary && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Binary file, not shown.
            </p>
          )}

          <div className="overflow-x-auto">
            {file.hunks.map((hunk, h) => (
              <table
                key={h}
                className="w-full border-collapse font-mono text-xs"
              >
                <tbody>
                  <tr className="bg-muted/20 text-muted-foreground">
                    <td colSpan={4} className="px-3 py-1">
                      {hunk.header}
                    </td>
                  </tr>
                  {hunk.lines.map((line, i) => (
                    <tr key={i} className={cn(LINE_CLASS[line.kind])}>
                      <td className="w-10 px-2 text-right text-muted-foreground select-none">
                        {line.oldNo ?? ""}
                      </td>
                      <td className="w-10 px-2 text-right text-muted-foreground select-none">
                        {line.newNo ?? ""}
                      </td>
                      <td className="w-4 select-none">{SIGN[line.kind]}</td>
                      <td className="pr-3 break-normal whitespace-pre">
                        {line.text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </details>
      ))}

      {files.length === 0 && (
        <pre className="max-h-64 overflow-auto rounded-md border bg-muted/20 p-3 text-xs">
          {diff}
        </pre>
      )}
    </div>
  );
}
