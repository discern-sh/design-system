import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Chart",
  slug: "chart",
  group: "Editorial",
  order: 93,
  cli: { stance: "rendered" },
  description:
    "Accessible token-themed SVG projection for package-owned quantitative chart kinds.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "Measured quantities on scales are meaningful reference information that must survive browser, standalone SVG, and terminal projections.",
    "A typed package-owned chart kind describes the data without caller coordinates, renderer options, or drawing instructions.",
  ],
  notWhen: [
    "A surrounding title, caption, source, or legend is required; compose Chart as DataFigure's visual with its spec-derived series legend instead of duplicating figure semantics.",
    "The subject is identity and topology rather than quantities on scales; a semantic Diagram kind serves it.",
    "One headline number or a single progress fact is the whole story; Stat and Meter own those treatments.",
    "The consumer owns a bespoke visualization whose meaning cannot be expressed by a built-in chart kind.",
  ],
  accessibility: [
    "The spec's required title and summary name the SVG while its kind-specific structural description preserves every authored series, category, value, declared gap, and mechanical extreme.",
    "Title and summary are accessibility context, not visible canvas headings; surrounding document components own visible editorial prose.",
    "Every series slot pairs its colour with a stable non-colour identity — authored order, per-slot marker and fill glyphs, and a machine-tested colour-vision separation floor — so colour never carries a series alone.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Representative chart" },
    { id: "structural", label: "Structural variation" },
    { id: "dense-data", label: "Dense data" },
  ],
);

export default meta;
