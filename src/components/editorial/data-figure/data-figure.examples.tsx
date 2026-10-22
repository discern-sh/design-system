import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./data-figure.meta.ts";
import { DataFigure } from "./data-figure.tsx";

function ComparisonVisual() {
  const values = [
    { label: "Sunny plot", value: 14 },
    { label: "Shaded plot", value: 10 },
  ] as const;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) max-content",
        gap: "var(--discern-space-2) var(--discern-space-3)",
        alignItems: "center",
        fontFamily: "var(--discern-font-ui)",
        fontSize: "var(--discern-font-size-sm)",
      }}
      role="img"
      aria-label="Sunny plot: 14 centimetres. Shaded plot: 10 centimetres."
    >
      {values.map(({ label, value }, index) => (
        <div key={label} style={{ display: "contents" }}>
          <span
            style={{
              gridColumn: "1 / -1",
              marginBlockStart: index === 0 ? 0 : "var(--discern-space-2)",
              color: "var(--discern-color-ink-muted)",
            }}
          >
            {label}
          </span>
          <span
            style={{
              width: `${value / 14 * 100}%`,
              height: "1rem",
              borderRadius: "var(--discern-radius-xs)",
              background: index === 0
                ? "var(--discern-color-accent-500)"
                : "var(--discern-color-ink-muted)",
            }}
          />
          <span
            style={{
              color: "var(--discern-color-ink)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: "var(--discern-font-weight-medium)",
            }}
          >
            {value} cm
          </span>
        </div>
      ))}
    </div>
  );
}

function ComparisonFigureExample() {
  return (
    <DataFigure
      eyebrow="Figure 04"
      title="Seedling height after four weeks."
      legend={[
        { label: "Sunny plot", tone: "accent" },
        { label: "Shaded plot", tone: "ink" },
      ]}
      visual={<ComparisonVisual />}
      caption="Average height across two growing conditions."
      source="Illustrative measurements"
    />
  );
}

function NarrowFigureExample() {
  return (
    <div style={{ maxWidth: "20rem" }}>
      <DataFigure
        eyebrow="Figure 04"
        title="Seedling height after four weeks."
        legend={[
          { label: "Sunny plot", tone: "accent" },
          { label: "Shaded plot", tone: "ink" },
        ]}
        visual={<ComparisonVisual />}
        caption="The complete figure remains readable at a narrow measure."
        source="Illustrative measurements"
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
