import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./breadcrumbs.meta.ts";
import { Breadcrumbs } from "./breadcrumbs.tsx";

function CompactExample() {
  return (
    <Breadcrumbs
      label="Compact breadcrumb"
      items={[
        { label: "Home", href: "#home" },
        { label: "Library", href: "#library" },
      ]}
      current="Navigation"
    />
  );
}

function DeepHierarchyExample() {
  return (
    <Breadcrumbs
      label="Deep breadcrumb"
      items={[
        { label: "Home", href: "#home" },
        { label: "Documentation", href: "#documentation" },
        { label: "Components", href: "#components" },
        { label: "Navigation", href: "#navigation" },
      ]}
      current="Breadcrumbs"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: CompactExample },
    { id: "deep", Example: DeepHierarchyExample },
  ],
);

export default function BreadcrumbsExamples() {
  return (
    <div className="discern-example-stack">
      <CompactExample />
      <DeepHierarchyExample />
    </div>
  );
}
