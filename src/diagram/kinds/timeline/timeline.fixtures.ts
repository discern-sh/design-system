/** Canonical product-neutral Timeline release evidence. */

import {
  defineDiagramKindReleaseCorpus,
  diagramReleaseFixtures,
} from "../../kind-meta.ts";
import type { TimelineDiagramSpec } from "./timeline.spec.ts";

const minimum = {
  kind: "timeline",
  title: "Prepare a short review window",
  summary: "A leap-day task leads to one dated approval gate.",
  range: { start: "2028-02-27", end: "2028-03-04" },
  groups: [{ id: "review", label: "Review window" }],
  rows: [{ id: "evidence", groupId: "review", label: "Evidence" }],
  tasks: [{
    id: "collect",
    rowId: "evidence",
    label: "Collect evidence",
    start: "2028-02-27",
    end: "2028-03-01",
  }],
  milestones: [{
    id: "approve",
    rowId: "evidence",
    label: "Approval complete",
    date: "2028-02-29",
  }],
} as const satisfies TimelineDiagramSpec;

const representative = {
  kind: "timeline",
  title: "Coordinate a phased plan",
  summary:
    "Research and delivery spans share a bounded calendar and critical gate.",
  range: { start: "2028-01-15", end: "2028-05-01" },
  groups: [
    {
      id: "discovery",
      label: "Discovery",
      annotation: "Questions before commitments",
    },
    { id: "delivery", label: "Delivery" },
  ],
  rows: [
    { id: "research", groupId: "discovery", label: "Research" },
    { id: "design", groupId: "discovery", label: "Design" },
    { id: "build", groupId: "delivery", label: "Build" },
    { id: "release", groupId: "delivery", label: "Release" },
  ],
  tasks: [
    {
      id: "survey",
      rowId: "research",
      label: "Survey reference cases",
      start: "2028-01-15",
      end: "2028-02-10",
    },
    {
      id: "model",
      rowId: "design",
      label: "Define the bounded model",
      start: "2028-02-01",
      end: "2028-03-01",
    },
    {
      id: "implement",
      rowId: "build",
      label: "Implement the selected plan",
      start: "2028-03-01",
      end: "2028-04-12",
    },
    {
      id: "verify",
      rowId: "release",
      label: "Verify the release candidate",
      start: "2028-04-12",
      end: "2028-04-26",
    },
  ],
  milestones: [
    {
      id: "scope-gate",
      rowId: "design",
      label: "Scope agreed",
      date: "2028-03-01",
    },
    {
      id: "launch-gate",
      rowId: "release",
      label: "Launch decision",
      date: "2028-04-26",
      emphasis: "critical",
    },
  ],
} as const satisfies TimelineDiagramSpec;

const longText = {
  kind: "timeline",
  title: "Plan a detailed reference update",
  summary:
    "Sequential work stays readable when labels approach supported limits.",
  range: { start: "2029-06-01", end: "2029-08-01" },
  groups: [{
    id: "documentation",
    label: "Reference documentation",
    annotation: "One bounded publication period",
  }],
  rows: [{
    id: "guide",
    groupId: "documentation",
    label: "Authoring and verification",
  }],
  tasks: [
    {
      id: "outline",
      rowId: "guide",
      label: "Outline the complete reader task and boundary",
      start: "2029-06-01",
      end: "2029-06-15",
    },
    {
      id: "draft",
      rowId: "guide",
      label: "Draft conservative explanatory examples",
      start: "2029-06-15",
      end: "2029-07-10",
    },
    {
      id: "check",
      rowId: "guide",
      label: "Check every public projection and fallback",
      start: "2029-07-10",
      end: "2029-07-26",
    },
  ],
  milestones: [{
    id: "publication",
    rowId: "guide",
    label: "Publication gate",
    date: "2029-07-26",
    emphasis: "critical",
  }],
} as const satisfies TimelineDiagramSpec;

const maximumDensity = {
  kind: "timeline",
  title: "Coordinate the supported plan inventory",
  summary:
    "One bounded plan carries twenty-eight tasks at the supported task boundary.",
  range: { start: "2030-01-01", end: "2030-05-01" },
  groups: [{ id: "group-1", label: "Supported plan" }],
  rows: Array.from({ length: 7 }, (_, index) => ({
    id: `row-${index + 1}`,
    groupId: "group-1",
    label: `Row ${index + 1}`,
  })),
  tasks: Array.from({ length: 28 }, (_, index) => {
    const segment = index % 4;
    return {
      id: `task-${index + 1}`,
      rowId: `row-${Math.floor(index / 4) + 1}`,
      label: `Task ${index + 1}`,
      start: segment === 0
        ? "2030-01-01"
        : segment === 1
        ? "2030-01-08"
        : segment === 2
        ? "2030-01-15"
        : "2030-01-22",
      end: segment === 0
        ? "2030-01-08"
        : segment === 1
        ? "2030-01-15"
        : segment === 2
        ? "2030-01-22"
        : "2030-02-01",
    };
  }),
  milestones: [],
} satisfies TimelineDiagramSpec;

/** Package-owned Timeline corpus; every projection derives from it. */
export const releaseCorpus = defineDiagramKindReleaseCorpus(
  {
    kind: "timeline",
    cases: [
      { name: "minimum", postures: ["minimal"], spec: minimum },
      {
        name: "phased-plan",
        postures: ["representative", "structural", "semantic-roles"],
        spec: representative,
      },
      { name: "long-text", postures: ["long-text"], spec: longText },
      {
        name: "maximum-density",
        postures: ["maximum-density"],
        spec: maximumDensity,
      },
    ],
    overBudget: {
      dimension: "rangeDays",
      authorAction: "shorten-range",
      spec: {
        ...minimum,
        range: { start: "2028-01-01", end: "2030-01-01" },
      },
    },
    invalid: [
      {
        name: "unexpected-timezone-field",
        code: "diagram/invalid-spec",
        spec: { ...minimum, timezone: "UTC" },
      },
      {
        name: "control-bearing-row",
        code: "diagram/invalid-text",
        spec: {
          ...minimum,
          rows: [{ ...minimum.rows[0], label: "Unsafe\u0000row" }],
        },
      },
    ],
  } as const,
);

const fixtures = diagramReleaseFixtures(releaseCorpus);

export default fixtures;
