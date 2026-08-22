// Single source of truth for external/marketing URLs used across the console.
// Change WEBSITE here and every reference updates.

const WEBSITE = "https://log0.in";

export const links = {
  website: WEBSITE,
  docs: `${WEBSITE}/docs`,
  blog: `${WEBSITE}/blog`,
  blogSeries: "https://engineeringwithashmit.hashnode.dev/series/log0",
  github: "https://github.com/log0labs",
  // Support link shown on the auth pages while the hosted backend is being set up.
  // Swap this single value if the support destination changes (Ko-fi / Sponsors / etc).
  support: "https://ko-fi.com/ashmitjsg",
} as const;
