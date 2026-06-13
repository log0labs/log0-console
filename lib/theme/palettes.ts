/**
 * Palette registry - drives a future GitHub-style theme picker.
 *
 * Each palette is a full set of CSS-var values defined in app/globals.css.
 * The default ("cool") lives in :root / .dark. To add one:
 *   1. add CSS blocks  [data-palette="<id>"] (light) + .dark[data-palette="<id>"] (dark)
 *   2. add an entry below
 *   3. a picker sets `data-palette="<id>"` on <html> (light/dark stays on next-themes)
 *
 * `mode` describes which color schemes the palette ships swatches for.
 */
export type PaletteId = "cool";

export interface Palette {
  id: PaletteId;
  label: string;
  description: string;
  /** preview swatch (accent) for the picker */
  swatch: string;
}

export const PALETTES: Palette[] = [
  {
    id: "cool",
    label: "Cool",
    description:
      "Warm near-black surfaces, cool-tinted muted severities, signal green.",
    swatch: "#22c58a",
  },
];

export const DEFAULT_PALETTE: PaletteId = "cool";
