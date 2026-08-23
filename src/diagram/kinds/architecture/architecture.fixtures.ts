/** Canonical product-neutral Architecture release evidence. */

import {
  defineDiagramKindReleaseCorpus,
  diagramReleaseFixtures,
} from "../../kind-meta.ts";
import type { ArchitectureDiagramSpec } from "./architecture.spec.ts";

const representative = {
  kind: "architecture",
  title: "Process a submitted record",
  summary:
    "An external client enters a managed boundary that processes and stores one record.",
  direction: "left-to-right",
  nodes: [
    { id: "client", label: "External client", role: "external" },
    {
      id: "gateway",
      label: "Request gateway",
      annotation: "Validates the request",
      role: "focal",
    },
    { id: "worker", label: "Record processor", role: "service" },
    { id: "records", label: "Record store", role: "store" },
  ],
  groups: [{
    id: "managed-system",
    label: "Managed system",
    members: ["gateway", "worker", "records"],
  }],
  relationships: [
    {
      id: "submit",
      from: "client",
      to: "gateway",
      label: "Submit record",
      emphasis: "primary",
    },
    {
      id: "dispatch",
      from: "gateway",
      to: "worker",
      label: "Dispatch work",
      emphasis: "primary",
    },
    {
      id: "persist",
      from: "worker",
      to: "records",
      label: "Persist result",
      emphasis: "secondary",
    },
    {
      id: "outcome",
      from: "worker",
      to: "gateway",
      label: "Return outcome",
      emphasis: "return",
    },
  ],
} as const satisfies ArchitectureDiagramSpec;

const vertical = {
  kind: "architecture",
  title: "Transform a reference asset",
  summary:
    "A small top-to-bottom topology converts an external source into a stored reference.",
  direction: "top-to-bottom",
  nodes: [
    { id: "source", label: "Source asset", role: "external" },
    { id: "transform", label: "Asset transformer", role: "service" },
    { id: "reference", label: "Reference store", role: "store" },
  ],
  relationships: [
    { id: "read", from: "source", to: "transform", label: "Read source" },
    {
      id: "write",
      from: "transform",
      to: "reference",
      label: "Write reference",
    },
  ],
} as const satisfies ArchitectureDiagramSpec;

const dense = {
  kind: "architecture",
  title: "Coordinate bounded services",
  summary:
    "Two ownership boundaries expose a supported chain of labelled relationships.",
  direction: "left-to-right",
  nodes: Array.from({ length: 8 }, (_, index) => ({
    id: `entity-${index + 1}`,
    label: `Entity ${index + 1}`,
    role: index === 3 ? "focal" as const : "service" as const,
  })),
  groups: [
    {
      id: "boundary-a",
      label: "First boundary",
      members: ["entity-1", "entity-3", "entity-5", "entity-7"],
    },
    {
      id: "boundary-b",
      label: "Second boundary",
      members: ["entity-2", "entity-4", "entity-6", "entity-8"],
    },
  ],
  relationships: Array.from({ length: 7 }, (_, index) => ({
    id: `route-${index + 1}`,
    from: `entity-${index + 1}`,
    to: `entity-${index + 2}`,
    label: `Route ${index + 1}`,
    emphasis: index === 6 ? "secondary" as const : "primary" as const,
  })),
} satisfies ArchitectureDiagramSpec;

const minimum = {
  kind: "architecture",
  title: "Store one record",
  summary: "One service writes one stable store.",
  direction: "left-to-right",
  nodes: [
    { id: "service", label: "Service", role: "service" },
    { id: "store", label: "Store", role: "store" },
  ],
  relationships: [{
    id: "write",
    from: "service",
    to: "store",
    label: "Write record",
  }],
} as const satisfies ArchitectureDiagramSpec;

const longText = {
  kind: "architecture",
  title: "Locate multilingual services within one boundary",
  summary:
    "日本語, العربية, combining café, punctuation, and annotations retain their topology.",
  direction: "top-to-bottom",
  nodes: [
    { id: "outside", label: "外部 reference client", role: "external" },
    {
      id: "service",
      label: "خدمة معالجة السجل",
      annotation: "service/reference-api:v2",
      role: "focal",
    },
    { id: "store", label: "Café evidence repository", role: "store" },
  ],
  groups: [{
    id: "owned",
    label: "Managed reference boundary",
    members: ["service", "store"],
  }],
  relationships: [
    { id: "submit", from: "outside", to: "service", label: "Submit evidence" },
    { id: "persist", from: "service", to: "store", label: "Persist safely" },
  ],
} as const satisfies ArchitectureDiagramSpec;

const maximumDensity = {
  kind: "architecture",
  title: "Map twelve bounded entities",
  summary: "Four ownership boundaries contain a twelve-entity reference chain.",
  direction: "left-to-right",
  nodes: Array.from({ length: 12 }, (_, index) => ({
    id: `node-${index + 1}`,
    label: `Entity ${index + 1}`,
    role: index === 0
      ? "external" as const
      : index === 5
      ? "focal" as const
      : index === 11
      ? "store" as const
      : "service" as const,
  })),
  groups: Array.from({ length: 4 }, (_, index) => ({
    id: `group-${index + 1}`,
    label: `Boundary ${index + 1}`,
    members: Array.from(
      { length: 3 },
      (_, member) => `node-${index * 3 + member + 1}`,
    ),
  })),
  relationships: Array.from({ length: 11 }, (_, index) => ({
    id: `relationship-${index + 1}`,
    from: `node-${index + 1}`,
    to: `node-${index + 2}`,
    label: `Route ${index + 1}`,
  })),
} satisfies ArchitectureDiagramSpec;

/** Package-owned Architecture corpus; every projection derives from it. */
export const releaseCorpus = defineDiagramKindReleaseCorpus(
  {
    kind: "architecture",
    cases: [
      {
        name: "boundary-and-return",
        postures: ["representative", "structural", "semantic-roles"],
        spec: representative,
      },
      { name: "vertical", postures: ["structural"], spec: vertical },
      { name: "dense-preview", postures: ["structural"], spec: dense },
      { name: "minimum", postures: ["minimal"], spec: minimum },
      { name: "long-text", postures: ["long-text"], spec: longText },
      {
        name: "maximum-density",
        postures: ["maximum-density"],
        spec: maximumDensity,
      },
    ],
    overBudget: {
      dimension: "nodes",
      authorAction: "split-overview",
      spec: {
        ...maximumDensity,
        nodes: [...maximumDensity.nodes, {
          id: "overflow",
          label: "Overflow",
          role: "service" as const,
        }],
      },
    },
    invalid: [
      {
        name: "unexpected-layout-field",
        code: "diagram/invalid-spec",
        spec: { ...minimum, coordinates: true },
      },
      {
        name: "dangling-relationship",
        code: "diagram/dangling-reference",
        spec: {
          ...minimum,
          relationships: [{ ...minimum.relationships[0], to: "missing" }],
        },
      },
    ],
  } as const,
);

const fixtures = diagramReleaseFixtures(releaseCorpus);

export default fixtures;
