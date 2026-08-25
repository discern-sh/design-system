import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Markdown",
  slug: "markdown",
  group: "Editorial",
  order: 42,
  cli: { stance: "rendered" },
  description:
    "Safe CommonMark/GFM document rendering through one neutral parser model and the package's semantic browser and terminal Components.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "A consumer owns Markdown source and needs complete, safe browser or terminal document output without owning parser presentation logic.",
    "A standard Markdown image names a generated diagram or chart asset and an explicit source-to-spec resource should upgrade it on package-owned surfaces.",
  ],
  notWhen: [
    "Use Prose when the caller already owns semantic React or CLI block structure rather than Markdown source.",
    "Use Paragraph when one already-semantic unit of phrasing is the complete content.",
    "Use Code block for literal source that must not be parsed as Markdown.",
  ],
  accessibility: [
    "Native headings, lists, quotations, tables, code, images, and end-note relationships preserve the document hierarchy in source order.",
    "Heading ids are stable and duplicate-safe; footnote references and returns are descriptive keyboard-reachable links.",
    "Raw HTML is inert, unsafe destinations remain visible but non-clickable, and source controls become visible notation.",
    "Admitted isolated diagram and chart images must use the spec-derived alternative and matching optional summary title; drift rejects the whole document.",
  ],
} satisfies ComponentMeta;
