import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type {
  GithubAppStatus,
  GithubInstallation,
  LinkInstallationInput,
  PrPolicy,
  PrPolicyInput,
  Repository,
} from "@/types/ai-config";

const KEYS = {
  app: ["github", "app"] as const,
  installations: ["github", "installations"] as const,
  repositories: ["repositories"] as const,
  policy: ["github", "policy"] as const,
};

function useEnabled() {
  return !!useAuthStore((s) => s.accessToken);
}

/** Whether this server has the log0 GitHub App, and the link to install it (it carries a short-lived state). */
export function useGithubApp() {
  const enabled = useEnabled();
  return useQuery<GithubAppStatus>({
    queryKey: KEYS.app,
    queryFn: async () =>
      (await aiApi.get<GithubAppStatus>("/api/v1/github/app")).data,
    enabled,
    staleTime: 60_000,
  });
}

export function useInstallations() {
  const enabled = useEnabled();
  return useQuery<GithubInstallation[]>({
    queryKey: KEYS.installations,
    queryFn: async () =>
      (await aiApi.get<GithubInstallation[]>("/api/v1/github/installations"))
        .data,
    enabled,
  });
}

export function useLinkInstallation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: LinkInstallationInput) =>
      (
        await aiApi.post<GithubInstallation>(
          "/api/v1/github/installations",
          body
        )
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: KEYS.installations }),
  });
}

export function useUnlinkInstallation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (installationId: number) => {
      await aiApi.delete(`/api/v1/github/installations/${installationId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEYS.installations });
      void queryClient.invalidateQueries({ queryKey: KEYS.repositories });
    },
  });
}

/** Let log0 open draft pull requests on one repository (or stop it). */
export function useSetRepositoryWrites() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { repositoryId: string; enabled: boolean }) =>
      (
        await aiApi.put<Repository>(
          `/api/v1/github/repositories/${v.repositoryId}/writes`,
          { enabled: v.enabled }
        )
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: KEYS.repositories }),
  });
}

export function usePrPolicy() {
  const enabled = useEnabled();
  return useQuery<PrPolicy>({
    queryKey: KEYS.policy,
    queryFn: async () => (await aiApi.get<PrPolicy>("/api/v1/github/policy")).data,
    enabled,
  });
}

export function useSavePrPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PrPolicyInput) =>
      (await aiApi.put<PrPolicy>("/api/v1/github/policy", body)).data,
    onSuccess: (data) => queryClient.setQueryData(KEYS.policy, data),
  });
}

export function useResetPrPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await aiApi.delete("/api/v1/github/policy");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.policy }),
  });
}
