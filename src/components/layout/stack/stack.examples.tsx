import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./stack.meta.ts";
import { Stack } from "./stack.tsx";

const blocks = ["First block", "Second block", "Third block"] as const;

function DefaultStackState() {
  return (
    <Stack gap={3}>
      {blocks.map((item) => (
        <div className="discern-layout-sample" key={item}>{item}</div>
      ))}
    </Stack>
  );
}

function CentredStackState() {
  return (
    <Stack gap={2} align="center">
      {["One", "Two"].map((item) => (
        <div className="discern-layout-sample" key={item}>{item}</div>
      ))}
    </Stack>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultStackState },
    { id: "centred", Example: CentredStackState },
  ],
);

export default function StackExamples() {
  return <DefaultStackState />;
}
