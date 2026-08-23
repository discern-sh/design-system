/** Stable, colour-independent structural description for cycle. */

import type { ValidatedCycleDiagram } from "./cycle.spec.ts";

/** Describe the repeating order, optional hub, and every directed spoke. */
export default function describeCycleDiagram(
  spec: ValidatedCycleDiagram,
): string {
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    "Repeats: yes; after the final stage, the sequence returns to stage 1.",
    "Stages in repeating order:",
  ];
  spec.stages.forEach((stage, index) => {
    lines.push(`${index + 1}. ${stage.id}: ${stage.label}`);
    if (stage.annotation !== undefined) {
      lines.push(`   Annotation: ${stage.annotation}`);
    }
  });
  if (spec.hub === undefined) {
    lines.push("Hub: none.");
  } else {
    lines.push(`Hub: ${spec.hub.id}: ${spec.hub.label}`);
    if (spec.hub.annotation !== undefined) {
      lines.push(`Hub annotation: ${spec.hub.annotation}`);
    }
  }
  lines.push("Hub relationships:");
  if (spec.spokes.length === 0) {
    lines.push("None.");
  } else {
    spec.spokes.forEach((spoke, index) => {
      const source = spoke.direction === "to-hub"
        ? spoke.stageId
        : spec.hub?.id ?? "hub";
      const target = spoke.direction === "to-hub"
        ? spec.hub?.id ?? "hub"
        : spoke.stageId;
      lines.push(
        `${
          index + 1
        }. ${spoke.id}: ${source} to ${target}; label: ${spoke.label}`,
      );
    });
  }
  return `${lines.join("\n")}\n`;
}
