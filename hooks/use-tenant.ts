import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export interface Tenant {
  tenantId: string;
  name: string;
  slug: string;
}

export function useTenant() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<Tenant>({
    queryKey: ["tenant"],
    queryFn: async () => (await authApi.get<Tenant>("/api/v1/tenants/me")).data,
    enabled: !!accessToken,
  });
}

export function useRenameTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      (await authApi.patch<Tenant>("/api/v1/tenants/me", { name })).data,
    onSuccess: (tenant) => queryClient.setQueryData(["tenant"], tenant),
  });
}
