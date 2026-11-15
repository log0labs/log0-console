import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type {
  AiSetting,
  AiSettingInput,
  ConnectRepositoryInput,
  ConnectionCheck,
  Purpose,
  Repository,
  ServiceRepository,
} from "@/types/ai-config";

const KEYS = {
  settings: ["ai-settings"] as const,
  repositories: ["repositories"] as const,
  services: ["service-repositories"] as const,
};

function useEnabled() {
  return !!useAuthStore((s) => s.accessToken);
}

// ------------------------------------------------------------------ AI settings

export function useAiSettings() {
  const enabled = useEnabled();
  return useQuery<AiSetting[]>({
    queryKey: KEYS.settings,
    queryFn: async () =>
      (await aiApi.get<AiSetting[]>("/api/v1/ai-settings")).data,
    enabled,
  });
}

export function useSaveAiSetting(purpose: Purpose) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: AiSettingInput) =>
      (await aiApi.put<AiSetting>(`/api/v1/ai-settings/${purpose}`, body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.settings }),
  });
}

export function useResetAiSetting(purpose: Purpose) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await aiApi.delete(`/api/v1/ai-settings/${purpose}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.settings }),
  });
}

/** Try a provider, model and key without saving anything. */
export function useTestAiSetting(purpose: Purpose) {
  return useMutation({
    mutationFn: async (body: AiSettingInput) =>
      (
        await aiApi.post<ConnectionCheck>(
          `/api/v1/ai-settings/${purpose}/test`,
          body
        )
      ).data,
  });
}

// ------------------------------------------------------------------ repositories

export function useRepositories() {
  const enabled = useEnabled();
  return useQuery<Repository[]>({
    queryKey: KEYS.repositories,
    queryFn: async () =>
      (await aiApi.get<Repository[]>("/api/v1/repositories")).data,
    enabled,
  });
}

export function useConnectRepository() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ConnectRepositoryInput) =>
      (await aiApi.post<Repository>("/api/v1/repositories", body)).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: KEYS.repositories }),
  });
}

export function useDisconnectRepository() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await aiApi.delete(`/api/v1/repositories/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEYS.repositories });
      void queryClient.invalidateQueries({ queryKey: KEYS.services });
    },
  });
}

export function useServiceRepositories() {
  const enabled = useEnabled();
  return useQuery<ServiceRepository[]>({
    queryKey: KEYS.services,
    queryFn: async () =>
      (await aiApi.get<ServiceRepository[]>("/api/v1/service-repositories"))
        .data,
    enabled,
  });
}

export function useMapService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      serviceName: string;
      repositoryId: string;
      pathPrefix: string;
    }) =>
      (
        await aiApi.put<ServiceRepository>(
          `/api/v1/service-repositories/${encodeURIComponent(v.serviceName)}`,
          { repositoryId: v.repositoryId, pathPrefix: v.pathPrefix }
        )
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.services }),
  });
}

export function useUnmapService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceName: string) => {
      await aiApi.delete(
        `/api/v1/service-repositories/${encodeURIComponent(serviceName)}`
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.services }),
  });
}
