import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { FeedbackRequest } from "@/lib/feedback";
import type {
  CreateInvestigationRequest,
  CreateInvestigationResponse,
  Investigation,
  LatestInvestigation,
  PrAction,
  ResumeInvestigationRequest,
} from "@/types/investigation";

export const investigationKeys = {
  forIncident: (incidentId: string) =>
    ["investigations", "incident", incidentId] as const,
  one: (id: string) => ["investigations", "one", id] as const,
};

/** The investigations of one incident, newest first (the service orders them). */
export function useInvestigations(incidentId: string) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<Investigation[]>({
    queryKey: investigationKeys.forIncident(incidentId),
    queryFn: async () => {
      const { data } = await aiApi.get<Investigation[]>(
        "/api/v1/investigations",
        { params: { incidentId } }
      );
      return data;
    },
    enabled: !!accessToken && !!incidentId,
  });
}

export function useStartInvestigation(incidentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: Omit<CreateInvestigationRequest, "incidentId">
    ) => {
      const { data } = await aiApi.post<CreateInvestigationResponse>(
        "/api/v1/investigations",
        { ...body, incidentId }
      );
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: investigationKeys.forIncident(incidentId),
      }),
  });
}

export function useCancelInvestigation(investigationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await aiApi.post(`/api/v1/investigations/${investigationId}/cancel`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["investigations"] }),
  });
}

/** Answer a review that is waiting: approve, refine (with a note) or stop. */
export function useResumeInvestigation(investigationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ResumeInvestigationRequest) => {
      await aiApi.post(
        `/api/v1/investigations/${investigationId}/resume`,
        body
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["investigations"] }),
  });
}

/** Run a finished investigation again from one step, keeping what it already gathered. */
export function useRetryInvestigation(investigationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (from: "root_cause" | "propose_changes") => {
      await aiApi.post(`/api/v1/investigations/${investigationId}/retry`, {
        from,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["investigations"] }),
  });
}

/** Answer the draft pull request approval: open it, or not. */
export function usePrDecision(investigationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: PrAction) => {
      await aiApi.post(
        `/api/v1/investigations/${investigationId}/pr/${action === "approve" ? "approve" : "decline"}`
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["investigations"] }),
  });
}

/** Tell the service whether a finished result helped (it never recalls "wrong" ones). */
export function useSendFeedback(investigationId: string) {
  return useMutation({
    mutationFn: async (body: FeedbackRequest) => {
      await aiApi.post(
        `/api/v1/investigations/${investigationId}/feedback`,
        body
      );
    },
  });
}

/** The newest investigation of each listed incident (those that have one), keyed by incident id. */
export function useLatestInvestigations(incidentIds: string[]) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const ids = incidentIds.slice(0, 100);

  return useQuery<Record<string, LatestInvestigation>>({
    queryKey: ["investigations", "latest", ids],
    queryFn: async () => {
      const { data } = await aiApi.get<LatestInvestigation[]>(
        "/api/v1/investigations/latest",
        { params: { incidentIds: ids.join(",") } }
      );
      return Object.fromEntries(data.map((row) => [row.incidentId, row]));
    },
    enabled: !!accessToken && ids.length > 0,
    // an investigation that is running changes state: look again
    refetchInterval: 15_000,
    placeholderData: (previous) => previous,
  });
}
