import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Search palette",
  slug: "search-palette",
  group: "Docs",
  order: 50,
  description:
    "Modal command-palette search on the native dialog element, with a search field, results region, and hint row.",
  accessibility: [
    "The native dialog provides focus containment, Escape dismissal, and focus return to the opening control.",
    "The search input is name-labelled and focused on open; results are real links, not synthetic listbox options.",
    "Escape follows the platform search-input convention: it clears a non-empty query first, and closes the palette when the query is empty.",
  ],
} satisfies ComponentMeta;
