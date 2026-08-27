import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
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

export default function PagerExamples() {
  return (
    <div className="discern-example-stack">
      <AdjacentPagesExample />
      <NextPageOnlyExample />
    </div>
  );
}
