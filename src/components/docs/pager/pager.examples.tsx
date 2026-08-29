import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import meta, { componentExampleVocabulary } from "./pager.meta.ts";
import { Pager } from "./pager.tsx";

function AdjacentPagesExample() {
  return (
    <Pager
      previous={{ label: "Lorem ipsum", href: "#anchor-heading-lorem" }}
      next={{
        label: "Consectetur adipiscing",
        href: "#anchor-heading-consectetur",
      }}
    />
  );
}

function NextPageOnlyExample() {
  return (
    <Pager
      label="First-page pagination"
      next={{ label: "Dolor sit amet", href: "#anchor-heading-lorem" }}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: AdjacentPagesExample },
    { id: "next-only", Example: NextPageOnlyExample },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "press-previous",
    label: "Previous pointer contact",
    example: "default",
    category: "interaction",
    sequence: [
      {
        action: "pointer-down",
        target: { selector: ".discern-pager__link--previous" },
      },
      {
        checkpoint: {
          id: "pager-previous-pressed",
          label: "Previous pointer held",
        },
      },
      {
        action: "pointer-up",
        target: { selector: ".discern-pager__link--previous" },
      },
    ],
  }] as const,
);

export default function PagerExamples() {
  return (
    <div className="discern-example-stack">
      <AdjacentPagesExample />
      <NextPageOnlyExample />
    </div>
  );
}
