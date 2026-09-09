import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
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
      current="Breadcrumbs with long current location names"
    />
  );
}

const breadcrumbsCapture = {
  selectors: [".discern-breadcrumbs li"],
} as const;

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: CompactExample, capture: breadcrumbsCapture },
    { id: "deep", Example: DeepHierarchyExample, capture: breadcrumbsCapture },
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

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "narrow-content",
    label: "Full content at narrow local width",
    example: "deep",
    category: "responsive",
    requirements: { inlineSize: 240 },
    sequence: [{
      checkpoint: {
        id: "breadcrumbs-narrow-content",
        label: "Names, current state, and actions remain visible",
      },
    }],
  }],
);
