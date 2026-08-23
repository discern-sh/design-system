/** Authored identity, guidance, budgets, and terminal posture for sequence. */

import {
  defineDiagramKindMeta,
  type DiagramKindMeta,
} from "../../kind-meta.ts";

const sequenceKindMeta: DiagramKindMeta = defineDiagramKindMeta(
  {
    name: "Sequence",
    slug: "sequence",
    order: 40,
    description:
      "An authored chronology of calls, signals, returns, and self-messages between stable participants.",
    useWhen: [
      "Reconstructing who communicates what and in which authored order.",
      "Documenting a restrained request, callback, relay, or recovery exchange.",
    ],
    notWhen: [
      "Showing service ownership or static topology; use architecture.",
      "Showing elapsed timing, activation bars, arbitrary timing lanes, or a protocol language.",
      "Explaining a process whose actors are incidental; use flow.",
    ],
    budgets: {
      participants: {
        limit: 5,
        unit: "participants",
        remedy: "reduce-participants",
        description:
          "Maximum stable participant columns in one readable exchange.",
      },
      messages: {
        limit: 14,
        unit: "messages",
        remedy: "split-overview",
        description:
          "Maximum authored interactions in one reference chronology.",
      },
      notes: {
        limit: 8,
        unit: "notes",
        remedy: "split-overview",
        description:
          "Maximum participant and message qualifications in one sequence.",
      },
      participantLabelGraphemes: {
        limit: 48,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum concise participant label length.",
      },
      annotationGraphemes: {
        limit: 72,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum participant annotation length.",
      },
      messageLabelGraphemes: {
        limit: 72,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum interaction label length.",
      },
      noteGraphemes: {
        limit: 96,
        unit: "graphemes",
        remedy: "shorten-label",
        description: "Maximum attached note length.",
      },
      participantLabelLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description:
          "Maximum participant label density after conservative wrapping.",
      },
      annotationLines: {
        limit: 2,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum participant annotation density after wrapping.",
      },
      messageLabelLines: {
        limit: 3,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description:
          "Maximum message label density after conservative wrapping.",
      },
      noteLines: {
        limit: 3,
        unit: "wrapped lines",
        remedy: "shorten-label",
        description: "Maximum attached-note density after wrapping.",
      },
      totalTextGraphemes: {
        limit: 1_200,
        unit: "graphemes",
        remedy: "split-overview",
        description:
          "Maximum total accessible wording in one interaction sequence.",
      },
      sceneExtent: {
        limit: 2_400,
        unit: "user-space units",
        remedy: "split-overview",
        description: "Maximum width or height of the final tight scene.",
      },
    },
    cli: { stance: "enhanced" },
  } as const,
);

export default sequenceKindMeta;
