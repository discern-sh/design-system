import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import meta, { componentExampleVocabulary } from "./icon.meta.ts";
import { Icon } from "./icon.tsx";

function LabelledIconExample() {
  return (
    <Icon label="Generate" size={24}>
      <ExampleIcon name="spark" />
    </Icon>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: LabelledIconExample }],
);

export default function IconExamples() {
  return (
    <div className="discern-example-row discern-example-row--large">
      <LabelledIconExample />
    </div>
  );
}
