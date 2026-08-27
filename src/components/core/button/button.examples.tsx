import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import meta, { componentExampleVocabulary } from "./button.meta.ts";
import { Button } from "./button.tsx";

function PrimaryExample() {
  return (
    <Button leadingIcon={<ExampleIcon name="spark" />}>
      Continue
    </Button>
  );
}

function SecondaryExample() {
  return <Button variant="secondary">Preview</Button>;
}

function GhostExample() {
  return (
    <Button variant="ghost" trailingIcon={<ExampleIcon name="arrow" />}>
      Cancel
    </Button>
  );
}

function DangerExample() {
  return <Button variant="danger">Delete</Button>;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: PrimaryExample },
    { id: "secondary", Example: SecondaryExample },
    { id: "ghost", Example: GhostExample },
    { id: "danger", Example: DangerExample },
  ],
);

export default function ButtonExamples() {
  return (
    <div className="discern-example-row">
      <PrimaryExample />
      <SecondaryExample />
      <GhostExample />
      <DangerExample />
    </div>
  );
}
