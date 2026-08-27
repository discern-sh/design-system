import { Backdrop } from "./backdrop.tsx";

export default function BackdropExamples() {
  return (
    <section
      style={{
        position: "relative",
        isolation: "isolate",
        minHeight: "24rem",
        overflow: "hidden",
        border: "1px solid var(--discern-color-border)",
        background: "var(--discern-color-canvas)",
      }}
    >
      <Backdrop>
        <svg
          className="discern-backdrop__plate"
          viewBox="0 0 1200 600"
          focusable="false"
        >
          <circle
            cx="920"
            cy="180"
            r="260"
            fill="none"
            stroke="var(--discern-backdrop-guide)"
            strokeWidth="1"
            opacity="var(--discern-backdrop-veil-3)"
          />
          <path
            d="M 0 560 L 540 40 L 1200 420"
            fill="none"
            stroke="var(--discern-backdrop-accent)"
            strokeWidth="1.25"
            opacity="var(--discern-backdrop-veil-4)"
          />
        </svg>
      </Backdrop>
      <div style={{ position: "relative", zIndex: 1, padding: "4rem" }}>
        <h2>A quiet plane for authored work.</h2>
        <p style={{ maxWidth: "34rem" }}>
          Foreground meaning remains complete while the backdrop supplies only
          atmosphere.
        </p>
      </div>
    </section>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: BackdropExamples }],
);
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./backdrop.meta.ts";
