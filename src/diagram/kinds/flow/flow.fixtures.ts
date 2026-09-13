/** Canonical product-neutral Flow release evidence. */

import {
  defineDiagramKindReleaseCorpus,
  diagramReleaseFixtures,
} from "../../kind-meta.ts";
import type { FlowDiagramSpec } from "./flow.spec.ts";

const representative = {
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
} as const satisfies FlowDiagramSpec;

const horizontal = {
  kind: "flow",
  title: "Publish reference material",
  summary: "Authoring, checking, and publication progress from left to right.",
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
} as const satisfies FlowDiagramSpec;

const minimum = {
  kind: "flow",
  title: "Complete one step",
  summary: "One starting fact progresses directly to one completed fact.",
  nodes: [
    { id: "start", label: "Start", role: "start" },
    { id: "complete", label: "Complete", role: "end" },
  ],
  edges: [{ id: "progress", from: "start", to: "complete" }],
} as const satisfies FlowDiagramSpec;

const longText = {
  kind: "flow",
  title: "Compare multilingual reference evidence",
  summary:
    "Latin, 中文, العربية, combining café, punctuation, and mono annotations stay legible.",
  direction: "left-to-right",
  nodes: [
    { id: "collect", label: "Collect 中文 reference evidence", role: "start" },
    {
      id: "compare",
      label: "Compare العربية and café examples",
      annotation: "check --target=reference/v2",
    },
    { id: "record", label: "Record the supported conclusion", role: "end" },
  ],
  edges: [
    { id: "inspect", from: "collect", to: "compare" },
    { id: "retain", from: "compare", to: "record" },
  ],
} as const satisfies FlowDiagramSpec;

const maximumDensity = {
  kind: "flow",
  title: "Coordinate a bounded fifteen-node flow",
  summary:
    "Two bounded branches expand to four lanes and converge before completion.",
  nodes: [
    { id: "start", label: "Start", role: "start" as const },
    { id: "branch", label: "Choose branch", role: "decision" as const },
    { id: "branch-a", label: "Choose lane A", role: "decision" as const },
    { id: "branch-b", label: "Choose lane B", role: "decision" as const },
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `first-${index + 1}`,
      label: `First ${index + 1}`,
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `second-${index + 1}`,
      label: `Second ${index + 1}`,
    })),
    { id: "merge-a", label: "Merge A" },
    { id: "merge-b", label: "Merge B" },
    { id: "complete", label: "Complete", role: "end" as const },
  ],
  edges: [
    { id: "begin", from: "start", to: "branch" },
    {
      id: "choose-a",
      from: "branch",
      to: "branch-a",
      label: "Branch A",
    },
    {
      id: "choose-b",
      from: "branch",
      to: "branch-b",
      label: "Branch B",
    },
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `open-${index + 1}`,
      from: index < 2 ? "branch-a" : "branch-b",
      to: `first-${index + 1}`,
      label: `Lane ${index + 1}`,
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `first-second-${index + 1}`,
      from: `first-${index + 1}`,
      to: `second-${index + 1}`,
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `merge-${index + 1}`,
      from: `second-${index + 1}`,
      to: index < 2 ? "merge-a" : "merge-b",
    })),
    { id: "close-a", from: "merge-a", to: "complete" },
    { id: "close-b", from: "merge-b", to: "complete" },
  ],
} satisfies FlowDiagramSpec;

const labelledFanOut = {
  kind: "flow",
  title: "Partition and rejoin a batch",
  summary:
    "One decision fans out to four labelled lanes that converge again.",
  nodes: [
    { id: "open", label: "Open the batch", role: "start" as const },
    { id: "split", label: "Partition work", role: "decision" as const },
    { id: "lane-a", label: "Transform partition A" },
    { id: "lane-b", label: "Transform partition B" },
    { id: "lane-c", label: "Transform partition C" },
    { id: "lane-d", label: "Transform partition D" },
    { id: "join", label: "Join results" },
    { id: "close", label: "Close the batch", role: "end" as const },
  ],
  edges: [
    { id: "start", from: "open", to: "split" },
    { id: "assign-a", from: "split", to: "lane-a", label: "Key range one" },
    { id: "assign-b", from: "split", to: "lane-b", label: "Key range two" },
    { id: "assign-c", from: "split", to: "lane-c", label: "Key range three" },
    { id: "assign-d", from: "split", to: "lane-d", label: "Key range four" },
    { id: "collect-a", from: "lane-a", to: "join" },
    { id: "collect-b", from: "lane-b", to: "join" },
    { id: "collect-c", from: "lane-c", to: "join" },
    { id: "collect-d", from: "lane-d", to: "join" },
    { id: "finish", from: "join", to: "close" },
    {
      id: "rebalance",
      from: "join",
      to: "split",
      emphasis: "return" as const,
      label: "Rebalance",
    },
  ],
} satisfies FlowDiagramSpec;

/** Package-owned Flow corpus; every projection derives from these specs. */
export const releaseCorpus = defineDiagramKindReleaseCorpus(
  {
    kind: "flow",
    cases: [
      {
        name: "branch-and-return",
        postures: ["representative", "structural", "semantic-roles"],
        spec: representative,
      },
      { name: "horizontal", postures: ["structural"], spec: horizontal },
      { name: "minimum", postures: ["minimal"], spec: minimum },
      { name: "long-text", postures: ["long-text"], spec: longText },
      {
        name: "maximum-density",
        postures: ["maximum-density"],
        spec: maximumDensity,
      },
      {
        name: "labelled-fan-out",
        postures: ["maximum-density"],
        spec: labelledFanOut,
      },
    ],
    overBudget: {
      dimension: "nodes",
      authorAction: "split-overview",
      spec: {
        ...maximumDensity,
        nodes: [...maximumDensity.nodes, { id: "overflow", label: "Overflow" }],
      },
    },
    invalid: [
      {
        name: "unexpected-renderer-field",
        code: "diagram/invalid-spec",
        spec: { ...minimum, renderer: "host" },
      },
      {
        name: "bidi-title",
        code: "diagram/invalid-text",
        spec: { ...minimum, title: "Unsafe\u202Etitle" },
      },
    ],
  } as const,
);

const fixtures = diagramReleaseFixtures(releaseCorpus);

export default fixtures;
