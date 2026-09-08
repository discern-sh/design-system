import { useId } from "react";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import meta, { componentExampleVocabulary } from "./anchor-heading.meta.ts";
import { AnchorHeading } from "./anchor-heading.tsx";

function SectionHeadingExample() {
  const prefix = `example-${useId()}`;
  const id = (name: string) => `${prefix}-${name}`;
  return (
    <AnchorHeading id={id("anchor-heading-lorem")} level={2}>
      Lorem ipsum dolor
    </AnchorHeading>
  );
}

function NestedHeadingExample() {
  const prefix = `example-${useId()}`;
  const id = (name: string) => `${prefix}-${name}`;
  return (
    <AnchorHeading id={id("anchor-heading-consectetur")} level={3}>
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

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "keyboard-anchor",
    label: "Self-link focus and arrival",
    example: "default",
    category: "interaction",
    sequence: [
      {
        action: "focus",
        target: { selector: ".discern-anchor-heading__anchor" },
      },
      {
        action: "click",
        target: { selector: ".discern-anchor-heading__anchor" },
      },
      {
        expect: "focused",
        target: { selector: '[id$="-anchor-heading-lorem"]' },
      },
      {
        checkpoint: { id: "heading-focused", label: "Heading receives focus" },
      },
    ],
  }],
);
