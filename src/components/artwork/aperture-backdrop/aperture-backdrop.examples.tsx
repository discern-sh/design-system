import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { ApertureBackdrop } from "./aperture-backdrop.tsx";
import meta, { componentExampleVocabulary } from "./aperture-backdrop.meta.ts";

export default function ApertureBackdropExamples() {
  return (
    <section
      style={{
        position: "relative",
        isolation: "isolate",
        minHeight: "32rem",
        overflow: "hidden",
        border: "1px solid var(--discern-color-border)",
        background: "var(--discern-color-canvas)",
      }}
    >
      <ApertureBackdrop />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          alignContent: "center",
          minHeight: "32rem",
          padding: "clamp(2rem, 8vw, 6rem)",
        }}
      >
        <p
          style={{
            marginBlockEnd: "var(--discern-space-3)",
            color: "var(--discern-color-accent-700)",
            fontFamily: "var(--discern-font-ui)",
            fontSize: "var(--discern-font-size-xs)",
            fontWeight: "var(--discern-font-weight-strong)",
          }}
        >
          Aperture
        </p>
        <h2 style={{ maxWidth: "13ch", margin: 0 }}>
          Make room for an unexpected angle.
        </h2>
        <p
          style={{ maxWidth: "36rem", color: "var(--discern-color-ink-muted)" }}
        >
          Three unequal beams cross the opening and spend themselves before the
          content.
        </p>
      </div>
    </section>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: ApertureBackdropExamples }],
);
export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "ambient-motion",
      label: "Ambient motion",
      example: "default",
      category: "motion",
      sequence: [{ checkpoint: { id: "aperture-ambient", label: "Ambient" } }],
      requirements: { reducedMotion: false, inlineSize: "wide" },
    },
    {
      id: "ambient-reduced",
      label: "Ambient still",
      example: "default",
      category: "motion",
      sequence: [{
        checkpoint: { id: "aperture-still", label: "Reduced motion" },
      }],
      requirements: { reducedMotion: true, inlineSize: "wide" },
    },
  ] as const,
);
