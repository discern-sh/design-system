import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Diagram",
  slug: "diagram",
  group: "Editorial",
  order: 95,
  cli: { stance: "rendered" },
  description:
    "Accessible token-themed SVG projection for package-owned semantic diagram kinds.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "The relationships between authored entities are meaningful reference information that must survive browser, standalone SVG, and terminal projections.",
    "A typed package-owned diagram kind describes the subject without caller coordinates or drawing instructions.",
  ],
  notWhen: [
    "A surrounding title, caption, source, or legend is required; compose Diagram as DataFigure's visual instead of duplicating figure semantics.",
    "The visual is semantically disposable decoration; use Artwork with an empty alternative instead.",
    "The consumer owns a bespoke illustration or interactive explainer whose meaning cannot be expressed by a built-in diagram kind.",
    "Intuition, arbitrary coordinates, rich labels, or custom drawing callbacks would replace a cited or authored reference model.",
  ],
  accessibility: [
    "The spec's required title and summary name the SVG while the complete structural description preserves every node, annotation, labelled relationship, and direction.",
    "Title and summary are accessibility context, not visible canvas headings; surrounding document components own visible editorial prose.",
    "Node and connector roles pair colour with shape, double-border, or line-treatment cues.",
  ],
} satisfies ComponentMeta;
