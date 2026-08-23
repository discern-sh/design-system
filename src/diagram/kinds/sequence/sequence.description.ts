/** Stable, colour-independent structural description for sequence. */

import type { ValidatedSequenceDiagram } from "./sequence.spec.ts";

/** Name participants, then narrate every authored message and note in order. */
export default function describeSequenceDiagram(
  spec: ValidatedSequenceDiagram,
): string {
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    "Participants:",
  ];
  spec.participants.forEach((participant, index) => {
    lines.push(
      `${index + 1}. participant ${participant.id}: ${participant.label}`,
    );
    if (participant.annotation !== undefined) {
      lines.push(`   Annotation: ${participant.annotation}`);
    }
  });
  lines.push("Messages:");
  spec.messages.forEach((message, index) => {
    lines.push(
      `${
        index + 1
      }. ${message.kind} ${message.id}: ${message.source} to ${message.target}; label: ${message.label}`,
    );
  });
  lines.push("Notes:");
  if (spec.notes.length === 0) {
    lines.push("None.");
  } else {
    spec.notes.forEach((note, index) => {
      lines.push(
        `${
          index + 1
        }. ${note.attachment} note ${note.id} on ${note.attachmentId}: ${note.label}`,
      );
    });
  }
  return `${lines.join("\n")}\n`;
}
