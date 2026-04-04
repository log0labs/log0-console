import { useQuery } from "@tanstack/react-query";
import { incidentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { IncidentDetail } from "@/types/incident";

export function useIncident(id: string) {
  const tenantId = useAuthStore((s) => s.tenantId);

  return useQuery<IncidentDetail>({
    queryKey: ["incident", id],
    queryFn: async () => {
      const { data } = await incidentsApi.get<IncidentDetail>(
        `/api/v1/incidents/${id}`,
        { params: { tenantId } }
      );
      return data;
    },
    enabled: !!tenantId && !!id,
    // Keep polling every 3 s until aiSummary is populated
    refetchInterval: (query) =>
      query.state.data?.aiSummary == null ? 3_000 : false,
  });
}
