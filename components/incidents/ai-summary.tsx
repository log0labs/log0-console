"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { Skeleton } from "@/components/ui/skeleton";
import { incidentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { IncidentDetail } from "@/types/incident";

/**
 * The incident's AI summary in its three real states: the text, "generating" (a request is in flight),
 * or "unavailable" (it failed or never ran) with a retry for people who can act on incidents.
 */
export function AiSummary({ incident }: { incident: IncidentDetail }) {
  const role = useAuthStore((s) => s.role);
  const tenantId = useAuthStore((s) => s.tenantId);
  const queryClient = useQueryClient();
  const canRetry = role === "ADMIN" || role === "ENGINEER";

  const retry = useMutation({
    mutationFn: async () =>
      incidentsApi.post(
        `/api/v1/incidents/${incident.incidentId}/ai-summary/retry`,
        null,
        { params: { tenantId } }
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["incident", incident.incidentId],
      }),
    onError: () => toast.error("Could not ask for a summary"),
  });

  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>AI Summary</SectionLabel>
      {incident.aiSummaryStatus === "READY" && incident.aiSummary ? (
        <p className="rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-line">
          {incident.aiSummary}
        </p>
      ) : incident.aiSummaryStatus === "PENDING" ? (
        <div
          className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4"
          aria-busy="true"
        >
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3.5 w-4/6" />
          <p className="mt-1 text-xs text-muted-foreground">
            Generating summary…
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            No summary. The model did not answer.
          </p>
          {canRetry && (
            <Button
              variant="outline"
              size="xs"
              disabled={retry.isPending}
              onClick={() => retry.mutate()}
            >
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
