import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export interface ApiKey {
  keyId: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export function useApiKeys() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data } = await authApi.get<ApiKey[]>("/api/v1/api-keys");
      return data;
    },
    enabled: !!accessToken,
  });
}
