import { useQuery } from "@tanstack/react-query";
import { incidentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export interface LogEvent {
  eventId: string;
  tenantId: string;
  serviceName: string;
  environment: string;
  timestamp: string;
  level: string;
  message: string;
  messageTemplate?: string;
  fingerprint: string;
  traceId?: string;
}

export interface LogsPage {
  content: LogEvent[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface LogsFilter {
  service?: string;
  level?: string;
  from?: string; // ISO-8601
  to?: string; // ISO-8601
  page: number;
  size: number;
}

export function useLogs(filter: LogsFilter) {
  const tenantId = useAuthStore((s) => s.tenantId);

  return useQuery<LogsPage>({
    queryKey: ["logs", tenantId, filter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        tenantId: tenantId!,
        page: filter.page,
        size: filter.size,
      };
      if (filter.service) params.service = filter.service;
      if (filter.level) params.level = filter.level;
      if (filter.from) params.from = filter.from;
      if (filter.to) params.to = filter.to;

      const { data } = await incidentsApi.get<LogsPage>("/api/v1/logs", {
        params,
      });
      return data;
    },
    enabled: !!tenantId,
    placeholderData: (prev) => prev,
  });
}
