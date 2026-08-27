import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./comparison-table.meta.ts";
import { ComparisonTable } from "./comparison-table.tsx";

export default function ComparisonTableExamples() {
  return (
    <ComparisonTable
      eyebrow="Compare approaches"
      title="Make the trade-off visible."
      description={
        <p>
          A good comparison clarifies the decision without turning every row
          into a sales claim.
        </p>
      }
      firstLabel="Approach A"
      secondLabel="Approach B"
      secondBadge="Example choice"
      rows={[
        {
          feature: "Setup",
          first: "Configured separately",
          second: "Uses a shared starting point",
        },
        {
          feature: "Review",
          first: "Context gathered later",
          second: "Context stays with the work",
        },
        {
          feature: "Quality",
          first: "Checked case by case",
          second: "Checked consistently",
        },
        {
          feature: "Portability",
          first: "Designed for one workflow",
          second: "Designed for several workflows",
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: ComparisonTableExamples }],
);
