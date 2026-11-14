import { useQuery } from "@tanstack/react-query";
import { incidentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { Incident, PageResponse } from "@/types/incident";

// The backend filters only by tenant, so the console loads pages and filters client-side.
// Every page is loaded up to MAX_PAGES (1,000 incidents); beyond that `truncated` says so.
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

export interface IncidentsData extends PageResponse<Incident> {
  /** True when the tenant has more incidents than were loaded. */
  truncated: boolean;
}

async function fetchPage(tenantId: string, page: number) {
  const { data } = await incidentsApi.get<PageResponse<Incident>>(
    "/api/v1/incidents",
    { params: { tenantId, page, size: PAGE_SIZE, sort: "lastSeenAt,desc" } }
  );
  return data;
}

async function fetchIncidents(tenantId: string): Promise<IncidentsData> {
  const first = await fetchPage(tenantId, 0);
  const lastPage = Math.min(first.totalPages, MAX_PAGES) - 1;
  const rest = await Promise.all(
    Array.from({ length: Math.max(lastPage, 0) }, (_, i) =>
      fetchPage(tenantId, i + 1)
    )
  );
  return {
    ...first,
    content: [first, ...rest].flatMap((p) => p.content),
    truncated: first.totalPages > MAX_PAGES,
  };
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
