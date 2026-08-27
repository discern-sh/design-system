import { CleaveBackdrop } from "./cleave-backdrop.tsx";

export default function CleaveBackdropExamples() {
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
      <CleaveBackdrop />
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
          Cleave
        </p>
        <h2 style={{ maxWidth: "13ch", margin: 0 }}>
          One division changes the whole surface.
        </h2>
        <p
          style={{ maxWidth: "36rem", color: "var(--discern-color-ink-muted)" }}
        >
          Two planes meet at an authored angle while their weight drifts almost
          imperceptibly.
        </p>
      </div>
    </section>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: CleaveBackdropExamples }],
);
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./cleave-backdrop.meta.ts";
