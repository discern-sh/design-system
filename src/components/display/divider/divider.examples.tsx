import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./divider.meta.ts";
import { Divider } from "./divider.tsx";

function RuleExample() {
  return <Divider />;
}

function LabelledExample() {
  return <Divider label="01 — Foundations" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: RuleExample },
    { id: "labelled", Example: LabelledExample },
  ],
);

export default function DividerExamples() {
  return (
    <div className="discern-example-stack">
      <RuleExample />
      <LabelledExample />
    </div>
  );
}
