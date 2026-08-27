import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Paragraph } from "../paragraph/paragraph.tsx";
import meta, { componentExampleVocabulary } from "./blockquote.meta.ts";
import { Blockquote } from "./blockquote.tsx";

function ComposedQuotationExample() {
  return (
    <Blockquote>
      <Paragraph>
        A neutral quotation can carry ordinary prose and <em>inline meaning</em>
        {" "}
        without inventing an attribution.
      </Paragraph>
      <Paragraph>A second block stays part of the same quotation.</Paragraph>
    </Blockquote>
  );
}

function NestedQuotationExample() {
  return (
    <Blockquote>
      <Paragraph>An outer quotation can introduce a quoted response.</Paragraph>
      <Blockquote>
        <Paragraph>
          Nested quoted material remains a semantic block of its own.
        </Paragraph>
      </Blockquote>
    </Blockquote>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: ComposedQuotationExample },
    { id: "nested-quotation", Example: NestedQuotationExample },
  ],
);

export default function BlockquoteExamples() {
  return (
    <div className="discern-example-stack">
      <ComposedQuotationExample />
      <NestedQuotationExample />
    </div>
  );
}
