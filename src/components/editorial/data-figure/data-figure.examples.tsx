import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./data-figure.meta.ts";
import { DataFigure } from "./data-figure.tsx";

function ComparisonVisual() {
  return (
    <div
      style={{
        display: "grid",
        alignItems: "end",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "1rem",
        minHeight: "13rem",
      }}
      role="img"
      aria-label="Example bar chart"
    >
      {[42, 58, 49, 76, 91].map((height, index) => (
        <span
          key={index}
          style={{
            height: String(height) + "%",
            background: index === 4
              ? "var(--discern-color-accent-500)"
              : "var(--discern-color-accent-200)",
          }}
        />
      ))}
    </div>
  );
}

function ComparisonFigureExample() {
  return (
    <DataFigure
      eyebrow="Figure 04"
      title="Confidence grows when evidence stays close."
      legend={[
        { label: "reviewed", tone: "accent" },
        { label: "assumed", tone: "ink" },
      ]}
      visual={<ComparisonVisual />}
      caption="A visual slot can hold a chart or diagram while the frame preserves editorial context."
      source="Illustrative data"
    />
  );
}

function NarrowFigureExample() {
  return (
    <div style={{ maxWidth: "20rem" }}>
      <DataFigure
        eyebrow="Figure 04"
        title="Confidence grows when evidence stays close."
        legend={[
          { label: "reviewed evidence", tone: "accent" },
          { label: "assumed evidence", tone: "ink" },
        ]}
        visual={<ComparisonVisual />}
        caption="The complete figure remains readable at a narrow measure."
        source="Illustrative data"
      />
    </div>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: ComparisonFigureExample },
    { id: "narrow-layout", Example: NarrowFigureExample },
  ],
);

export default function DataFigureExamples() {
  return (
    <div className="discern-example-stack">
      <ComparisonFigureExample />
      <NarrowFigureExample />
    </div>
  );
}
