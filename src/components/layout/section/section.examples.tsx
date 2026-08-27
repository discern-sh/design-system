import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Container } from "../container/container.tsx";
import meta, { componentExampleVocabulary } from "./section.meta.ts";
import { Section } from "./section.tsx";

function DefaultSectionState() {
  return (
    <Section surface="surface" spacing="sm">
      <Container size="sm">
        <strong>Foundation</strong>
        <p>Shared design language</p>
      </Container>
    </Section>
  );
}

function SunkenSectionState() {
  return (
    <Section surface="sunken" spacing="sm">
      <Container size="sm">Quiet supporting material</Container>
    </Section>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultSectionState },
    { id: "sunken", Example: SunkenSectionState },
  ],
);

export default function SectionExamples() {
  return <DefaultSectionState />;
}
