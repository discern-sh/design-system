import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
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

export default SectionNavigationExample;
