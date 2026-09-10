import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Table of contents",
  slug: "table-of-contents",
  group: "Editorial",
  order: 30,
  cli: { stance: "rendered" },
  description:
    "Compact article navigation with numbered sections, unnumbered nested entries, an optional reading-progress note, and a clear current-location state.",
  useWhen: [
    "A long article needs compact in-page navigation to its numbered sections and their nested entries, with an optional reading-progress note.",
    "The current reading location must be marked with aria-current under the consumer's own control.",
  ],
  notWhen: [
    "Use Docs nav for navigation between the pages and sections of a documentation site.",
    "Use Pager when the only navigation needed is to the previous and next page.",
  ],
  accessibility: [
    "Navigation uses native fragment links and browser history. Authors supply unique, focusable destinations and own current-location state; no scrollspy is installed.",
    "The component is a labelled navigation landmark and exposes the current location with aria-current.",
    "Nested entries remain visible text and omit a misleading section number.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Article contents",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
