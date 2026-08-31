import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import type { ChartSvgTheme } from "../../../chart/svg.ts";
import { renderChartSvg } from "../../../chart/svg.ts";
import { chartAltText } from "../../../chart/accessibility.ts";
import { chartSeriesLegend } from "../../../chart/legend.ts";
import { chartKindRegistry } from "../../../generated/chart-registry.ts";
import type { ChartSpec } from "../../../generated/chart-spec.ts";
import { DataFigure } from "../data-figure/data-figure.tsx";
import meta, { componentExampleVocabulary } from "./chart.meta.ts";
import { Chart } from "./chart.tsx";

const chartCapture = { selectors: [".discern-chart"] } as const;

function releaseSpec(
  kind: string,
  posture: "maximum-density" | "minimal" | "representative" | "structural",
): ChartSpec {
  const entry = chartKindRegistry.find(({ meta }) => meta.slug === kind);
  const releaseCase = entry?.releaseCorpus.cases.find(({ postures }) =>
    postures.some((candidate) => candidate === posture)
  );
  if (releaseCase === undefined) {
    throw new TypeError(`${kind} has no ${posture} release case`);
  }
  return releaseCase.spec as ChartSpec;
}

const minimalBar = releaseSpec("bar", "minimal");

/** Source-backed defaults for the Catalogue builder's structured spec prop. */
export const catalogueBuilderDefaults = { spec: minimalBar } as const;

function svgDataUrl(spec: ChartSpec, theme: ChartSvgTheme): string {
  return `data:image/svg+xml;charset=utf-8,${
    encodeURIComponent(renderChartSvg(spec, { theme }))
  }`;
}

function corpusExamples(
  entry: typeof chartKindRegistry[number],
) {
  return (
    <section key={entry.meta.slug} data-chart-kind={entry.meta.slug}>
      <h3>{entry.meta.name}: complete release corpus</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {entry.releaseCorpus.cases.map((releaseCase) => (
          <figure key={releaseCase.name} style={{ margin: 0 }}>
            <Chart spec={releaseCase.spec as ChartSpec} />
            <figcaption>
              {releaseCase.name}: {releaseCase.postures.join(", ")}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function RepresentativeChartExample() {
  return <Chart spec={releaseSpec("bar", "representative")} />;
}

function StructuralChartExample() {
  return <Chart spec={releaseSpec("bar", "structural")} />;
}

function DenseChartExample() {
  return <Chart spec={releaseSpec("heatmap", "maximum-density")} />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "default",
      Example: RepresentativeChartExample,
      capture: chartCapture,
    },
    {
      id: "structural",
      Example: StructuralChartExample,
      capture: chartCapture,
    },
    {
      id: "dense-data",
      Example: DenseChartExample,
      capture: chartCapture,
    },
  ],
);

export default function ChartExamples() {
  const representative = releaseSpec("bar", "representative");
  return (
    <div style={{ display: "grid", gap: "3rem" }}>
      {chartKindRegistry.map(corpusExamples)}

      <section>
        <h3>Standalone SVG palettes</h3>
        {chartKindRegistry.map((entry) => {
          const minimal = releaseSpec(entry.meta.slug, "minimal");
          return (
            <div
              key={entry.meta.slug}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
                gap: "1rem",
                marginBlockEnd: "1.5rem",
              }}
            >
              {(["light", "dark", "adaptive"] as const).map((theme) => (
                <figure key={theme} style={{ margin: 0 }}>
                  <img
                    src={svgDataUrl(minimal, theme)}
                    alt={chartAltText(minimal)}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                  <figcaption>
                    {entry.meta.slug} {theme} standalone asset
                  </figcaption>
                </figure>
              ))}
            </div>
          );
        })}
      </section>

      <DataFigure
        eyebrow="Quarterly evidence"
        title={representative.title}
        legend={chartSeriesLegend(representative)}
        visual={<Chart spec={representative} />}
        caption="The spec-derived series legend keys the same fixed palette slots the marks use."
        source="Illustrative review counts"
      />
    </div>
  );
}
