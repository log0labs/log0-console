import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { Runbook, RunbookDetail, RunbookInput } from "@/types/runbook";

const KEY = ["runbooks"] as const;

export function useRunbooks() {
  const enabled = !!useAuthStore((s) => s.accessToken);
  return useQuery<Runbook[]>({
    queryKey: KEY,
    queryFn: async () => (await aiApi.get<Runbook[]>("/api/v1/runbooks")).data,
    enabled,
  });
}

/** One runbook with its text, for the viewer. */
export function useRunbook(id: string | null) {
  const enabled = !!useAuthStore((s) => s.accessToken) && !!id;
  return useQuery<RunbookDetail>({
    queryKey: [...KEY, id],
    queryFn: async () =>
      (await aiApi.get<RunbookDetail>(`/api/v1/runbooks/${id}`)).data,
    enabled,
  });
}

/** The uploaded PDF or Word file as a Blob (needs the auth header, so it cannot be a plain link). */
export async function fetchRunbookFile(id: string): Promise<Blob> {
  const { data } = await aiApi.get<Blob>(`/api/v1/runbooks/${id}/file`, {
    responseType: "blob",
  });
  return data;
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
