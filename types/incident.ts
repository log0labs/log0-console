export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type IncidentStatus = "NEW" | "ASSIGNED" | "ACKNOWLEDGED" | "RESOLVED";

export interface Incident {
  incidentId: string;
  tenantId: string;
  fingerprint: string;
  serviceName: string;
  environment: string;
  severity: Severity;
  status: IncidentStatus;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  topMessages: string[];
  aiSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page (0-based)
  size: number;
  first: boolean;
  last: boolean;
}
