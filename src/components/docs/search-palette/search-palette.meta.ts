import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Search palette",
  slug: "search-palette",
  group: "Docs",
  order: 50,
  cli: {
    stance: "exempt",
    reason:
      "Modal focus management, query input, and result activation belong to an interactive terminal driver.",
  },
  description:
    "Modal command-palette search on the native dialog element, with a search field, results region, and hint row.",
  purposes: ["building-documentation"],
  accessibility: [
    "The native dialog provides focus containment, Escape dismissal, and focus return to the opening control.",
    "The search input is name-labelled and focused on open; results are real links, not synthetic listbox options.",
    "A visible Close action provides an explicit pointer and keyboard dismissal path in addition to Escape and backdrop dismissal.",
    "Escape follows the platform search-input convention: it clears a non-empty query first, and closes the palette when the query is empty.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Search dialog", only: "web" }],
);

export default meta;
