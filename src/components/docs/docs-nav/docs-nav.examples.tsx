import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import meta, { componentExampleVocabulary } from "./docs-nav.meta.ts";
import { DocsNav } from "./docs-nav.tsx";

function SectionNavigationExample() {
  return (
    <DocsNav
      sections={[
        {
          title: "Orientation",
          items: [
            { label: "Overview", href: "#top", current: true },
            { label: "Getting started", href: "#components" },
            { label: "Concepts", href: "#group-docs" },
          ],
        },
        {
          title: "Reference",
          items: [
            { label: "Configuration", href: "#component-docs-nav" },
            { label: "Glossary", href: "#component-pager" },
          ],
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: SectionNavigationExample }],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "press-destination",
    label: "Destination pointer contact",
    example: "default",
    category: "interaction",
    sequence: [
      {
        action: "pointer-down",
        target: { role: "link", name: "Getting started" },
      },
      {
        checkpoint: {
          id: "docs-destination-pressed",
          label: "Destination pointer held",
        },
      },
      {
        action: "pointer-up",
        target: { role: "link", name: "Getting started" },
      },
    ],
  }] as const,
);

export default SectionNavigationExample;
