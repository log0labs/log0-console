"use client";

import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  File01Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { RunbookViewer } from "@/components/runbooks/runbook-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteRunbook,
  useRunbooks,
  useUploadRunbook,
} from "@/hooks/use-runbooks";
import { apiErrorMessage } from "@/lib/ai-config";
import {
  buildRunbook,
  classifyFile,
  fileToBase64,
  titleFromFilename,
  validateRunbook,
} from "@/lib/runbooks";
import {
  MAX_RUNBOOK_FILE_BYTES,
  RUNBOOK_FILE_ACCEPT,
  type Runbook,
  type RunbookInput,
  type RunbookKind,
} from "@/types/runbook";

const KIND_LABEL: Record<RunbookKind, string> = {
  markdown: "MD",
  text: "TXT",
  pdf: "PDF",
  docx: "DOCX",
};

/** A PDF or Word file the user picked: kept as base64, not shown in the text box. */
interface PickedFile {
  name: string;
  size: number;
  base64: string;
  type: "pdf" | "docx";
}

function UploadForm() {
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [format, setFormat] = useState<"markdown" | "text">("markdown");
  const [file, setFile] = useState<PickedFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadRunbook();

  const input: RunbookInput = file
    ? { title, fileBase64: file.base64, fileType: file.type }
    : { title, markdown, format };
  const problem = validateRunbook(input);
  const touched = title !== "" || markdown !== "" || file !== null;

  async function pickFile(picked: File | undefined) {
    if (!picked) return;
    const kind = classifyFile(picked.name);
    if (!kind) {
      toast.error("Use a .md, .txt, .pdf or .docx file");
      return;
    }
    if (picked.size > MAX_RUNBOOK_FILE_BYTES) {
      toast.error("That file is over 5 MB");
      return;
    }
    setTitle((t) => t || titleFromFilename(picked.name));
    if (kind === "pdf" || kind === "docx") {
      setMarkdown("");
      setFile({
        name: picked.name,
        size: picked.size,
        base64: await fileToBase64(picked),
        type: kind,
      });
    } else {
      setFile(null);
      setFormat(kind);
      setMarkdown(await picked.text());
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem || upload.isPending) return;
    upload.mutate(buildRunbook(input), {
      onSuccess: (runbook) => {
        setTitle("");
        setMarkdown("");
        setFile(null);
        setFormat("markdown");
        toast.success(`Saved "${runbook.title}" (${runbook.chunkCount} parts)`);
      },
      onError: (e) =>
        toast.error(apiErrorMessage(e, "Could not save the runbook")),
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title, e.g. Database pool exhausted"
          aria-label="Runbook title"
          maxLength={200}
        />
        <input
          ref={fileRef}
          type="file"
          accept={RUNBOOK_FILE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
        >
          <HugeiconsIcon icon={Upload04Icon} size={14} />
          <span className="max-sm:hidden">From file</span>
        </Button>
      </div>

      {file ? (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm">
          <HugeiconsIcon
            icon={File01Icon}
            size={16}
            className="shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {Math.max(1, Math.round(file.size / 1024))} KB
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Remove the file"
            onClick={() => setFile(null)}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </Button>
        </div>
      ) : (
        <Textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder="Markdown or plain text. Headings split it into searchable parts."
          aria-label="Runbook text"
          className="font-mono text-xs"
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <p role="alert" className="text-xs text-destructive">
          {touched && problem}
        </p>
        <Button
          type="submit"
          size="sm"
          disabled={!!problem || upload.isPending}
        >
          {upload.isPending ? "Saving…" : "Save runbook"}
        </Button>
      </div>
    </form>
  );
}

function RunbookRow({
  runbook,
  onOpen,
}: {
  runbook: Runbook;
  onOpen: () => void;
}) {
  const remove = useDeleteRunbook();

  return (
    <li className="flex items-center gap-1 pr-3 hover:bg-muted/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left outline-none focus-visible:bg-muted/60"
      >
        <Badge variant="outline" className="shrink-0 font-mono">
          {KIND_LABEL[runbook.sourceKind] ?? "MD"}
        </Badge>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {runbook.title}
          </span>
          <span className="block font-mono text-[11px] text-muted-foreground">
            {runbook.chunkCount} parts ·{" "}
            {formatDistanceToNow(new Date(runbook.createdAt), {
              addSuffix: true,
            })}
          </span>
        </span>
      </button>
      <ConfirmButton
        label={`Delete ${runbook.title}`}
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(runbook.id, {
            onError: (e) =>
              toast.error(apiErrorMessage(e, "Could not delete the runbook")),
          })
        }
      />
    </li>
  );
}

export default function RunbooksPage() {
  const { data, isLoading, isError } = useRunbooks();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = data?.find((r) => r.id === openId) ?? null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Runbooks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Investigations search these. Same title replaces the old one.
        </p>
      </div>

      <Card>
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">Add a runbook</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <UploadForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">
            Saved {data ? `(${data.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          {isLoading && (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}
          {isError && (
            <p className="p-4 text-sm text-muted-foreground">
              Could not load runbooks.
            </p>
          )}
          {data && data.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              None yet. Add your first one above.
            </p>
          )}
          {data && data.length > 0 && (
            <ul className="divide-y border-t">
              {data.map((r) => (
                <RunbookRow
                  key={r.id}
                  runbook={r}
                  onOpen={() => setOpenId(r.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {open && <RunbookViewer runbook={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
