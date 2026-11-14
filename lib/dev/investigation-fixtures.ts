// Sample investigations for the dev preview page and the unit tests. Not used in production code paths.

import type { Investigation, StreamEvent } from "@/types/investigation";

let seq = 0;
const T0 = Date.parse("2026-11-15T10:00:00Z");

function ev(type: string, payload: object = {}): StreamEvent {
  seq += 1;
  return {
    investigationId: "inv-demo",
    seq,
    type,
    payload,
    createdAt: new Date(T0 + seq * 4000).toISOString(),
  } as StreamEvent;
}

const DIFF = `diff --git a/inventory-api/src/lookup.js b/inventory-api/src/lookup.js
index 3f2a1b0..9c4d7e1 100644
--- a/inventory-api/src/lookup.js
+++ b/inventory-api/src/lookup.js
@@ -11,5 +11,5 @@ async function findProduct(sku) {
   const products = db.collection("products");
-  const row = await products.findOne({ sku: sku });
+  const row = await products.findOne({ sku: sku.toLowerCase() });
   if (!row) {
     throw new NotFoundError(sku);
   }
diff --git a/inventory-api/test/lookup.test.js b/inventory-api/test/lookup.test.js
new file mode 100644
--- /dev/null
+++ b/inventory-api/test/lookup.test.js
@@ -0,0 +1,4 @@
+test("finds a product regardless of SKU case", async () => {
+  const found = await findProduct("AB-100");
+  expect(found.sku).toBe("ab-100");
+});
`;

const early = () => [
  ev("investigation.started"),
  ev("context.loaded", {
    service: "inventory-api",
    environment: "prod",
    severity: "HIGH",
    occurrenceCount: 412,
    stackFrames: 6,
  }),
  ev("triage.completed", {
    category: "application",
    summary: "Lookups fail for upper-case SKUs",
    gather: ["logs", "code"],
    hypotheses: [],
  }),
  ev("evidence.added", {
    id: "e1",
    kind: "log",
    summary: "412 NotFoundError for SKUs like AB-100 in 10 minutes",
  }),
  ev("evidence.added", {
    id: "e2",
    kind: "code",
    summary: "lookup.js:14 queries sku exactly as given",
  }),
  ev("evidence.added", {
    id: "e3",
    kind: "commit",
    summary: "a91c3 removed toLowerCase() from findProduct",
    redacted: 2,
  }),
  ev("redaction.applied", { count: 2, kinds: { api_key: 2 } }),
  ev("gap.recorded", {
    message: "Runbooks were not searched (no runbooks uploaded)",
  }),
  ev("hypothesis.proposed", {
    id: "h1",
    statement: "SKU normalisation was removed from the lookup",
    status: "open",
    supportingEvidence: [],
    contradictingEvidence: [],
  }),
  ev("hypothesis.proposed", {
    id: "h2",
    statement: "The products collection lost its index",
    status: "open",
    supportingEvidence: [],
    contradictingEvidence: [],
  }),
  ev("hypothesis.updated", {
    id: "h1",
    statement: "SKU normalisation was removed from the lookup",
    status: "supported",
    supportingEvidence: ["e1", "e2", "e3"],
    contradictingEvidence: [],
  }),
  ev("hypothesis.updated", {
    id: "h2",
    statement: "The products collection lost its index",
    status: "refuted",
    supportingEvidence: [],
    contradictingEvidence: ["e1"],
  }),
];

const cause = () =>
  ev("root_cause.identified", {
    statement:
      "A recent commit removed the lower-casing of SKUs, so upper-case lookups no longer match the stored lower-case keys.",
    evidenceIds: ["e1", "e2", "e3"],
    hypothesisId: "h1",
    confidenceBand: "high",
    contributingFactors: ["No test covered SKU case"],
    unresolvedQuestions: [],
    recommendation: "Restore normalisation and add a test",
  });

function base(
  status: Investigation["status"],
  extra: Partial<Investigation> = {}
): Investigation {
  return {
    id: "inv-demo",
    incidentId: "inc-demo",
    requestedBy: "u1",
    status,
    question: null,
    scope: {
      logs: true,
      history: true,
      code: true,
      runbooks: true,
      docs: false,
    },
    provider: "groq",
    model: "gpt-oss-120b",
    promptVersion: "v3",
    graphVersion: "g2",
    repoSha: "a91c3f7d2b",
    rootCause: null,
    recommendation: null,
    diff: null,
    confidenceBand: null,
    error: null,
    inputTokens: null,
    outputTokens: null,
    costUsd: null,
    toolCallCount: null,
    startedAt: new Date(T0).toISOString(),
    completedAt: null,
    createdAt: new Date(T0).toISOString(),
    updatedAt: new Date(T0).toISOString(),
    ...extra,
  };
}

export interface Scenario {
  run: Investigation;
  events: StreamEvent[];
  review?: boolean;
}

export function scenarios(): Record<string, Scenario> {
  seq = 0;
  const completedEvents = [
    ...early(),
    cause(),
    ev("changes.proposed", {
      count: 2,
      files: [
        "inventory-api/src/lookup.js",
        "inventory-api/test/lookup.test.js",
      ],
      operations: ["modify", "add"],
    }),
    ev("changes.validated", { ok: true, issueCount: 0 }),
    ev("diff.generated", {
      bytes: 612,
      files: [
        {
          path: "inventory-api/src/lookup.js",
          operation: "modify",
          additions: 1,
          deletions: 1,
        },
        {
          path: "inventory-api/test/lookup.test.js",
          operation: "add",
          additions: 4,
          deletions: 0,
        },
      ],
    }),
    ev("investigation.completed"),
  ];
  const completed = base("COMPLETED", {
    rootCause: {
      statement:
        "A recent commit removed the lower-casing of SKUs, so upper-case lookups no longer match the stored lower-case keys.",
      hypothesisId: "h1",
      evidenceIds: ["e1", "e2", "e3"],
      affectedLocations: [
        {
          filePath: "inventory-api/src/lookup.js",
          line: 14,
          function: "findProduct",
        },
      ],
      contributingFactors: ["No test covered SKU case"],
      unresolvedQuestions: ["Are other lookups affected?"],
    },
    recommendation: {
      summary:
        "Restore SKU lower-casing in findProduct and add a regression test.",
      rationale: "The stored keys are lower-case; the query must match.",
      changes: [],
      risks: ["Existing clients sending mixed case start matching"],
      testsRequired: ["findProduct is case-insensitive"],
      verificationSteps: ["Replay the failing request for AB-100"],
    },
    diff: DIFF,
    confidenceBand: "high",
    inputTokens: 54210,
    outputTokens: 4180,
    costUsd: 0.0123,
    toolCallCount: 11,
    completedAt: new Date(T0 + 71000).toISOString(),
  });

  seq = 0;
  const runningEvents = early().slice(0, 7);
  seq = 0;
  const reviewEvents = [
    ...early(),
    cause(),
    ev("review.requested", {
      round: 1,
      refinesLeft: 2,
      rootCause: "A recent commit removed the lower-casing of SKUs.",
      confidenceBand: "high",
      evidenceIds: ["e1"],
      recommendation: "Restore normalisation and add a test",
    }),
  ];
  seq = 0;
  const failedEvents = [
    ...early().slice(0, 4),
    ev("investigation.failed", {
      error:
        "The model provider rate limit was reached. Try again in a few minutes.",
    }),
  ];

  return {
    completed: { run: completed, events: completedEvents },
    running: { run: base("RUNNING"), events: runningEvents },
    review: {
      run: base("AWAITING_REVIEW"),
      events: reviewEvents,
      review: true,
    },
    failed: {
      run: base("FAILED", {
        error:
          "The model provider rate limit was reached. Try again in a few minutes.",
      }),
      events: failedEvents,
    },
  };
}
