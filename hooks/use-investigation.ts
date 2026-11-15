import { useQuery } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { investigationKeys } from "@/hooks/use-investigations";
import { ACTIVE_STATUSES, type Investigation } from "@/types/investigation";

/**
 * One investigation record. While it is running the record is re-read every few seconds as a safety
 * net; the event stream (use-investigation-events) invalidates it sooner when something happens.
 */
export function useInvestigation(id: string | null) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<Investigation>({
    queryKey: investigationKeys.one(id ?? ""),
    queryFn: async () => {
      const { data } = await aiApi.get<Investigation>(
        `/api/v1/investigations/${id}`
      );
      return data;
    },
    enabled: !!accessToken && !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.includes(status) ? 5000 : false;
    },
  });
}
