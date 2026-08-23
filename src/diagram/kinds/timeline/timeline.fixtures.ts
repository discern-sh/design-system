/** Generic calendar-plan cases shared by tests and Catalogue previews. */

import type { TimelineDiagramSpec } from "./timeline.spec.ts";

const fixtures = [
  {
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
  },
  {
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
  },
  {
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
  },
] as const satisfies readonly TimelineDiagramSpec[];

export default fixtures;
