import { useQuery } from "@tanstack/react-query";
import { incidentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { IncidentLogsPage } from "@/types/incident";

export function useIncidentLogs(incidentId: string) {
  const tenantId = useAuthStore((s) => s.tenantId);

  return useQuery<IncidentLogsPage>({
    queryKey: ["incident-logs", incidentId],
    queryFn: async () => {
      const { data } = await incidentsApi.get<IncidentLogsPage>(
        `/api/v1/incidents/${incidentId}/logs`,
        { params: { tenantId, page: 0, size: 20 } }
      );
      return data;
    },
    enabled: !!tenantId && !!incidentId,
  });
}
