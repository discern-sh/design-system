import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./brand.meta.ts";
import { Brand } from "./brand.tsx";

function WordmarkExample() {
  return <Brand name="Waypoint" mark="▲" typeface="ui" />;
}

function TaglineExample() {
  return (
    <Brand
      name="Northstar"
      mark="N"
      markTreatment="tile"
      markShape="square"
      tagline="Field guide"
    />
  );
}

function NameOnlyExample() {
  return <Brand name="Open Index" mark={false} typeface="mono" size="lg" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: WordmarkExample },
    { id: "tagline", Example: TaglineExample },
    { id: "name-only", Example: NameOnlyExample },
  ],
);

export default function BrandExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <WordmarkExample />
      <TaglineExample />
      <NameOnlyExample />
    </div>
  );
}
