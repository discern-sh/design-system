import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Glossary term",
  slug: "glossary-term",
  group: "Docs",
  order: 90,
  cli: { stance: "rendered" },
  description:
    "Inline definition term with a keyboard-reachable, dotted-underlined hover card.",
  purposes: ["building-documentation"],
  useWhen: [
    "A term inside running prose needs a definition available on hover, keyboard focus, and touch without leaving the sentence.",
  ],
  notWhen: [
    "Use Hover card when the supplementary content needs headings, lists, or actions rather than a short definition.",
    "Use Tooltip for a brief hint about a control rather than the definition of a term.",
  ],
  accessibility: [
    "The semantic dfn trigger is always focusable, so the same definition available on hover is available from the keyboard and on touch focus.",
    "The trigger and card are connected through aria-details; the visible term is repeated as the card heading for context.",
    "Definition accepts phrasing content for valid placement inside prose; use Hover card block layout when the supplementary content needs headings, lists, or actions.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Inline definition",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
