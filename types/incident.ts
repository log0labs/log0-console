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

export interface StatusHistoryEntry {
  status: IncidentStatus;
  changedAt: string;
  changedBy?: string;
}

export interface IncidentAssignment {
  assignmentId?: string;
  assignedToUserId: string;
  assignedByUserId: string;
  assignedAt: string;
  notes?: string | null;
}

export interface IncidentDetail extends Incident {
  statusHistory?: StatusHistoryEntry[];
  assignment?: IncidentAssignment | null;
}

export interface IncidentLog {
  logId: string;
  timestamp: string;
  level: string;
  message: string;
  trace?: string;
}

export interface IncidentLogsPage {
  content: IncidentLog[];
  totalElements: number;
  totalPages: number;
  number: number;
}
