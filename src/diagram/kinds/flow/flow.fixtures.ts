/** Representative typed authoring cases shared by tests and future previews. */

import type { FlowDiagramSpec } from "./flow.spec.ts";

const fixtures = [
  {
    kind: "flow",
    title: "Review a proposed change",
    summary: "A review either accepts the change or returns it for revision.",
    nodes: [
      { id: "draft", label: "Draft change", role: "start" },
      { id: "review", label: "Review evidence", role: "decision" },
      {
        id: "revise",
        label: "Revise the proposal",
        annotation: "Address each finding",
      },
      { id: "accept", label: "Accept change", role: "end" },
    ],
    edges: [
      { id: "submit", from: "draft", to: "review" },
      {
        id: "approved",
        from: "review",
        to: "accept",
        label: "Evidence is sufficient",
      },
      {
        id: "changes",
        from: "review",
        to: "revise",
        label: "Changes requested",
        emphasis: "secondary",
      },
      {
        id: "retry",
        from: "revise",
        to: "review",
        label: "Review again",
        emphasis: "return",
      },
    ],
  },
  {
    kind: "flow",
    title: "Publish reference material",
    summary:
      "Authoring, checking, and publication progress from left to right.",
    direction: "left-to-right",
    nodes: [
      { id: "author", label: "Author source", role: "start" },
      { id: "check", label: "Run checks" },
      { id: "publish", label: "Publish reference", role: "end" },
    ],
    edges: [
      { id: "ready", from: "author", to: "check" },
      { id: "green", from: "check", to: "publish" },
    ],
  },
] as const satisfies readonly FlowDiagramSpec[];

export default fixtures;
