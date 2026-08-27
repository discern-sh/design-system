import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Code block",
  slug: "code-block",
  group: "Editorial",
  order: 75,
  cli: { stance: "rendered" },
  description:
    "Literal, non-truncating preformatted code with optional language information, a specimen frame, and a lossless terminal wrapping policy.",
  purposes: ["building-documentation"],
  useWhen: [
    "Source whitespace and every code character must remain available without line numbers, a caption, or an executable terminal session.",
  ],
  notWhen: [
    "Use Code listing when source needs an editorial figure, filename, caption, highlighted lines, or stable line references.",
    "Use Terminal for a command transcript or recognisable shell session rather than source code.",
    "Use Raw output for collapsible machine output attached to an operational workflow.",
  ],
  accessibility: [
    "The React adapter renders native preformatted code, preserves the literal source as text content, and fixes non-ASCII fallback glyphs to their measured terminal cells.",
    "Language and parser information are exposed through discern-namespaced data hooks without assuming a syntax highlighter.",
    "The terminal renderer expands tabs to four-cell tab stops, makes unsafe control and format characters visible, and marks lossless continuations in its specimen frame without relying on colour.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "TypeScript source" },
    { id: "preserved-width", label: "Preserved long line" },
  ],
);

export default meta;
