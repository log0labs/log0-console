import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DeployTarget, DeployTargetConfig } from "@/lib/deploy-target";
import { aiApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const key = (repositoryId: string) => ["deploy-target", repositoryId] as const;

/** The deploy target of a repository, or null when none was set up (the service answers 404 then). */
export function useDeployTarget(repositoryId: string, enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<DeployTarget | null>({
    queryKey: key(repositoryId),
    enabled: !!accessToken && enabled,
    queryFn: async () => {
      try {
        return (await aiApi.get<DeployTarget>(`/api/v1/deploy-targets/${repositoryId}`)).data;
      } catch (error) {
        if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useSaveDeployTarget(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: DeployTargetConfig) =>
      (await aiApi.put<DeployTarget>(`/api/v1/deploy-targets/${repositoryId}`, config)).data,
    onSuccess: (saved) => queryClient.setQueryData(key(repositoryId), saved),
  });
}

export function useRemoveDeployTarget(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await aiApi.delete(`/api/v1/deploy-targets/${repositoryId}`);
    },
    onSuccess: () => queryClient.setQueryData(key(repositoryId), null),
  });
}

/** Has the GitHub App installation accepted the permissions deploying needs? `missing` names what the admin must approve in GitHub. */
export function useDeployAccess(installationId: number | null) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<{ canDeploy: boolean; missing: string[] }>({
    queryKey: ["deploy-access", installationId],
    enabled: !!accessToken && installationId !== null,
    queryFn: async () =>
      (await aiApi.get(`/api/v1/github/installations/${installationId}/deploy-access`)).data,
    staleTime: 60_000,
  });
}
