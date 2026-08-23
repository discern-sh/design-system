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
] as const satisfies readonly ArchitectureDiagramSpec[];

export default fixtures;
