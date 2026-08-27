import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { fixtureCopy } from "../../../fixtures/content.ts";
import meta, { componentExampleVocabulary } from "./card.meta.ts";
import { Card } from "./card.tsx";

function PlainExample() {
  return (
    <Card>
      <h4>{fixtureCopy.heading}</h4>
      <p>{fixtureCopy.paragraph}</p>
    </Card>
  );
}

function RaisedExample() {
  return (
    <Card raised>
      <h4>Raised surface</h4>
      <p>{fixtureCopy.paragraph}</p>
    </Card>
  );
}

function DottedExample() {
  return (
    <Card texture="dots">
      <h4>Dotted surface</h4>
      <p>{fixtureCopy.paragraph}</p>
    </Card>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: PlainExample },
    { id: "raised", Example: RaisedExample },
    { id: "dotted", Example: DottedExample },
  ],
);

export default function CardExamples() {
  return (
    <div className="discern-example-grid">
      <PlainExample />
      <RaisedExample />
      <DottedExample />
    </div>
  );
}
