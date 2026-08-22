/** Stable, colour-independent structural description for flow. */

import type { ValidatedFlowDiagram } from "./flow.spec.ts";

/** Describe every accessible fact and directed relationship in rank order. */
export default function describeFlowDiagram(
  spec: ValidatedFlowDiagram,
): string {
  const nodeById = new Map(spec.nodes.map((node) => [node.id, node]));
  const orderedNodes = spec.ranks.flatMap((rank) =>
    rank.map((id) => nodeById.get(id)).filter((node) => node !== undefined)
  );
  const lines = [
    `Title: ${spec.title}`,
    `Summary: ${spec.summary}`,
    `Direction: ${
      spec.direction === "top-to-bottom" ? "top to bottom" : "left to right"
    }`,
    "Nodes:",
  ];
  orderedNodes.forEach((node, index) => {
    lines.push(`${index + 1}. ${node.role} ${node.id}: ${node.label}`);
    if (node.annotation !== undefined) {
      lines.push(`   Annotation: ${node.annotation}`);
    }
  });
  lines.push("Relationships:");
  spec.edges.forEach((edge, index) => {
    const emphasis = edge.emphasis === "return"
      ? "return"
      : edge.emphasis === "secondary"
      ? "secondary progression"
      : "primary progression";
    lines.push(
      `${index + 1}. ${emphasis} ${edge.id}: ${edge.from} to ${edge.to}${
        edge.label === undefined ? "" : `; label: ${edge.label}`
      }`,
    );
  });
  return `${lines.join("\n")}\n`;
}
