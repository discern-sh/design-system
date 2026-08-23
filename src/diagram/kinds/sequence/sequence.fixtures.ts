/** Representative typed authoring cases shared by tests and previews. */

import type { SequenceDiagramSpec } from "./sequence.spec.ts";

const fixtures = [
  {
    kind: "sequence",
    title: "Coordinate a review",
    summary: "A requester delegates a check and receives the verified result.",
    participants: [
      {
        id: "requester",
        label: "Requester",
        annotation: "Starts the exchange",
      },
      { id: "coordinator", label: "Coordinator" },
      { id: "worker", label: "Worker", annotation: "Performs the check" },
    ],
    messages: [
      {
        id: "submit",
        source: "requester",
        target: "coordinator",
        label: "Submit request",
        kind: "call",
      },
      {
        id: "dispatch",
        source: "coordinator",
        target: "worker",
        label: "Dispatch check",
        kind: "signal",
      },
      {
        id: "verify",
        source: "worker",
        target: "worker",
        label: "Verify evidence",
        kind: "self",
      },
      {
        id: "result",
        source: "worker",
        target: "coordinator",
        label: "Return result",
        kind: "return",
      },
      {
        id: "reply",
        source: "coordinator",
        target: "requester",
        label: "Reply with outcome",
        kind: "return",
      },
    ],
    notes: [
      {
        id: "worker-scope",
        participantId: "worker",
        label: "Uses the recorded review criteria",
      },
      {
        id: "delivery",
        messageId: "dispatch",
        label: "Delivery may be deferred",
      },
    ],
  },
  {
    kind: "sequence",
    title: "Request one record",
    summary: "A reader asks a source for one stable record.",
    participants: [
      { id: "reader", label: "Reader" },
      { id: "source", label: "Source" },
    ],
    messages: [
      {
        id: "request",
        source: "reader",
        target: "source",
        label: "Request record",
        kind: "call",
      },
    ],
  },
] as const satisfies readonly SequenceDiagramSpec[];

export default fixtures;
