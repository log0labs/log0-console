"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { SidePanel } from "@/components/ui/side-panel";
import { IncidentDetail } from "./incident-detail";

export function IncidentDrawer({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const close = useCallback(() => router.push("/incidents"), [router]);

  return (
    <SidePanel title="Incident detail" onClose={close}>
      <IncidentDetail incidentId={incidentId} />
    </SidePanel>
  );
}
