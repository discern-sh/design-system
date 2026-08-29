import {
  assert,
  assertEquals,
  assertMatch,
  assertNotMatch,
  assertStringIncludes,
} from "@std/assert";
import { Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Chart, type ChartProps, DataFigure } from "../../src/react.ts";
import { componentRegistry } from "../../src/generated/component-registry.ts";
import { CHART_PAINT_TOKEN_NAMES } from "../../src/chart/palette.ts";
import { type BarChartSpec, chartSeriesLegend } from "../../src/chart/mod.ts";
import { baseTokens, themeTokens } from "../../src/tokens/tokens.ts";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";
import type { ChartSpec } from "../../src/generated/chart-spec.ts";
import fixtures from "../../src/chart/kinds/bar/bar.fixtures.ts";

const representative = fixtures[1];
if (representative === undefined) {
  throw new TypeError("Missing representative bar fixture");
}

const rejectsAccessibilityRole: "role" extends keyof ChartProps ? false
  : true = true;
void rejectsAccessibilityRole;

Deno.test("React Chart maps the conformant scene to named semantic SVG", () => {
  const html = renderToStaticMarkup(<Chart spec={representative} />);
  assertStringIncludes(
    html,
    '<div class="discern-chart__viewport" role="group" aria-label="Scrollable chart viewport:',
  );
  assertStringIncludes(html, 'tabindex="0"');
  assertStringIncludes(html, '<svg class="discern-chart"');
  assertStringIncludes(html, 'data-discern-chart-kind="bar"');
  assertStringIncludes(html, 'role="img"');
  assertStringIncludes(
    html,
    'aria-label="Quarterly reviews by region: Completed and open reviews per region; one region has no stated open count."',
  );
  assertStringIncludes(html, "aria-description=");
  assertNotMatch(html, /aria-describedby=/u);
  assertStringIncludes(html, "<title>Quarterly reviews by region</title>");
  assertStringIncludes(html, "<desc>");
  assertStringIncludes(html, "Data (4 categories):");
  assertStringIncludes(
    html,
    'class="discern-chart__mark discern-chart__mark--series-1"',
  );
  assertStringIncludes(
    html,
    'class="discern-chart__mark discern-chart__mark--series-2"',
  );
  assertStringIncludes(html, 'data-discern-chart-series="completed"');
  assertStringIncludes(html, 'data-discern-chart-category="north"');
  assertStringIncludes(html, '<line class="discern-chart__axis"');
  assertStringIncludes(html, 'text-anchor="end"');
  assertStringIncludes(html, 'text-anchor="middle"');
  assertNotMatch(html, /dangerouslySetInnerHTML/iu);
  assertNotMatch(html, /<(?:script|foreignObject|image)\b/iu);
});

Deno.test("React Chart renders the complete release corpus", () => {
  const dataEncoding =
    /discern-chart__(?:mark--(?:series|ramp)-\d|path--series-\d|points--series-\d|area--series-\d)/u;
  for (const entry of chartKindRegistry) {
    for (const releaseCase of entry.releaseCorpus.cases) {
      const html = renderToStaticMarkup(
        <Chart spec={releaseCase.spec as ChartSpec} />,
      );
      const context = `${entry.meta.slug}/${releaseCase.name}`;
      assertStringIncludes(html, 'role="img"', context);
      assertMatch(html, dataEncoding, context);
      assertNotMatch(html, /\sid="/u);
    }
  }
});

Deno.test("React Chart escapes authored text instead of injecting markup", () => {
  const hostile = {
    ...representative,
    title: "<script>Reference & review</script>",
    summary: "A <foreignObject> must remain text.",
    categories: representative.categories.map((category, index) =>
      index === 0 ? { ...category, label: "<image onload='run'>" } : category
    ),
  } satisfies BarChartSpec;
  const html = renderToStaticMarkup(<Chart spec={hostile} />);
  assertStringIncludes(
    html,
    "&lt;script&gt;Reference &amp; review&lt;/script&gt;",
  );
  assertStringIncludes(html, "&lt;image onload=&#x27;run&#x27;&gt;");
  assertNotMatch(html, /<(?:script|foreignObject|image)\b/iu);
  assertNotMatch(html, /\sonload=["']/iu);
});

Deno.test("React Chart descriptions remain collision-free across roots", () => {
  const together = renderToStaticMarkup(
    <Fragment>
      <Chart spec={representative} />
      <Chart spec={representative} />
    </Fragment>,
  );
  const separate = `${renderToStaticMarkup(<Chart spec={representative} />)}${
    renderToStaticMarkup(<Chart spec={representative} />)
  }`;
  for (const html of [together, separate]) {
    assertEquals((html.match(/aria-description=/gu) ?? []).length, 2);
    assertEquals((html.match(/<desc>/gu) ?? []).length, 2);
    assertNotMatch(html, /<desc\s+id=|aria-describedby=/u);
  }
});

Deno.test("Chart composes as DataFigure visual with the spec-derived legend", () => {
  const legend = chartSeriesLegend(representative);
  assertEquals(legend, [
    { id: "completed", label: "Completed", tone: "series-1" },
    { id: "open", label: "Open", tone: "series-2" },
  ]);
  const html = renderToStaticMarkup(
    <DataFigure
      title="Quarterly reviews by region"
      legend={legend}
      visual={<Chart spec={representative} />}
      caption="A compact review evidence figure."
      source="Example specification"
    />,
  );
  assertEquals((html.match(/<figure\b/gu) ?? []).length, 1);
  assertEquals((html.match(/<svg\b/gu) ?? []).length, 1);
  assertStringIncludes(html, "<h3>Quarterly reviews by region</h3>");
  assertStringIncludes(
    html,
    'class="discern-data-figure__swatch--series-1"',
  );
  assertStringIncludes(
    html,
    'class="discern-data-figure__swatch--series-2"',
  );
  assertStringIncludes(html, "Completed");
  const visibleLabels = [...html.matchAll(/<text\b[^>]*>(.*?)<\/text>/gu)]
    .map((match) => match[1]);
  assert(!visibleLabels.includes("Quarterly reviews by region"));
});

Deno.test("Chart CSS resolves every paint role through public Tokens", async () => {
  const css = await Deno.readTextFile(
    new URL(
      "../../src/components/editorial/chart/chart.css",
      import.meta.url,
    ),
  );
  assertNotMatch(css, /(?<!max-)inline-size:\s*100%/u);
  assertStringIncludes(css, "overflow-x: auto");
  assertStringIncludes(css, ".discern-chart__viewport:focus-visible");
  const tokenNames = new Set(
    [...baseTokens, ...themeTokens].map(({ name }) => name),
  );
  const declarationsFor = (selector: string): string => {
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
      const selectors = (match[1] ?? "").split(",").map((value) =>
        value.trim()
      );
      if (selectors.includes(selector)) return match[2] ?? "";
    }
    return "";
  };
  for (const slot of [1, 2, 3, 4, 5, 6] as const) {
    const tokenName = CHART_PAINT_TOKEN_NAMES[`series-${slot}`];
    assert(tokenNames.has(tokenName), `${tokenName} is not a public Token`);
    for (const family of ["mark", "points", "area"] as const) {
      assertStringIncludes(
        declarationsFor(`.discern-chart__${family}--series-${slot}`),
        `fill: var(${tokenName})`,
      );
    }
  }
  assertStringIncludes(
    css,
    `stroke: var(${CHART_PAINT_TOKEN_NAMES.axis})`,
  );
  assertStringIncludes(
    css,
    `fill: var(${CHART_PAINT_TOKEN_NAMES["axis-label"]})`,
  );
  assertStringIncludes(
    css,
    `fill: var(${CHART_PAINT_TOKEN_NAMES.annotation})`,
  );
  assertStringIncludes(css, `fill: var(${CHART_PAINT_TOKEN_NAMES.canvas})`);
  assertStringIncludes(css, "@media (forced-colors: active)");
  assertStringIncludes(css, "stroke: CanvasText");
  assertStringIncludes(css, "fill: CanvasText");

  const registered = componentRegistry.find(({ meta }) =>
    meta.slug === "chart"
  );
  assert(registered !== undefined);
  assertEquals(registered.dependencies, []);
  assertStringIncludes(registered.css, ".discern-chart__canvas");
  assertStringIncludes(registered.css, "--discern-color-series-1");
});

Deno.test("DataFigure series swatches ride the series Tokens with distinct shapes", async () => {
  const css = await Deno.readTextFile(
    new URL(
      "../../src/components/editorial/data-figure/data-figure.css",
      import.meta.url,
    ),
  );
  for (const slot of [1, 2, 3, 4, 5, 6] as const) {
    assertStringIncludes(
      css,
      `.discern-data-figure__swatch--series-${slot}`,
    );
    assertStringIncludes(css, `var(--discern-color-series-${slot})`);
  }
  assertStringIncludes(css, "border-radius: 50%");
  assertEquals(
    (css.match(/clip-path: polygon/gu) ?? []).length,
    4,
    "four series swatches carry polygon marker shapes beside the circle and square",
  );
  assertStringIncludes(css, "@media (forced-colors: active)");
  assertStringIncludes(css, "background: CanvasText");
  assertStringIncludes(css, "forced-color-adjust: none");
});
