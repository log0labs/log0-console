"use client";

import { useAuthStore } from "@/store/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { SectionLabel } from "@/components/ui/section-label";

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>{label}</SectionLabel>
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <code className="flex-1 truncate font-mono text-sm">{value}</code>
        <CopyButton text={value} what={`${label} copied`} label={`Copy ${label}`} />
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const tenantId = useAuthStore((s) => s.tenantId);
  const role = useAuthStore((s) => s.role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your workspace identifiers and integration details.
        </p>
      </div>

      <Card>
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">
            Workspace Details
          </CardTitle>
          <CardDescription>
            Use the Tenant ID when ingesting logs via the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-5">
          <CopyField label="Tenant ID" value={tenantId ?? "-"} />

          <div className="flex flex-col gap-1.5">
            <SectionLabel>Your role</SectionLabel>
            <p className="text-sm font-medium">{role}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">
            Log Ingestion Endpoint
          </CardTitle>
          <CardDescription>
            Send logs to this endpoint using your API key and Tenant ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-5">
          <CopyField
            label="Endpoint"
            value={
              process.env.NEXT_PUBLIC_INGEST_URL ??
              "http://localhost:8080/api/v1/logs"
            }
          />

          <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Required headers</p>
            <div className="flex flex-col gap-1 font-mono">
              <span>
                <span className="text-primary">X-API-KEY</span>: your_api_key
              </span>
              <span>
                <span className="text-primary">X-SERVICE-NAME</span>:
                your-service
              </span>
              <span>
                <span className="text-primary">X-ENVIRONMENT</span>: production
              </span>
            </div>
            <p className="mt-2">
              Your tenant is derived from the API key - no tenant header needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
