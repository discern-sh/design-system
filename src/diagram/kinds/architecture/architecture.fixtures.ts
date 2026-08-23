/** Product-neutral architecture cases shared by tests and previews. */

import type { ArchitectureDiagramSpec } from "./architecture.spec.ts";

const fixtures = [
  {
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
    groups: [
      {
        id: "managed-system",
        label: "Managed system",
        members: ["gateway", "worker", "records"],
      },
    ],
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
  },
  {
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
      {
        id: "read",
        from: "source",
        to: "transform",
        label: "Read source",
      },
      {
        id: "write",
        from: "transform",
        to: "reference",
        label: "Write reference",
      },
    ],
  },
  {
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
  },
] as const satisfies readonly ArchitectureDiagramSpec[];

export default fixtures;
