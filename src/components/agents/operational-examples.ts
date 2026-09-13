/** Dense, generic operational fixtures shared by the canonical Web and CLI examples. */
export const denseFleetRows = [
  {
    persona: "quill",
    branch: "agent/verification-runtime-checkout-alpha",
    status: "working",
    ahead: 3,
    behind: 0,
    meta: "Checking 24 report entries",
  },
  {
    persona: "forge",
    branch: "agent/verification-runtime-checkout-beta",
    status: "waiting",
    ahead: 2,
    meta: "Review requested; no action yet",
  },
  {
    persona: "orbit",
    branch: "agent/verification-runtime-checkout-gamma",
    status: "blocked",
    behind: 1,
    meta: "Required fixture is missing",
    nextAction:
      "Restore fixtures/checkout/expected.json, then rerun the failed check.",
  },
  {
    persona: "ember",
    branch: "agent/verification-runtime-checkout-delta",
    status: "done",
    ahead: 4,
    meta: "24 checks passed; evidence ready",
  },
] as const;

/** Routine tags mark supplied record boundaries; the decision turn is deliberately ungrouped. */
export const denseTranscriptTurns = [
  {
    speaker: "Reviewer",
    body: "Verify both checkout variants and keep the evidence.",
  },
  {
    speaker: "Agent",
    routineGroup: "Checking fixtures",
    aside: "09:13",
    body: "Read fixtures/checkout/alpha/expected.json.",
  },
  {
    speaker: "Agent",
    routineGroup: "Checking fixtures",
    aside: "09:14",
    body: "Read fixtures/checkout/beta/expected.json.",
  },
  {
    speaker: "Agent",
    routineGroup: "Checking fixtures",
    aside: "09:15",
    body: "Compared the two outputs; the beta fixture is missing one field.",
  },
  {
    speaker: "Agent",
    aside: "Decision · 09:16",
    body:
      "Keep the public output contract. Restore the missing fixture field before retrying.",
  },
  {
    speaker: "Reviewer",
    aside: "09:17",
    body: "Agreed. Report the exact failed check and its retry command.",
  },
] as const;

/** Completed routine runs never absorb active, failed, or unmarked records. */
export const denseWorklogEntries = [
  {
    label: "Read alpha fixture",
    status: "done",
    routineGroup: "Fixture inspection",
    meta: "09:13",
  },
  {
    label: "Read beta fixture",
    status: "done",
    routineGroup: "Fixture inspection",
    meta: "09:14",
  },
  {
    label: "Compare fixture fields",
    status: "done",
    routineGroup: "Fixture inspection",
    meta: "09:15",
    detail: "One required beta field is absent.",
  },
  {
    label: "Preserve the public output contract",
    status: "done",
    detail:
      "Decision: restore the fixture rather than changing the expected output.",
    meta: "09:16",
  },
  {
    label: "Check beta output",
    status: "failed",
    detail: "Restore the expected field, then run deno task test:checkout.",
    meta: "09:18",
  },
  { label: "Publish verification evidence", status: "queued" },
] as const;

/** Large evidence population includes similar paths distinguished only in their middle. */
export const denseVerificationReport = {
  title: "Checkout verification",
  stamp: "fail",
  summary: "Two fixture checks failed; publication is blocked.",
  nextAction:
    "Restore the alpha and beta expected fields, then run deno task test:checkout.",
  meta: [
    { label: "Branch", value: "agent/verification-runtime-checkout-beta" },
    { label: "Artifact", value: "verification-checkout-2026-09-13-beta-0042" },
  ],
  checks: [
    {
      label: "fixtures/checkout/alpha/expected.json",
      state: "fail",
      value: "Missing required field: deliveryWindow",
    },
    {
      label: "fixtures/checkout/beta/expected.json",
      state: "fail",
      value: "Missing required field: collectionWindow",
    },
    ...Array.from(
      { length: 21 },
      (_, index) => ({
        label: `Compatibility check ${index + 1}`,
        state: "pass" as const,
        value: "Matched expected output",
      }),
    ),
    {
      label: "Publish verification evidence",
      state: "skip",
      value: "Waiting for corrected fixtures",
    },
  ],
} as const;
