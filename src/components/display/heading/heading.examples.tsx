import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./heading.meta.ts";
import { Heading, HeadingAccent } from "./heading.tsx";

function SectionHeadingExample() {
  return <Heading level={2}>Build with confidence</Heading>;
}

function AccentedPhraseExample() {
  return (
    <Heading level={2}>
      Rules that <HeadingAccent>travel</HeadingAccent>
    </Heading>
  );
}

function RichInlineContentExample() {
  return (
    <Heading level={3}>
      A <strong>complete</strong> heading keeps <code>inline meaning</code>
    </Heading>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: SectionHeadingExample },
    { id: "accent", Example: AccentedPhraseExample },
    { id: "rich-content", Example: RichInlineContentExample },
  ],
);

export default function HeadingExamples() {
  return (
    <div className="discern-example-stack">
      <SectionHeadingExample />
      <AccentedPhraseExample />
      <RichInlineContentExample />
    </div>
  );
}
