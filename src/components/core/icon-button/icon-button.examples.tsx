import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import meta, { componentExampleVocabulary } from "./icon-button.meta.ts";
import { IconButton } from "./icon-button.tsx";

function QuietExample() {
  return <IconButton icon={<ExampleIcon name="spark" />} label="Generate" />;
}

function OutlineExample() {
  return (
    <IconButton
      icon={<ExampleIcon name="info" />}
      label="Information"
      variant="outline"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: QuietExample },
    { id: "outline", Example: OutlineExample },
  ],
);

export default function IconButtonExamples() {
  return (
    <div className="discern-example-row">
      <QuietExample />
      <OutlineExample />
    </div>
  );
}
