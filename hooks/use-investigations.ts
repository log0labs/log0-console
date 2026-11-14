import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type {
  CreateInvestigationRequest,
  CreateInvestigationResponse,
  Investigation,
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
