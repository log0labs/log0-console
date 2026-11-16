import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiApi } from "@/lib/api";
import { anyActive } from "@/lib/remediation";
import { useAuthStore } from "@/store/auth";
import type { DecisionAction, Remediation } from "@/types/remediation";

export const remediationKeys = {
  forInvestigation: (investigationId: string) =>
    ["remediations", investigationId] as const,
};

const POLL_MS = 5_000;

/** The deploys a merge made for one investigation. Asks again every few seconds while any of them is still running. */
export function useRemediations(investigationId: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<Remediation[]>({
    queryKey: remediationKeys.forInvestigation(investigationId),
    queryFn: async () =>
      (
        await aiApi.get<Remediation[]>("/api/v1/remediations", {
          params: { investigationId },
        })
      ).data,
    enabled: !!accessToken && !!investigationId,
    refetchInterval: (query) => (anyActive(query.state.data) ? POLL_MS : false),
  });
}

type Step = "start" | "deploy/approve" | "deploy/decline";

/** Start an offer (the preflight), or answer the deploy approval. */
export function useRemediationStep(investigationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; step: Step }) =>
      (await aiApi.post<Remediation>(`/api/v1/remediations/${v.id}/${v.step}`))
        .data,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: remediationKeys.forInvestigation(investigationId),
      }),
  });
}

/** Answer the question after a degraded or unclear verdict: keep, watch longer, or roll back. */
export function useRemediationDecision(investigationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; action: DecisionAction }) =>
      (
        await aiApi.post<Remediation>(
          `/api/v1/remediations/${v.id}/decision`,
          { action: v.action }
        )
      ).data,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: remediationKeys.forInvestigation(investigationId),
      }),
  });
}
