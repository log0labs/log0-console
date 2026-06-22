"use client";

import AsciiField from "@/components/charfield/ascii-field";
import { flowfield } from "@/components/charfield/fields/flowfield";

/*
  Calm ASCII flowfield backdrop for the auth brand panel.
  Uses the charfield package (npx charfield add canvas flowfield) - non-interactive.
*/

export function AuthBackdrop({
  cell = 12,
  speed = 0.55,
  color = "#22c58a",
  dim = "rgba(34,197,138,0.18)",
}: {
  cell?: number;
  speed?: number;
  color?: string;
  dim?: string;
}) {
  return (
    <AsciiField
      field={flowfield}
      cell={cell}
      speed={speed}
      color={color}
      dim={dim}
      interactive={false}
    />
  );
}
