"use client";

import { useSelectedLayoutSegment } from "next/navigation";

import { IncidentsList } from "@/components/incidents/incidents-list";
import { IncidentDrawer } from "@/components/incidents/incident-drawer";

export default function IncidentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Returns the active child segment value (the UUID) when at /incidents/:id,
  // or null when at /incidents.
  const incidentId = useSelectedLayoutSegment();

  return (
    <div className="relative h-full">
      {/* List always stays mounted - never unmounts when drawer opens */}
      <IncidentsList selectedId={incidentId} />

      {/* Drawer rendered as an overlay when a segment is active */}
      {incidentId && <IncidentDrawer incidentId={incidentId} />}

      {/* children is null from both page.tsx and [id]/page.tsx */}
      <span className="hidden">{children}</span>
    </div>
  );
}
