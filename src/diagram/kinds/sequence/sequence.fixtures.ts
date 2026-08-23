/** Canonical product-neutral Sequence release evidence. */

import {
  defineDiagramKindReleaseCorpus,
  diagramReleaseFixtures,
} from "../../kind-meta.ts";
import type { SequenceDiagramSpec } from "./sequence.spec.ts";

const representative = {
  kind: "sequence",
  title: "Coordinate a review",
  summary: "A requester delegates a check and receives the verified result.",
  participants: [
    { id: "requester", label: "Requester", annotation: "Starts the exchange" },
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
} as const satisfies SequenceDiagramSpec;

const minimum = {
  kind: "sequence",
  title: "Request one record",
  summary: "A reader asks a source for one stable record.",
  participants: [
    { id: "reader", label: "Reader" },
    { id: "source", label: "Source" },
  ],
  messages: [{
    id: "request",
    source: "reader",
    target: "source",
    label: "Request record",
    kind: "call",
  }],
} as const satisfies SequenceDiagramSpec;

const maximumDensity = {
  kind: "sequence",
  title: "Relay fourteen messages",
  summary: "Five participants exchange a bounded authored chronology.",
  participants: Array.from({ length: 5 }, (_, index) => ({
    id: `participant-${index + 1}`,
    label: `Participant ${index + 1}`,
  })),
  messages: Array.from({ length: 14 }, (_, index) => ({
    id: `message-${index + 1}`,
    source: `participant-${index % 5 + 1}`,
    target: `participant-${(index + 1) % 5 + 1}`,
    label: `Message ${index + 1}`,
    kind: index % 3 === 2 ? "return" as const : "call" as const,
  })),
} satisfies SequenceDiagramSpec;

const longText = {
  kind: "sequence",
  title: "Exchange multilingual reference facts",
  summary:
    "中文, العربية, combining café, punctuation, and mono annotations retain authored order.",
  participants: [
    {
      id: "reader",
      label: "中文 reader",
      annotation: "client/ref:v2",
    },
    { id: "service", label: "خدمة coordinator" },
    { id: "store", label: "Café store" },
  ],
  messages: [
    {
      id: "request",
      source: "reader",
      target: "service",
      label: "Request the complete reference record",
      kind: "call",
    },
    {
      id: "lookup",
      source: "service",
      target: "store",
      label: "Look up [stable] evidence (v2)",
      kind: "signal",
    },
    {
      id: "result",
      source: "store",
      target: "service",
      label: "Return the complete record",
      kind: "return",
    },
    {
      id: "reply",
      source: "service",
      target: "reader",
      label: "Reply without losing meaning",
      kind: "return",
    },
  ],
  notes: [{
    id: "contract",
    messageId: "lookup",
    label: "The lookup preserves punctuation, script, and source ordering",
  }],
} as const satisfies SequenceDiagramSpec;

/** Package-owned Sequence corpus; every projection derives from it. */
export const releaseCorpus = defineDiagramKindReleaseCorpus(
  {
    kind: "sequence",
    cases: [
      {
        name: "calls-signals-returns",
        postures: ["representative", "structural", "semantic-roles"],
        spec: representative,
      },
      { name: "minimum", postures: ["minimal"], spec: minimum },
      {
        name: "maximum-density",
        postures: ["maximum-density"],
        spec: maximumDensity,
      },
      { name: "long-text", postures: ["long-text"], spec: longText },
    ],
    overBudget: {
      dimension: "participants",
      authorAction: "reduce-participants",
      spec: {
        ...minimum,
        participants: Array.from({ length: 6 }, (_, index) => ({
          id: `participant-${index + 1}`,
          label: `Participant ${index + 1}`,
        })),
        messages: [{
          id: "request",
          source: "participant-1",
          target: "participant-2",
          label: "Request",
          kind: "call" as const,
        }],
      },
    },
    invalid: [
      {
        name: "unexpected-activation-field",
        code: "diagram/invalid-spec",
        spec: { ...minimum, activationBars: true },
      },
      {
        name: "dangling-participant",
        code: "diagram/dangling-reference",
        spec: {
          ...minimum,
          messages: [{ ...minimum.messages[0], target: "missing" }],
        },
      },
    ],
  } as const,
);

const fixtures = diagramReleaseFixtures(releaseCorpus);

export default fixtures;
