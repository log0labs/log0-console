import { useQuery } from "@tanstack/react-query";
import { incidentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { Incident, PageResponse } from "@/types/incident";

// Backend only filters by tenantId - fetch a large page and filter client-side.
const PAGE_SIZE = 100;

async function fetchIncidents(
  tenantId: string
): Promise<PageResponse<Incident>> {
  const { data } = await incidentsApi.get<PageResponse<Incident>>(
    "/api/v1/incidents",
    { params: { tenantId, page: 0, size: PAGE_SIZE, sort: "lastSeenAt,desc" } }
  );
  return data;
}

export function useIncidents() {
  const tenantId = useAuthStore((s) => s.tenantId);

  return useQuery({
    queryKey: ["incidents", tenantId],
    queryFn: () => fetchIncidents(tenantId!),
    enabled: !!tenantId,
    refetchInterval: 30_000,
  });
}
