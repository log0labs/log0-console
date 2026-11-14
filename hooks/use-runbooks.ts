import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { Runbook, RunbookInput } from "@/types/runbook";

const KEY = ["runbooks"] as const;

export function useRunbooks() {
  const enabled = !!useAuthStore((s) => s.accessToken);
  return useQuery<Runbook[]>({
    queryKey: KEY,
    queryFn: async () => (await aiApi.get<Runbook[]>("/api/v1/runbooks")).data,
    enabled,
  });
}

/** Upload a runbook; the same title replaces the old one. */
export function useUploadRunbook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: RunbookInput) =>
      (await aiApi.post<Runbook>("/api/v1/runbooks", body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteRunbook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await aiApi.delete(`/api/v1/runbooks/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
