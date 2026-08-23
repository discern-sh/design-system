/** Shared consumer-shaped Markdown diagram example for Catalogue and tests. */

import { diagramAltText } from "./accessibility.ts";
import type { FlowDiagramSpec } from "./kinds/flow/flow.spec.ts";

export const markdownDiagramExampleSpec = Object.freeze(
  {
    kind: "flow",
    title: "Review a change",
    summary:
      "A proposed change moves from drafting through review to approval.",
    direction: "left-to-right",
    nodes: Object.freeze([
      Object.freeze({ id: "draft", label: "Draft change", role: "start" }),
      Object.freeze({ id: "review", label: "Review evidence" }),
      Object.freeze({ id: "approve", label: "Approve change", role: "end" }),
    ]),
    edges: Object.freeze([
      Object.freeze({ id: "submit", from: "draft", to: "review" }),
      Object.freeze({ id: "accept", from: "review", to: "approve" }),
    ]),
  } as const satisfies FlowDiagramSpec,
);

export const markdownDiagramExampleSource =
  "generated/markdown-review-change.svg";
export const markdownDiagramExampleAlt = diagramAltText(
  markdownDiagramExampleSpec,
);
export const markdownDiagramExampleMarkdown = [
  "# Change lifecycle",
  "",
  `![${markdownDiagramExampleAlt}](${markdownDiagramExampleSource} \"${markdownDiagramExampleSpec.summary}\")`,
  "",
  "Continue with the [review guide](guide.md#review).",
].join("\n");
export const markdownDiagramExampleResource = Object.freeze({
  source: markdownDiagramExampleSource,
  spec: markdownDiagramExampleSpec,
});
