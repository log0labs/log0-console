"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  CodeIcon,
  Download04Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { SidePanel } from "@/components/ui/side-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRunbookFile, useRunbook } from "@/hooks/use-runbooks";
import { downloadName } from "@/lib/runbooks";
import type { Runbook } from "@/types/runbook";

type Mode = "preview" | "raw";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** The PDF as the browser's own viewer shows it. The file needs the auth header, so it is fetched and shown from a blob URL. */
function PdfPreview({ id, title }: { id: string; title: string }) {
  const [state, setState] = useState<{ url: string | null; failed: boolean }>({
    url: null,
    failed: false,
  });

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    fetchRunbookFile(id)
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, failed: false });
      })
      .catch(() => !revoked && setState({ url: null, failed: true }));
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  if (state.failed)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Could not load the PDF. Try the raw text or download it.
      </p>
    );
  if (!state.url) return <Skeleton className="m-4 h-[70vh]" />;
  return (
    <div className="flex h-full min-h-[75vh] flex-col">
      <iframe
        src={state.url}
        title={title}
        className="min-h-0 w-full flex-1 border-0"
      />
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        Blank? This browser may not show PDFs inline. Use Download, or the raw
        text view.
      </p>
    </div>
  );
}

/**
 * One runbook in a side panel. Markdown and Word text can be read rendered or raw; a PDF is shown as the PDF
 * (or its extracted text); plain text is shown as is. Download gives the original file, and the close button
 * (or Escape) dismisses it.
 */
export function RunbookViewer({
  runbook,
  onClose,
}: {
  runbook: Runbook;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useRunbook(runbook.id);
  const [mode, setMode] = useState<Mode>("preview");
  const kind = data?.kind ?? runbook.sourceKind;
  const isPlain = kind === "text";

  async function download() {
    try {
      if (kind === "pdf" || kind === "docx") {
        saveBlob(
          await fetchRunbookFile(runbook.id),
          downloadName(runbook.title, kind)
        );
      } else if (data) {
        saveBlob(
          new Blob([data.text], { type: "text/plain;charset=utf-8" }),
          downloadName(runbook.title, kind)
        );
      }
    } catch {
      toast.error("Could not download");
    }
  }

  const toggle = !isPlain && (
    <div className="mr-1 flex items-center rounded-lg bg-muted p-0.5">
      {(
        [
          ["preview", BookOpen01Icon, "Preview"],
          ["raw", CodeIcon, "Raw text"],
        ] as const
      ).map(([value, icon, label]) => (
        <Button
          key={value}
          variant={mode === value ? "default" : "ghost"}
          size="icon-xs"
          aria-label={label}
          aria-pressed={mode === value}
          title={label}
          onClick={() => setMode(value)}
          className={mode === value ? "" : "text-muted-foreground"}
        >
          <HugeiconsIcon icon={icon} size={14} />
        </Button>
      ))}
    </div>
  );

  const actions = (
    <>
      {toggle}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Download"
        title="Download"
        disabled={!data}
        onClick={() => void download()}
      >
        <HugeiconsIcon icon={Download04Icon} size={16} />
      </Button>
    </>
  );

  const showPdf = kind === "pdf" && mode === "preview" && !!data?.hasFile;

  return (
    <SidePanel title={runbook.title} onClose={onClose} actions={actions}>
      {isLoading && <Skeleton className="m-4 h-64" />}
      {isError && (
        <p className="p-4 text-sm text-muted-foreground">
          Could not load this runbook.
        </p>
      )}
      {data && (
        <div className={showPdf ? "h-full" : "p-4 sm:p-6"}>
          {data.reconstructed && (
            <p className="mb-3 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Rebuilt from the search index. Upload it again to keep the exact
              original.
            </p>
          )}
          {kind === "docx" && mode === "preview" && (
            <p className="mb-3 text-xs text-muted-foreground">
              Text from the Word file. Download for the original.
            </p>
          )}
          {showPdf ? (
            <PdfPreview id={runbook.id} title={runbook.title} />
          ) : mode === "preview" && !isPlain ? (
            <Markdown>{data.text}</Markdown>
          ) : (
            <pre className="font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
              {data.text}
            </pre>
          )}
        </div>
      )}
    </SidePanel>
  );
}
