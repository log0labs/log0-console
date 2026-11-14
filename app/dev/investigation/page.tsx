import { notFound } from "next/navigation";

import { InvestigationPreview } from "./preview";

/** Developer preview of the investigation screen with sample data. Not available in production. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <InvestigationPreview />;
}
