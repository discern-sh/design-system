/** Stable, locale-independent structural description for calendar timelines. */

import type { ValidatedTimelineDiagram } from "./timeline.spec.ts";

/** Describe every boundary, row, half-open task, and one-date milestone. */
export default function describeTimelineDiagram(
  spec: ValidatedTimelineDiagram,
): string {
  const duration = spec.range.end.ordinal - spec.range.start.ordinal;
  const rowById = new Map(spec.rows.map((row) => [row.id, row]));
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    `Range: ${spec.range.start.iso} to ${spec.range.end.iso} (end exclusive; ${duration} days)`,
    "Groups:",
  ];
  spec.groups.forEach((group, groupIndex) => {
    lines.push(`${groupIndex + 1}. group ${group.id}: ${group.label}`);
    if (group.annotation !== undefined) {
      lines.push(`   Annotation: ${group.annotation}`);
    }
    spec.rows.filter((row) => row.groupId === group.id).forEach(
      (row, rowIndex) => {
        lines.push(`   ${rowIndex + 1}. row ${row.id}: ${row.label}`);
      },
    );
  });
  lines.push("Tasks:");
  if (spec.tasks.length === 0) lines.push("None.");
  spec.tasks.forEach((task, index) => {
    const row = rowById.get(task.rowId);
    const taskDuration = task.end.ordinal - task.start.ordinal;
    lines.push(
      `${index + 1}. task ${task.id} on row ${task.rowId} in group ${
        row?.groupId ?? "unknown"
      }: ${task.label}; ${task.start.iso} to ${task.end.iso} (end exclusive; ${taskDuration} days)`,
    );
  });
  lines.push("Milestones:");
  if (spec.milestones.length === 0) lines.push("None.");
  spec.milestones.forEach((milestone, index) => {
    const row = rowById.get(milestone.rowId);
    lines.push(
      `${
        index + 1
      }. ${milestone.emphasis} milestone ${milestone.id} on row ${milestone.rowId} in group ${
        row?.groupId ?? "unknown"
      }: ${milestone.label}; date: ${milestone.date.iso}`,
    );
  });
  return `${lines.join("\n")}\n`;
}
