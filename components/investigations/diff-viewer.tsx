"use client";

import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Download04Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import {
  parseUnifiedDiff,
  patchFilename,
  totals,
  type DiffLine,
} from "@/lib/diff-view";

const LINE_CLASS: Record<DiffLine["kind"], string> = {
  add: "bg-primary/10",
  del: "bg-destructive/10",
  ctx: "",
  note: "italic text-muted-foreground",
};

const SIGN_CLASS: Record<DiffLine["kind"], string> = {
  add: "text-primary",
  del: "text-destructive",
  ctx: "",
  note: "",
};

const SIGN: Record<DiffLine["kind"], string> = {
  add: "+",
  del: "-",
  ctx: " ",
  note: "\\",
};

const STATUS_LABEL = {
  added: "new",
  deleted: "deleted",
  modified: "modified",
} as const;

/** Five small squares in the GitHub manner: how a file's change splits between additions and deletions. */
function ChangeBar({ add, del }: { add: number; del: number }) {
  const total = add + del;
  const green = total === 0 ? 0 : Math.round((add / total) * 5);
  return (
    <span className="flex gap-px" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-[1px]",
            total === 0
              ? "bg-border"
              : i < green
                ? "bg-primary"
                : "bg-destructive/70"
          )}
        />
      ))}
    </span>
  );
}

function download(diff: string, investigationId: string) {
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

/** The validated change as a unified diff. It applies cleanly with `git apply`; copy or download it. */
export function DiffViewer({
  diff,
  investigationId,
}: {
  diff: string;
  investigationId: string;
}) {
  const files = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const sum = totals(files);
  const filename = patchFilename(investigationId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-muted-foreground">
          {sum.files} {sum.files === 1 ? "file" : "files"}{" "}
          <span className="text-primary">+{sum.additions}</span>{" "}
          <span className="text-destructive">-{sum.deletions}</span>
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => download(diff, investigationId)}
          >
            <HugeiconsIcon icon={Download04Icon} size={13} />
            .patch
          </Button>
          <CopyButton text={diff} what="Diff copied" label="Copy diff" />
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-md border bg-muted/40 py-0.5 pr-0.5 pl-2.5 font-mono text-[11px]">
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          git apply {filename}
        </span>
        <CopyButton
          text={`git apply ${filename}`}
          what="Command copied"
          label="Copy git apply command"
        />
      </div>

      {files.map((file) => (
        <details
          key={file.path}
          open={files.length <= 3}
          className="group/file overflow-hidden rounded-lg border"
        >
          <summary className="sticky top-0 z-10 flex cursor-pointer list-none items-center gap-2 bg-muted px-3 py-2 text-xs [&::-webkit-details-marker]:hidden">
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={14}
              className="shrink-0 text-muted-foreground transition-transform group-not-open/file:-rotate-90"
            />
            <span className="min-w-0 flex-1 truncate font-mono">
              {file.path}
            </span>
            <span className="text-muted-foreground max-sm:hidden">
              {STATUS_LABEL[file.status]}
            </span>
            <span className="font-mono text-primary">+{file.additions}</span>
            <span className="font-mono text-destructive">
              -{file.deletions}
            </span>
            <ChangeBar add={file.additions} del={file.deletions} />
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
                  <tr className="bg-muted/40 text-muted-foreground">
                    <td colSpan={4} className="px-3 py-1">
                      {hunk.header}
                    </td>
                  </tr>
                  {hunk.lines.map((line, i) => (
                    <tr key={i} className={LINE_CLASS[line.kind]}>
                      <td className="w-9 px-1.5 text-right text-muted-foreground/70 select-none max-sm:hidden">
                        {line.oldNo ?? ""}
                      </td>
                      <td className="w-9 px-1.5 text-right text-muted-foreground/70 select-none">
                        {line.newNo ?? ""}
                      </td>
                      <td
                        className={cn(
                          "w-4 text-center select-none",
                          SIGN_CLASS[line.kind]
                        )}
                      >
                        {SIGN[line.kind]}
                      </td>
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
        <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/20 p-3 text-xs">
          {diff}
        </pre>
      )}
    </div>
  );
}
