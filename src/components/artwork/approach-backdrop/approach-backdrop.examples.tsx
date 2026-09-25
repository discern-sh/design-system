import type { ReactNode } from "react";
import { ApproachBackdrop } from "./approach-backdrop.tsx";

function ApproachFrame(
  { backdrop, eyebrow, title, lede }: {
    readonly backdrop: ReactNode;
    readonly eyebrow: string;
    readonly title: string;
    readonly lede: string;
  },
) {
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
      {backdrop}
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
          {eyebrow}
        </p>
        <h2 style={{ maxWidth: "13ch", margin: 0 }}>{title}</h2>
        <p
          style={{ maxWidth: "36rem", color: "var(--discern-color-ink-muted)" }}
        >
          {lede}
        </p>
      </div>
    </section>
  );
}

export default function ApproachBackdropExamples() {
  return (
    <ApproachFrame
      backdrop={<ApproachBackdrop />}
      eyebrow="Approach"
      title="Arrive through a deeper frame."
      lede="The station draws the corridor outward, one wave of light answers, and the frame holds still."
    />
  );
}

export function ApproachBackdropArrivalExample() {
  return (
    <ApproachFrame
      backdrop={
        <ApproachBackdrop arrive drift="in" driftBeats={16} dolly grain />
      }
      eyebrow="Arrival"
      title="Keep the corridor gathering."
      lede="The nest approaches and settles, then drifts into the station for as long as the page stays open, and dollies inward as it scrolls away."
    />
  );
}

export function ApproachBackdropLanternExample() {
  return (
    <ApproachFrame
      backdrop={<ApproachBackdrop depth="lantern" light />}
      eyebrow="Lantern"
      title="Light at the end of the corridor."
      lede="The rings brighten toward the station and a soft light well gathers there."
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: ApproachBackdropExamples },
    { id: "arrival", Example: ApproachBackdropArrivalExample },
    { id: "lantern", Example: ApproachBackdropLanternExample },
  ],
);
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./approach-backdrop.meta.ts";
