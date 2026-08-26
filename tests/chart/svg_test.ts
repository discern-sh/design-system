import {
  assert,
  assertEquals,
  assertMatch,
  assertNotMatch,
  assertThrows,
} from "@std/assert";
import {
  CHART_PAINT_TOKEN_NAMES,
  resolveChartPalette,
} from "../../src/chart/palette.ts";
import { chartPaintStrokeDasharray } from "../../src/chart/cues.ts";
import {
  renderChartSvg,
  type RenderChartSvgOptions,
} from "../../src/chart/svg.ts";
import fixtures from "../../src/chart/kinds/bar/bar.fixtures.ts";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";
import type { ChartSpec } from "../../src/generated/chart-spec.ts";
import { minimumBarLightSvg } from "./snapshots.ts";

const minimum = fixtures[0];
if (minimum === undefined) throw new TypeError("Missing minimum bar fixture");
const grouped = fixtures[1];
if (grouped === undefined) throw new TypeError("Missing grouped bar fixture");

Deno.test("standalone SVG bytes match the canonical light snapshot", () => {
  assertEquals(
    renderChartSvg(minimum, { theme: "light" }),
    minimumBarLightSvg,
  );
});

Deno.test("standalone SVG is deterministic, finite, and canonically ordered", () => {
  const first = renderChartSvg(minimum);
  for (let run = 0; run < 10; run += 1) {
    assertEquals(renderChartSvg(minimum), first);
  }
  assertMatch(
    first,
    /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="discern-chart discern-chart--standalone discern-chart--theme-adaptive" viewBox="[^"]+" width="[^"]+" height="[^"]+" role="img" aria-label="[^"]+">/u,
  );
  const root = first.match(
    /viewBox="([^"]+)" width="([^"]+)" height="([^"]+)"/u,
  );
  assert(root !== null);
  const numbers = [...root[1]!.split(" "), root[2]!, root[3]!].map(Number);
  assert(numbers.every((value) => Number.isFinite(value)));
  assert(numbers.slice(2).every((value) => value > 0));

  const title = first.indexOf("<title>");
  const description = first.indexOf("<desc>");
  const style = first.indexOf("<style>");
  const canvas = first.indexOf('<rect class="discern-chart__canvas"');
  assert(
    0 < title && title < description && description < style && style < canvas,
  );
  assert(first.endsWith("</svg>\n"));
});

Deno.test("series and ramp slots own distinct projection-neutral line treatments", () => {
  for (const prefix of ["series", "ramp"] as const) {
    const count = prefix === "series" ? 6 : 4;
    const treatments = Array.from(
      { length: count },
      (_, index) =>
        chartPaintStrokeDasharray(
          `${prefix}-${index + 1}` as Parameters<
            typeof chartPaintStrokeDasharray
          >[0],
        ) ?? "solid",
    );
    assertEquals(new Set(treatments).size, count, `${prefix} cues are unique`);
  }
});

Deno.test("every standalone corpus asset serializes distinct cues before image delivery", () => {
  for (const entry of chartKindRegistry) {
    for (const releaseCase of entry.releaseCorpus.cases) {
      const svg = renderChartSvg(releaseCase.spec as ChartSpec);
      const cues = new Map<string, string>();
      for (
        const match of svg.matchAll(
          /<(?:rect|polyline|g|polygon)\b[^>]*class="discern-chart__(?:mark|path|points|area)[^"]*--((?:series|ramp)-\d)"[^>]*>/gu,
        )
      ) {
        const tag = match[0];
        const role = match[1];
        assert(role !== undefined);
        const cue = tag.match(/stroke-dasharray="([^"]+)"/u)?.[1] ?? "solid";
        const existing = cues.get(role);
        if (existing === undefined) cues.set(role, cue);
        else assertEquals(cue, existing, `${entry.meta.slug}/${role}`);
      }
      for (const prefix of ["series", "ramp"] as const) {
        const treatments = [...cues]
          .filter(([role]) => role.startsWith(`${prefix}-`))
          .map(([, cue]) => cue);
        if (treatments.length > 1) {
          assertEquals(
            new Set(treatments).size,
            treatments.length,
            `${entry.meta.slug}/${releaseCase.name}/${prefix}`,
          );
        }
      }
    }
  }
});

Deno.test("standalone SVG escapes semantic text and admits no active or external content", () => {
  const hostile = {
    ...grouped,
    title: "<script data-x=\"one\">Title & 'copy'</script>",
    summary: 'Summary <image href="https://example.invalid/x">',
    categories: grouped.categories.map((category, index) =>
      index === 0
        ? { ...category, label: "North <foreignObject> & east" }
        : category
    ),
  } satisfies ChartSpec;
  const svg = renderChartSvg(hostile, { theme: "dark" });

  assert(svg.includes("&lt;script data-x=&quot;one&quot;&gt;"));
  assert(svg.includes("&apos;copy&apos;"));
  assert(svg.includes("North &lt;foreignObject&gt; &amp; east"));
  assertNotMatch(svg, /<(?:script|foreignObject|image|a|use|iframe)\b/iu);
  assertNotMatch(svg, /\s(?:href|xlink:href|on[a-z]+)=["']/iu);
  assertNotMatch(svg, /url\s*\(/iu);
  assertMatch(svg, /<rect class="discern-chart__mark/u);
  assertMatch(svg, /<text\b[^>]* text-anchor="(?:start|middle|end)">/u);
});

Deno.test("every generated release asset is intrinsic, namespaced, and standalone-safe", () => {
  for (const entry of chartKindRegistry) {
    for (const releaseCase of entry.releaseCorpus.cases) {
      for (const theme of ["light", "dark", "adaptive"] as const) {
        const context = `${entry.meta.slug}/${releaseCase.name}/${theme}`;
        const spec = releaseCase.spec as ChartSpec;
        const svg = renderChartSvg(spec, { theme });
        assertEquals(
          renderChartSvg(structuredClone(spec), { theme }),
          svg,
          context,
        );
        assertNotMatch(
          svg,
          /<(?:script|foreignObject|image|a|use|iframe|audio|video)\b/iu,
        );
        assertNotMatch(svg, /\s(?:href|xlink:href|on[a-z]+)=/iu);
        const structuralMarkup = svg.replaceAll(
          /<(title|desc)\b[^>]*>[\s\S]*?<\/\1>/gu,
          "",
        ).replaceAll(/<text\b[^>]*>[\s\S]*?<\/text>/gu, "");
        assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
        assertNotMatch(
          structuralMarkup.replace(
            'xmlns="http://www.w3.org/2000/svg"',
            "",
          ),
          /(?:https?:|data:|url\s*\(|@font-face)/iu,
        );
        assertNotMatch(svg, /context-stroke|<marker\b|\sid=/iu);
        assertNotMatch(svg, /var\(--|data-discern-root|@keyframes/iu);
        const root = svg.match(
          /viewBox="([^"]+)" width="([^"]+)" height="([^"]+)"/u,
        );
        assert(root !== null, `${context} omitted intrinsic geometry`);
        const viewBox = root[1]!.split(" ").map(Number);
        const width = Number(root[2]);
        const height = Number(root[3]);
        assert(viewBox.every(Number.isFinite), context);
        assert(width > 0 && height > 0, context);
        assertEquals(viewBox.slice(2), [width, height], context);
        for (const classes of svg.matchAll(/\bclass="([^"]+)"/gu)) {
          for (const name of classes[1]!.split(" ")) {
            assert(name.startsWith("discern-"), `${context}: ${name}`);
          }
        }
        for (const attribute of svg.matchAll(/\s(data-[a-z-]+)=/gu)) {
          assert(
            attribute[1]!.startsWith("data-discern-"),
            `${context}: ${attribute[1]}`,
          );
        }
        if (theme === "adaptive") {
          const media = svg.indexOf("@media (prefers-color-scheme: dark)");
          const baseCanvas = svg.indexOf(".discern-chart__canvas");
          assert(baseCanvas >= 0 && media > baseCanvas, context);
        } else {
          assertNotMatch(svg, /prefers-color-scheme/u);
        }
      }
    }
  }
});

/**
 * Each kind's declared calm visual character: its hairline axis count, its
 * one data-encoding vocabulary, and whether subordinate gridlines appear. A
 * new kind fails the lookup until it declares its own row.
 */
const CALM_CHARACTER: Readonly<
  Record<string, {
    readonly axisLines: number;
    readonly grid: boolean;
    readonly encodings: readonly RegExp[];
  }>
> = {
  bar: {
    axisLines: 1,
    grid: false,
    encodings: [/discern-chart__mark discern-chart__mark--series-\d/u],
  },
  line: {
    axisLines: 1,
    grid: false,
    encodings: [/discern-chart__path discern-chart__path--series-\d/u],
  },
  distribution: {
    axisLines: 1,
    grid: false,
    encodings: [/discern-chart__mark discern-chart__mark--series-\d/u],
  },
  heatmap: {
    axisLines: 0,
    grid: false,
    encodings: [/discern-chart__mark discern-chart__mark--ramp-\d/u],
  },
  scatter: {
    axisLines: 2,
    grid: true,
    encodings: [/discern-chart__points discern-chart__points--series-\d/u],
  },
  slope: {
    axisLines: 2,
    grid: false,
    encodings: [/discern-chart__path discern-chart__path--series-\d/u],
  },
};

Deno.test("every kind's canvas keeps its declared calm visual character", () => {
  for (const entry of chartKindRegistry) {
    const character = CALM_CHARACTER[entry.meta.slug];
    assert(
      character !== undefined,
      `${entry.meta.slug} must declare its calm visual character`,
    );
    for (const releaseCase of entry.releaseCorpus.cases) {
      const svg = renderChartSvg(releaseCase.spec as ChartSpec, {
        theme: "light",
      });
      const context = `${entry.meta.slug}/${releaseCase.name}`;
      assertEquals(
        (svg.match(/<line class="discern-chart__axis"/gu) ?? []).length,
        character.axisLines,
        `${context} must draw exactly its declared hairline axis count`,
      );
      if (!character.grid) assertNotMatch(svg, /discern-chart__grid/u);
      for (const encoding of character.encodings) {
        assertMatch(svg, encoding, `${context} must carry its data encoding`);
      }
    }
  }
});

Deno.test("accessibility context is present without visible canvas headings", () => {
  const svg = renderChartSvg(minimum);
  assert(svg.includes('role="img"'));
  assert(svg.includes(
    'aria-label="Compare two totals: One measured series compares a before and an after total."',
  ));
  assert(svg.includes("<title>Compare two totals</title>"));
  assert(svg.includes(
    "<desc>Title: Compare two totals&#10;Summary: One measured series compares a before and an after total.",
  ));
  const visibleText = [...svg.matchAll(/<text\b[^>]*>(.*?)<\/text>/gu)]
    .map((match) => match[1]);
  assert(!visibleText.includes("Compare two totals"));
  assert(
    !visibleText.some((line) => line?.startsWith("One measured series")),
  );
});

Deno.test("standalone palettes resolve paired semantic roles as literal styles", () => {
  for (const variant of ["light", "dark"] as const) {
    const palette = resolveChartPalette(variant);
    const svg = renderChartSvg(grouped, { theme: variant });
    assertNotMatch(svg, /var\(--discern-/u);
    assert(svg.includes(
      `.discern-chart__canvas { fill: ${palette.canvas}; }`,
    ));
    assert(svg.includes(
      `.discern-chart__mark--series-1 { fill: ${
        palette["series-1"]
      }; stroke: ${palette.canvas}; }`,
    ));
    assert(svg.includes(
      `.discern-chart__mark--series-2 { fill: ${
        palette["series-2"]
      }; stroke: ${palette.canvas}; }`,
    ));
    assert(svg.includes(
      `.discern-chart__axis { stroke: ${palette.axis}; }`,
    ));
    assert(svg.includes(
      `.discern-chart__label--axis-label { fill: ${palette["axis-label"]}; }`,
    ));
  }
  const adaptive = renderChartSvg(grouped, { theme: "adaptive" });
  assert(adaptive.includes("@media (prefers-color-scheme: dark)"));
  assert(
    adaptive.indexOf(resolveChartPalette("light").canvas) <
      adaptive.indexOf("@media (prefers-color-scheme: dark)"),
  );
  assert(adaptive.includes(resolveChartPalette("dark")["series-1"]));

  assertThrows(
    () =>
      renderChartSvg(grouped, {
        theme: "automatic",
      } as unknown as RenderChartSvgOptions),
    TypeError,
    "light, dark, or adaptive",
  );
});

Deno.test("every chart paint role rides a public series or semantic Token", async () => {
  const { baseTokens, themeTokens } = await import(
    "../../src/tokens/tokens.ts"
  );
  const names = new Set(
    [...baseTokens, ...themeTokens].map(({ name }) => name),
  );
  for (const [role, tokenName] of Object.entries(CHART_PAINT_TOKEN_NAMES)) {
    assert(names.has(tokenName), `${role} rides unknown Token ${tokenName}`);
  }
});
