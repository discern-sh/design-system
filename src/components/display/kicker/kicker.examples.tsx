import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./kicker.meta.ts";
import { Kicker } from "./kicker.tsx";

function PlainExample() {
  return <Kicker>Foundations</Kicker>;
}

function IndexedExample() {
  return <Kicker index="02">Working agreement</Kicker>;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: PlainExample },
    { id: "indexed", Example: IndexedExample },
  ],
);

export default function KickerExamples() {
  return (
    <div className="discern-example-row">
      <PlainExample />
      <IndexedExample />
    </div>
  );
}
