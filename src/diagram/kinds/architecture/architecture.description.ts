/** Stable, colour-independent structural description for architecture. */

import type { ValidatedArchitectureDiagram } from "./architecture.spec.ts";

/** Describe every boundary, entity role, and directed relationship in order. */
export default function describeArchitectureDiagram(
  spec: ValidatedArchitectureDiagram,
): string {
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    `Direction: ${
      spec.direction === "left-to-right" ? "left to right" : "top to bottom"
    }`,
    "Boundaries:",
  ];
  if (spec.groups.length === 0) {
    lines.push("None.");
  } else {
    spec.groups.forEach((group, index) => {
      lines.push(`${index + 1}. boundary ${group.id}: ${group.label}`);
      lines.push(`   Members: ${group.members.join(", ")}`);
    });
  }
  const uncontained = spec.nodes.filter((node) => node.groupId === undefined);
  lines.push(
    `Uncontained nodes: ${
      uncontained.length === 0
        ? "none"
        : uncontained.map((node) => node.id).join(", ")
    }`,
    "Nodes:",
  );
  spec.nodes.forEach((node, index) => {
    lines.push(`${index + 1}. ${node.role} ${node.id}: ${node.label}`);
    lines.push(`   Boundary: ${node.groupId ?? "uncontained"}`);
    if (node.annotation !== undefined) {
      lines.push(`   Annotation: ${node.annotation}`);
    }
  });
  lines.push("Relationships:");
  spec.relationships.forEach((relationship, index) => {
    const emphasis = relationship.emphasis === "primary"
      ? "primary relationship"
      : relationship.emphasis === "secondary"
      ? "secondary relationship"
      : "return relationship";
    lines.push(
      `${
        index + 1
      }. ${emphasis} ${relationship.id}: ${relationship.from} to ${relationship.to}; label: ${relationship.label}`,
    );
  });
  return `${lines.join("\n")}\n`;
}
