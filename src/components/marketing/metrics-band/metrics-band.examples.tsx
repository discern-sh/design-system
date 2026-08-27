import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./metrics-band.meta.ts";
import { MetricsBand } from "./metrics-band.tsx";

export default function MetricsBandExamples() {
  return (
    <MetricsBand
      eyebrow="Current snapshot"
      title="Example measures."
      tone="accent"
      items={[
        {
          value: "24",
          label: "completed items",
          detail: "Across the sample period",
        },
        {
          value: "8",
          label: "open reviews",
          detail: "From open to decision",
        },
        {
          value: "3",
          label: "pending decisions",
          detail: "At the latest update",
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: MetricsBandExamples }],
);
