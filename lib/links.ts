// Single source of truth for external/marketing URLs used across the console.
// Change WEBSITE here and every reference updates.

const WEBSITE = "https://log0.in";

export const links = {
  website: WEBSITE,
  docs: `${WEBSITE}/docs`,
  github: "https://github.com/ashmitjsg/log0-services",
} as const;
