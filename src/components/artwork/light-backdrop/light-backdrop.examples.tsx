import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { useState } from "react";
import { Checkbox } from "../../forms/checkbox/checkbox.tsx";
import { Card } from "../../display/card/card.tsx";
import { LightBackdrop } from "./light-backdrop.tsx";
import meta, { componentExampleVocabulary } from "./light-backdrop.meta.ts";

export default function LightBackdropExamples() {
  const [moving, setMoving] = useState(true);
  return (
    <Card
      texture="shaded"
      padding="lg"
      style={{ position: "relative", isolation: "isolate", minHeight: "16rem" }}
    >
      <LightBackdrop motion={moving ? "ambient" : "still"} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "32rem" }}>
        <h2>A little light, deliberately placed.</h2>
        <p>
          Ambient light moves gently on this selected surface. Reduced motion
          keeps it still; each placement can also opt out.
        </p>
        <Checkbox
          label="Ambient motion"
          checked={moving}
          onChange={(event) => setMoving(event.currentTarget.checked)}
        />
      </div>
    </Card>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: LightBackdropExamples }],
);
export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "ambient-motion",
      label: "Selected ambient motion",
      example: "default",
      category: "motion",
      requirements: { reducedMotion: false, inlineSize: "wide" },
      sequence: [{
        checkpoint: { id: "ambient-moving", label: "Production illumination" },
      }],
    },
    {
      id: "ambient-reduced",
      label: "Complete reduced-motion still",
      example: "default",
      category: "motion",
      requirements: { reducedMotion: true, inlineSize: "narrow" },
      sequence: [{
        checkpoint: { id: "ambient-still", label: "Complete still surface" },
      }],
    },
  ] as const,
);
