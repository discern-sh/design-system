import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Blockquote",
  slug: "blockquote",
  group: "Editorial",
  order: 55,
  cli: { stance: "rendered" },
  description:
    "A neutral block quotation that preserves composed document structure without adding attribution or editorial framing.",
  purposes: ["building-documentation"],
  useWhen: [
    "Quoted material contains one or more ordinary semantic blocks, including nested lists, headings, code, or quotations.",
  ],
  notWhen: [
    "Use Pull quote when the quotation needs authored quote marks, attribution, citation, or a display treatment.",
    "Use Callout when the content is a highlighted note with a semantic tone rather than quoted material.",
  ],
  accessibility: [
    "The React adapter renders a native blockquote and preserves the semantics of every child block.",
    "The terminal renderer repeats its capability-aware rail on every line, including intentional blank lines, without relying on colour for quotation meaning.",
  ],
} satisfies ComponentMeta;
