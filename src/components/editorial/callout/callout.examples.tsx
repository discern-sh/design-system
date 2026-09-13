import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./callout.meta.ts";
import { Callout } from "./callout.tsx";

function InsightCalloutExample() {
  return (
    <Callout
      eyebrow="Editor’s note"
      title="Keep the qualifier visible."
      tone="insight"
    >
      <p>
        Readers trust a bounded claim more than a universal one. Keep the scope
        and the source beside the claim so they remain clear when the note wraps
        onto several lines.
      </p>
    </Callout>
  );
}

function WarningCalloutExample() {
  return (
    <Callout
      eyebrow="Caution"
      title="Check figures before publication."
      tone="warning"
      actions={<Button variant="secondary">Review source figures</Button>}
    >
      <p>
        A corrected source may change the conclusion. Compare the revised
        figures with the supporting evidence before publishing; the draft can
        remain saved while you review.
      </p>
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

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "long-note",
      label: "Information without supplied artwork",
      example: "default",
      category: "responsive",
      requirements: { inlineSize: 260 },
      sequence: [{
        checkpoint: {
          id: "note-hierarchy",
          label: "Named glyph and wrapped context",
        },
      }],
    },
    {
      id: "long-warning",
      label: "Warning with a follow-up action",
      example: "warning",
      category: "responsive",
      requirements: { inlineSize: 390, theme: "dark" },
      sequence: [{
        checkpoint: {
          id: "caution-hierarchy",
          label: "Heading, explanation and action",
        },
      }],
    },
  ],
);
