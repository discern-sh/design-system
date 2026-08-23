/** Representative typed authoring cases shared by tests and previews. */

import type { CycleDiagramSpec } from "./cycle.spec.ts";

const fixtures = [
  {
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
  },
  {
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
    hub: {
      id: "record",
      label: "Shared record",
      annotation: "Current evidence",
    },
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
  },
] as const satisfies readonly CycleDiagramSpec[];

export default fixtures;
