import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./anchor-heading.meta.ts";
import { AnchorHeading } from "./anchor-heading.tsx";

function SectionHeadingExample() {
  return (
    <AnchorHeading id="anchor-heading-lorem" level={2}>
      Lorem ipsum dolor
    </AnchorHeading>
  );
}

function NestedHeadingExample() {
  return (
    <AnchorHeading id="anchor-heading-consectetur" level={3}>
      Consectetur adipiscing elit
    </AnchorHeading>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: SectionHeadingExample },
    { id: "nested-heading", Example: NestedHeadingExample },
  ],
);

export default function AnchorHeadingExamples() {
  return (
    <div className="discern-example-stack">
      <SectionHeadingExample />
      <NestedHeadingExample />
    </div>
  );
}
