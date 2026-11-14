"use client";

import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import {
  useDeleteRunbook,
  useRunbooks,
  useUploadRunbook,
} from "@/hooks/use-runbooks";
import { apiErrorMessage } from "@/lib/ai-config";
import {
  buildRunbook,
  titleFromFilename,
  validateRunbook,
} from "@/lib/runbooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MAX_RUNBOOK_CHARS, type Runbook } from "@/types/runbook";

function UploadForm() {
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadRunbook();
  const problem = validateRunbook({ title, markdown });
  const touched = title !== "" || markdown !== "";

  async function pickFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_RUNBOOK_CHARS * 4) {
      toast.error("That file is too large for a runbook");
      return;
    }
    setMarkdown(await file.text());
    setTitle((t) => t || titleFromFilename(file.name));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem || upload.isPending) return;
    upload.mutate(buildRunbook({ title, markdown }), {
      onSuccess: (runbook) => {
        setTitle("");
        setMarkdown("");
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
          accept=".md,.markdown,.txt,text/markdown,text/plain"
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
      <Textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        rows={8}
        spellCheck={false}
        placeholder="Markdown. Headings split it into searchable parts."
        aria-label="Runbook text"
        className="font-mono text-xs"
      />
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

function RunbookRow({ runbook }: { runbook: Runbook }) {
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteRunbook();

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{runbook.title}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {runbook.chunkCount} parts ·{" "}
          {formatDistanceToNow(new Date(runbook.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 gap-1.5">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setConfirming(false)}
          >
            Keep
          </Button>
          <Button
            variant="destructive"
            size="xs"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(runbook.id, {
                onError: (e) =>
                  toast.error(
                    apiErrorMessage(e, "Could not delete the runbook")
                  ),
              })
            }
          >
            Delete
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Delete ${runbook.title}`}
          onClick={() => setConfirming(true)}
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} />
        </Button>
      )}
    </li>
  );
}

export default function RunbooksPage() {
  const { data, isLoading, isError } = useRunbooks();

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
                <RunbookRow key={r.id} runbook={r} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
