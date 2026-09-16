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
    "Modal command-palette search on the native dialog element, with a search field, results region, and hint row, controlled by React or rendered as static markup a consumer script drives.",
  purposes: ["building-documentation"],
  useWhen: [
    "A documentation or application shell needs one keyboard-reachable search dialog whose results are destinations.",
    "Static HTML needs the dialog's markup, field, close control, and results anatomy while the consumer's own script owns opening, querying, and selection; omitting `onOpenChange` renders the dialog closed with `data-discern-search-palette` on it, `data-discern-search-palette-input` on the field, and `data-discern-search-palette-close` on the close control, and nothing else in the markup handles them.",
  ],
  notWhen: [
    "Use Dialog for a confirmation or form; the palette's field and results region assume a query.",
  ],
  accessibility: [
    "The native dialog provides focus containment, Escape dismissal, and focus return to the opening control; in static mode the consumer script that opens it also focuses the field and supplies the fallback for a reader without showModal().",
    "The search input is name-labelled and, in controlled mode, focused on open; controlled results are real links, while a static consumer renders role=option items into Search palette list and drives selection through aria-activedescendant on the field.",
    "A visible Close action provides an explicit pointer and keyboard dismissal path in addition to Escape and backdrop dismissal; closeAriaLabel names it when the derived name does not read well.",
    "Escape follows the platform search-input convention in controlled mode: it clears a non-empty query first, and closes the palette when the query is empty.",
    "Search palette status is a visually hidden polite live region for result counts and load state, and Search palette empty stays hidden until a consumer reveals it.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Search dialog", only: "web" },
  {
    id: "static",
    label: "Static markup",
    only: "web",
    reason:
      "The static contract exists so a consumer script can drive markup that shipped without hydration; a terminal renderer has no dialog to drive.",
  },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
