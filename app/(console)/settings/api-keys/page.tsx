"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { useApiKeys } from "@/hooks/use-api-keys";
import { authApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Revealed key banner ───────────────────────────────────────────────────────

function RevealedKey({
  rawKey,
  onDismiss,
}: {
  rawKey: string;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-primary">
          Copy this key now - it will not be shown again
        </p>
        <button
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
        <code className="flex-1 truncate font-mono text-sm">{rawKey}</code>
        <CopyButton text={rawKey} what="Key copied" label="Copy key" />
      </div>
    </div>
  );
}

// ── Create key form ───────────────────────────────────────────────────────────

function CreateKeyForm({ onCreated }: { onCreated: (rawKey: string) => void }) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      authApi.post<{ rawKey: string }>("/api/v1/api-keys", { name }),
    onSuccess: ({ data }) => {
      toast.success("API key created");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setName("");
      onCreated(data.rawKey);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to create API key";
      toast.error(msg);
    },
  });

  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="key-name">Key name</Label>
        <Input
          id="key-name"
          placeholder="e.g. production-ingestor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-64"
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) create.mutate();
          }}
        />
      </div>
      <Button
        size="sm"
        disabled={!name.trim() || create.isPending}
        onClick={() => create.mutate()}
      >
        {create.isPending ? "Creating…" : "Create key"}
      </Button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const { data: keys, isLoading } = useApiKeys();
  const queryClient = useQueryClient();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const revoke = useMutation({
    mutationFn: (keyId: string) => authApi.delete(`/api/v1/api-keys/${keyId}`),
    onSuccess: () => {
      toast.success("API key revoked");
      setConfirmRevoke(null);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: () => toast.error("Failed to revoke key"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">API Keys</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keys are used to authenticate log ingestion requests.
        </p>
      </div>

      <Card>
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">Create API key</CardTitle>
          <CardDescription>
            Give the key a descriptive name so you know where it is used.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-5">
          <CreateKeyForm onCreated={(k) => setRevealedKey(k)} />
          {revealedKey && (
            <RevealedKey
              rawKey={revealedKey}
              onDismiss={() => setRevealedKey(null)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">
            {isLoading ? "Keys" : `Keys (${keys?.length ?? 0})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-40">Created</TableHead>
                <TableHead className="w-36 pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4].map((j) => (
                      <TableCell
                        key={j}
                        className={j === 1 ? "pl-6" : j === 4 ? "pr-6" : ""}
                      >
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !keys?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No API keys yet. Create one above.
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((key) => (
                  <TableRow key={key.keyId}>
                    <TableCell className="pl-6 font-medium">
                      {key.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          key.active
                            ? "border-primary/30 bg-primary/15 text-primary"
                            : "border-border bg-muted text-muted-foreground"
                        }
                      >
                        {key.active ? "Active" : "Revoked"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(key.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {key.active ? (
                        confirmRevoke === key.keyId ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground">
                              Revoke this key?
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              disabled={revoke.isPending}
                              onClick={() => revoke.mutate(key.keyId)}
                            >
                              Yes
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setConfirmRevoke(null)}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => setConfirmRevoke(key.keyId)}
                          >
                            Revoke
                          </Button>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
