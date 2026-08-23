/** Canonical product-neutral Cycle release evidence. */

import {
  defineDiagramKindReleaseCorpus,
  diagramReleaseFixtures,
} from "../../kind-meta.ts";
import type { CycleDiagramSpec } from "./cycle.spec.ts";

const representative = {
  kind: "cycle",
  title: "Review the evidence loop",
  summary:
    "A small learning practice repeats observation, interpretation, action, and review.",
  stages: [
    { id: "observe", label: "Observe evidence" },
    { id: "interpret", label: "Interpret patterns" },
    { id: "act", label: "Try a focused change" },
    { id: "review", label: "Review the result" },
  ],
} as const satisfies CycleDiagramSpec;

const withHub = {
  kind: "cycle",
  title: "Maintain shared understanding",
  summary:
    "Each stage exchanges one named fact with a shared record before the cycle repeats.",
  stages: [
    {
      id: "collect",
      label: "Collect observations",
      annotation: "Keep source order",
    },
    {
      id: "compare",
      label: "Compare evidence",
      annotation: "Name disagreements",
    },
    { id: "decide", label: "Choose one adjustment" },
    { id: "evaluate", label: "Evaluate the outcome" },
  ],
  hub: { id: "record", label: "Shared record", annotation: "Current evidence" },
  spokes: [
    {
      id: "observations",
      stageId: "collect",
      direction: "to-hub",
      label: "New observations",
    },
    {
      id: "context",
      stageId: "compare",
      direction: "from-hub",
      label: "Prior context",
    },
    {
      id: "decision",
      stageId: "decide",
      direction: "to-hub",
      label: "Chosen adjustment",
    },
    {
      id: "baseline",
      stageId: "evaluate",
      direction: "from-hub",
      label: "Expected outcome",
    },
  ],
} as const satisfies CycleDiagramSpec;

const maximumDensity = {
  kind: "cycle",
  title: "Revisit eight concise stages",
  summary:
    "A supported dense loop exchanges one named fact per stage with shared context.",
  stages: Array.from({ length: 8 }, (_, index) => ({
    id: `stage-${index + 1}`,
    label: `Stage ${index + 1}`,
  })),
  hub: { id: "shared", label: "Shared context" },
  spokes: Array.from({ length: 8 }, (_, index) => ({
    id: `spoke-${index + 1}`,
    stageId: `stage-${index + 1}`,
    direction: index % 2 === 0 ? "to-hub" as const : "from-hub" as const,
    label: `Fact ${index + 1}`,
  })),
} satisfies CycleDiagramSpec;

const minimum = {
  kind: "cycle",
  title: "Repeat three stages",
  summary: "Preparation, action, and review form one explicit repeating order.",
  stages: [
    { id: "prepare", label: "Prepare" },
    { id: "act", label: "Act" },
    { id: "review", label: "Review" },
  ],
} as const satisfies CycleDiagramSpec;

const longText = {
  kind: "cycle",
  title: "Repeat a multilingual learning practice",
  summary:
    "中文, العربية, combining café, punctuation, and annotations stay upright around the loop.",
  stages: [
    {
      id: "notice",
      label: "Notice 中文 evidence",
      annotation: "source/ref:v2",
    },
    { id: "interpret", label: "فسّر evidence carefully" },
    { id: "adjust", label: "Adjust the café reference" },
    { id: "review", label: "Review punctuation: (a), [b], and c/d" },
  ],
  hub: { id: "record", label: "Shared evidence record" },
  spokes: [{
    id: "record-fact",
    stageId: "notice",
    direction: "to-hub",
    label: "Record the observed fact",
  }],
} as const satisfies CycleDiagramSpec;

/** Package-owned Cycle corpus; every projection derives from it. */
export const releaseCorpus = defineDiagramKindReleaseCorpus(
  {
    kind: "cycle",
    cases: [
      {
        name: "ordered-loop",
        postures: ["representative", "structural"],
        spec: representative,
      },
      {
        name: "hub-exchange",
        postures: ["structural", "semantic-roles"],
        spec: withHub,
      },
      {
        name: "maximum-density",
        postures: ["maximum-density"],
        spec: maximumDensity,
      },
      { name: "minimum", postures: ["minimal"], spec: minimum },
      { name: "long-text", postures: ["long-text"], spec: longText },
    ],
    overBudget: {
      dimension: "stages",
      authorAction: "split-overview",
      spec: {
        ...minimum,
        stages: Array.from({ length: 9 }, (_, index) => ({
          id: `stage-${index + 1}`,
          label: `Stage ${index + 1}`,
        })),
      },
    },
    invalid: [
      {
        name: "unexpected-animation-field",
        code: "diagram/invalid-spec",
        spec: { ...minimum, animated: true },
      },
      {
        name: "duplicate-stage",
        code: "diagram/duplicate-id",
        spec: {
          ...minimum,
          stages: [minimum.stages[0], minimum.stages[0], minimum.stages[2]],
        },
      },
    ],
  } as const,
);

const fixtures = diagramReleaseFixtures(releaseCorpus);

export default fixtures;
