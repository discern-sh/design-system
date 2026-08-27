import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./container.meta.ts";
import { Container } from "./container.tsx";

function DefaultContainerState() {
  return (
    <Container size="measure">
      <div className="discern-layout-sample">
        Readable content stays centred inside a named measure.
      </div>
    </Container>
  );
}

function FullContainerState() {
  return (
    <Container size="full">
      <div className="discern-layout-sample">Full-width content</div>
    </Container>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultContainerState },
    { id: "full", Example: FullContainerState },
  ],
);

export default function ContainerExamples() {
  return <DefaultContainerState />;
}
