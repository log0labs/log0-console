import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { incidentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type {
  Incident,
  IncidentFilters,
  IncidentStats,
  PageResponse,
} from "@/types/incident";

// The list page filters and pages on the server (useIncidentPage). The dashboard still needs many
// incidents for its trend and top services, so useIncidents loads pages up to MAX_PAGES (1,000 incidents);
// beyond that `truncated` says so. Exact totals come from useIncidentStats.
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

const LIST_SIZE = 20;

/** One page of the incident list, filtered and sorted by the server. Keeps the old page on screen while the next loads. */
export function useIncidentPage(filters: IncidentFilters, page: number) {
  const tenantId = useAuthStore((s) => s.tenantId);

  return useQuery({
    queryKey: ["incidents", tenantId, "page", filters, page],
    queryFn: async () => {
      const { data } = await incidentsApi.get<PageResponse<Incident>>(
        "/api/v1/incidents",
        {
          params: {
            tenantId,
            page,
            size: LIST_SIZE,
            sort: "lastSeenAt,desc",
            ...filters,
          },
        }
      );
      return data;
    },
    enabled: !!tenantId,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

/** Exact counts per status and severity, and the environments, for the whole tenant. */
export function useIncidentStats() {
  const tenantId = useAuthStore((s) => s.tenantId);

  return useQuery({
    queryKey: ["incidents", tenantId, "stats"],
    queryFn: async () => {
      const { data } = await incidentsApi.get<IncidentStats>(
        "/api/v1/incidents/stats",
        { params: { tenantId } }
      );
      return data;
    },
    enabled: !!tenantId,
    refetchInterval: 30_000,
  });
}
