import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./callout.meta.ts";
import { Callout } from "./callout.tsx";

function InsightCalloutExample() {
  return (
    <Callout
      eyebrow="Editor’s note"
      title="Keep the exception visible."
      icon="i"
      tone="insight"
    >
      <p>Readers trust a bounded claim more than a universal one.</p>
    </Callout>
  );
}

function WarningCalloutExample() {
  return (
    <Callout
      eyebrow="Caution"
      title="This path changes shared state."
      icon="!"
      tone="warning"
    >
      <p>Pause at the consequence, not merely at the command.</p>
    </Callout>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: InsightCalloutExample },
    { id: "warning", Example: WarningCalloutExample },
  ],
);

export default function CalloutExamples() {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <InsightCalloutExample />
      <WarningCalloutExample />
    </div>
  );
}
