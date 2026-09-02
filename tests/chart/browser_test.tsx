import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  addPageFailureListeners,
  browserFontCss,
  scanBrowserAccessibility,
  waitForPaintedFrames,
} from "../../scripts/browser-conformance-support.ts";
import { launchBrowser } from "../../scripts/browser.ts";
import {
  chartAltText,
  chartSeriesLegend,
  renderChartSvg,
} from "../../src/chart/mod.ts";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";
import type { ChartSpec } from "../../src/generated/chart-spec.ts";
import { Chart, DataFigure } from "../../src/react.ts";
import { emitDesignSystemRuntime } from "../../src/runtime.ts";

const releaseCases = chartKindRegistry.flatMap(({ meta, releaseCorpus }) =>
  releaseCorpus.cases.map((releaseCase) => ({
    label: `${meta.slug}/${releaseCase.name}`,
    spec: releaseCase.spec as ChartSpec,
  }))
);

function renderCases(
  cases: readonly { readonly label: string; readonly spec: ChartSpec }[],
  theme: "light" | "dark",
): string {
  return renderToStaticMarkup(
    <main data-discern-root data-discern-theme={theme}>
      {cases.map(({ label, spec }) => (
        <section key={label} data-chart-browser-case={label}>
          <figure style={{ margin: 0 }}>
            <Chart spec={spec} />
          </figure>
        </section>
      ))}
    </main>,
  );
}

interface ChartBrowserInspection {
  readonly label: string;
  readonly kind: string;
  readonly scale: number;
  readonly viewBoxFailures: readonly string[];
  readonly localOverflowReachable: boolean;
  readonly markCount: number;
  readonly axisCount: number;
  readonly canvasFill: string;
  readonly markFill: string;
  readonly labelFill: string;
  readonly labelFontFamily: string;
  readonly monoFontFamily: string;
  readonly viewportScrollable: boolean;
}

interface ChartPageInspection {
  readonly documentOverflow: number;
  readonly charts: readonly ChartBrowserInspection[];
}

async function inspectBrowserCharts(
  page: import("playwright-core").Page,
): Promise<ChartPageInspection> {
  return await page.evaluate(() => {
    const charts = [
      ...document.querySelectorAll<SVGSVGElement>(".discern-chart"),
    ].map((svg) => {
      const label = svg.closest("[data-chart-browser-case]")
        ?.getAttribute("data-chart-browser-case") ?? "standalone";
      const viewBox = svg.viewBox.baseVal;
      const client = svg.getBoundingClientRect();
      const failures: string[] = [];
      if (viewBox.width <= 0 || viewBox.height <= 0) {
        failures.push("viewBox is not positive");
      }
      if (client.width <= 0 || client.height <= 0) {
        failures.push("rendered box is not positive");
      }
      const scale = client.width / viewBox.width;
      const verticalScale = client.height / viewBox.height;
      if (Math.abs(scale - verticalScale) > 0.02) {
        failures.push(
          `aspect drifted: ${scale} horizontal vs ${verticalScale} vertical`,
        );
      }
      for (
        const element of svg.querySelectorAll<SVGGraphicsElement>(
          ".discern-chart__mark, .discern-chart__path, .discern-chart__points > *, .discern-chart__area, .discern-chart__axis, .discern-chart__grid, .discern-chart__reference, .discern-chart__label",
        )
      ) {
        const box = element.getBBox();
        if (
          box.x < viewBox.x - 0.5 || box.y < viewBox.y - 0.5 ||
          box.x + box.width > viewBox.x + viewBox.width + 0.5 ||
          box.y + box.height > viewBox.y + viewBox.height + 0.5
        ) {
          failures.push(
            `${
              element.getAttribute("class") ?? element.tagName
            } escaped viewBox`,
          );
        }
      }
      const filled = svg.querySelector(
        ".discern-chart__mark, .discern-chart__area, .discern-chart__points > *",
      );
      const stroked = svg.querySelector(".discern-chart__path");
      const anyLabel = svg.querySelector(".discern-chart__label");
      const plainLabel = svg.querySelector(
        ".discern-chart__label:not(.discern-chart__label--mono)",
      );
      const mono = svg.querySelector(".discern-chart__label--mono");
      const canvas = svg.querySelector(".discern-chart__canvas");
      const viewport = svg.closest(".discern-chart__viewport");
      let localOverflowReachable = true;
      if (viewport !== null && viewport.scrollWidth > viewport.clientWidth) {
        viewport.scrollLeft = viewport.scrollWidth;
        localOverflowReachable = viewport.scrollLeft >=
          viewport.scrollWidth - viewport.clientWidth - 1;
        viewport.scrollLeft = 0;
      }
      return {
        label,
        kind: svg.getAttribute("data-discern-chart-kind") ??
          svg.closest("[data-chart-browser-kind]")?.getAttribute(
            "data-chart-browser-kind",
          ) ?? "",
        scale,
        viewBoxFailures: failures,
        localOverflowReachable,
        markCount: svg.querySelectorAll(
          ".discern-chart__mark, .discern-chart__path, .discern-chart__points, .discern-chart__area",
        ).length,
        axisCount: svg.querySelectorAll(".discern-chart__axis").length,
        canvasFill: canvas === null ? "" : getComputedStyle(canvas).fill,
        markFill: filled !== null
          ? getComputedStyle(filled).fill
          : stroked !== null
          ? getComputedStyle(stroked).stroke
          : "",
        labelFill: anyLabel === null ? "" : getComputedStyle(anyLabel).fill,
        labelFontFamily: plainLabel === null
          ? ""
          : getComputedStyle(plainLabel).fontFamily,
        monoFontFamily: mono === null ? "" : getComputedStyle(mono).fontFamily,
        viewportScrollable: viewport !== null &&
          viewport.scrollWidth > viewport.clientWidth,
      };
    });
    return {
      documentOverflow: document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      charts,
    };
  });
}

/** Hairline axis population each kind's calm canvas declares. */
const AXIS_POPULATION: Readonly<Record<string, number>> = {
  bar: 1,
  line: 1,
  distribution: 1,
  heatmap: 0,
  scatter: 2,
  slope: 2,
};

function assertBrowserGeometry(
  inspection: ChartPageInspection,
  expected: number,
  context: string,
): void {
  assertEquals(
    inspection.charts.length,
    expected,
    `${context} mounted an unexpected chart population`,
  );
  assert(
    inspection.documentOverflow <= 0,
    `${context} overflowed the document by ${inspection.documentOverflow}px`,
  );
  for (const chart of inspection.charts) {
    const label = `${context}/${chart.label}`;
    assertEquals(chart.viewBoxFailures, [], label);
    assertEquals(chart.kind, chart.label.split("/")[0], label);
    assert(chart.scale > 0.05, `${label} collapsed to scale ${chart.scale}`);
    assert(chart.localOverflowReachable, `${label} overflow was unreachable`);
    assert(chart.markCount > 0, `${label} rendered no data encoding`);
    assertEquals(
      chart.axisCount,
      AXIS_POPULATION[chart.kind],
      `${label} axis population`,
    );
    assert(
      chart.canvasFill !== "" && chart.canvasFill !== "none",
      `${label} canvas fill ${chart.canvasFill}`,
    );
    assert(
      chart.markFill !== "" && chart.markFill !== "none",
      `${label} data paint ${chart.markFill}`,
    );
    assert(
      chart.labelFill !== "" && chart.labelFill !== "none",
      `${label} label fill ${chart.labelFill}`,
    );
    assert(
      chart.monoFontFamily === "" || chart.labelFontFamily === "" ||
        chart.monoFontFamily !== chart.labelFontFamily,
      `${label} mono labels did not select the monospace stack`,
    );
  }
}

Deno.test("React Chart browser matrix holds for every generated corpus case", async () => {
  const output = await Deno.makeTempDir({ prefix: "chart-browser-" });
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["chart", "data-figure"],
      theme: "blue",
    });
    const runtimeCss = await Deno.readTextFile(join(output, "discern.css"));
    const palettes = new Map<string, ChartBrowserInspection>();
    for (const fontMode of ["bundled", "system"] as const) {
      const selectedFontCss = await browserFontCss(fontMode);
      for (const width of [360, 1_440]) {
        for (const theme of ["light", "dark"] as const) {
          for (const pageScale of [1, 1.5]) {
            const browserContext = await browser.newContext({
              colorScheme: theme,
              viewport: { width, height: 1_000 },
            });
            const page = await browserContext.newPage();
            const failures: string[] = [];
            addPageFailureListeners(page, failures);
            try {
              const cdp = await page.context().newCDPSession(page);
              await cdp.send("Emulation.setPageScaleFactor", {
                pageScaleFactor: pageScale,
              });
              await page.setContent(
                `<style>html,body{margin:0;max-width:100%;font-size:${
                  pageScale === 1 ? 100 : 125
                }%}${runtimeCss}${selectedFontCss}</style>${
                  renderCases(releaseCases, theme)
                }`,
              );
              await page.evaluate(() => document.fonts.ready);
              const matrixContext =
                `${fontMode}/${width}/${theme}/${pageScale}`;
              const inspection = await inspectBrowserCharts(page);
              assertBrowserGeometry(
                inspection,
                releaseCases.length,
                matrixContext,
              );
              if (width === 360) {
                assert(
                  inspection.charts.some(({ viewportScrollable }) =>
                    viewportScrollable
                  ),
                  `${matrixContext} must keep wide charts locally scrollable`,
                );
              }
              for (const chart of inspection.charts) {
                for (
                  const family of [chart.labelFontFamily, chart.monoFontFamily]
                ) {
                  if (family === "") continue;
                  if (fontMode === "bundled") {
                    assert(
                      family.includes("Inter") ||
                        family.includes("JetBrains Mono"),
                      `${matrixContext}/${chart.label} missed its bundled font role`,
                    );
                  } else {
                    assert(
                      !family.includes("Inter") &&
                        !family.includes("JetBrains Mono"),
                      `${matrixContext}/${chart.label} missed the system fallback`,
                    );
                  }
                }
              }
              const accessibility = await scanBrowserAccessibility(
                page,
                "main",
              );
              assertEquals(
                accessibility.violations.map(({ id }) => id),
                [],
                matrixContext,
              );
              assertEquals(failures, [], matrixContext);
              const actualScale = await page.evaluate(() =>
                globalThis.visualViewport?.scale ?? 1
              );
              assert(
                Math.abs(actualScale - pageScale) <= 0.01,
                `${matrixContext} requested scale ${pageScale}, found ${actualScale}`,
              );
              palettes.set(matrixContext, inspection.charts[0]!);
            } finally {
              await page.close();
              await browserContext.close();
            }
          }
        }
      }
    }
    assertNotEquals(
      palettes.get("bundled/1440/light/1")?.canvasFill,
      palettes.get("bundled/1440/dark/1")?.canvasFill,
    );
    assertNotEquals(
      palettes.get("bundled/1440/light/1")?.markFill,
      palettes.get("bundled/1440/dark/1")?.markFill,
    );
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("Chart and DataFigure compositions are Axe-clean in light, dark, and forced colours", async () => {
  const output = await Deno.makeTempDir({ prefix: "chart-axe-" });
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["chart", "data-figure"],
      theme: "blue",
    });
    const css = await Deno.readTextFile(join(output, "discern.css"));
    const markup = (theme: "light" | "dark") =>
      renderToStaticMarkup(
        <main data-discern-root data-discern-theme={theme}>
          {releaseCases.map(({ label, spec }) => (
            <DataFigure
              key={label}
              title={`${label} reference`}
              legend={chartSeriesLegend(spec)}
              visual={<Chart spec={spec} />}
              caption="The surrounding document owns the visible caption."
            />
          ))}
        </main>,
      );
    for (
      const posture of [
        { theme: "light", forcedColors: "none" },
        { theme: "dark", forcedColors: "none" },
        { theme: "light", forcedColors: "active" },
      ] as const
    ) {
      const context = await browser.newContext({
        colorScheme: posture.theme,
        forcedColors: posture.forcedColors,
        viewport: { width: 1_200, height: 900 },
      });
      const page = await context.newPage();
      const failures: string[] = [];
      addPageFailureListeners(page, failures);
      try {
        await page.setContent(`<style>${css}</style>${markup(posture.theme)}`);
        const accessibility = await scanBrowserAccessibility(page, "main");
        assertEquals(
          accessibility.violations.map(({ id }) => id),
          [],
          `${posture.theme}/${posture.forcedColors}\n${
            accessibility.violations.map((violation) =>
              `${violation.id}: ${
                violation.nodes.map((node) =>
                  `${node.target.join(" ")} (${node.failureSummary ?? ""})`
                ).join("; ")
              }`
            ).join("\n")
          }`,
        );
        const facts = await page.evaluate(() => {
          const svgs = [...document.querySelectorAll(".discern-chart")];
          const cueFailures: string[] = [];
          const encodingSelector =
            ".discern-chart__mark, .discern-chart__path, .discern-chart__points, .discern-chart__area";
          for (const [svgIndex, svg] of svgs.entries()) {
            const encodings = [
              ...svg.querySelectorAll<SVGGraphicsElement>(encodingSelector),
            ];
            const signature = (element: SVGGraphicsElement): string => {
              const style = getComputedStyle(element);
              const shape = element.matches(".discern-chart__points")
                ? element.firstElementChild?.localName ?? "empty"
                : element.localName;
              return `${shape}/${style.strokeDasharray}`;
            };
            for (const prefix of ["series", "ramp"] as const) {
              const cues = new Map<string, string>();
              for (const element of encodings) {
                const role = [...element.classList].find((name) =>
                  name.includes(`--${prefix}-`)
                )?.split("--")[1];
                if (role !== undefined && !cues.has(role)) {
                  cues.set(role, signature(element));
                }
              }
              if (
                cues.size > 1 && new Set(cues.values()).size !== cues.size
              ) {
                cueFailures.push(
                  `chart ${svgIndex} ${prefix} cues collapsed: ${
                    JSON.stringify([...cues])
                  }`,
                );
              }
            }
          }
          const swatchCues = new Map<string, string>();
          for (
            const swatch of document.querySelectorAll<HTMLElement>(
              "[class*='discern-data-figure__swatch--series-']",
            )
          ) {
            const role = [...swatch.classList].find((name) =>
              name.startsWith("discern-data-figure__swatch--series-")
            );
            if (role === undefined || swatchCues.has(role)) continue;
            const style = getComputedStyle(swatch);
            swatchCues.set(
              role,
              `${style.borderRadius}/${style.clipPath}`,
            );
          }
          return {
            charts: svgs.length,
            completeNames: svgs.every((svg) =>
              svg.querySelector("title")?.textContent?.trim() !== "" &&
              svg.querySelector("desc")?.textContent?.trim() !== ""
            ),
            visibleEncodings: svgs.every((svg) =>
              [...svg.querySelectorAll<SVGGraphicsElement>(
                encodingSelector,
              )].every((encoding) => {
                const style = getComputedStyle(encoding);
                return (style.fill !== "none" &&
                  style.fill !== "transparent") ||
                  (style.stroke !== "none" && style.stroke !== "transparent");
              })
            ),
            forcedAdjustment: svgs.every((svg) =>
              getComputedStyle(svg).forcedColorAdjust === "none"
            ),
            cueFailures,
            swatches: document.querySelectorAll(
              "[class*='discern-data-figure__swatch--series-']",
            ).length,
            swatchCueCount: new Set(swatchCues.values()).size,
            visibleSwatches: [...document.querySelectorAll<HTMLElement>(
              "[class*='discern-data-figure__swatch--series-']",
            )].every((swatch) => {
              const style = getComputedStyle(swatch);
              return style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
                style.backgroundColor !== "transparent" &&
                style.borderColor !== "transparent";
            }),
            duplicateIds: [...document.querySelectorAll("[id]")]
              .map((element) => element.id)
              .filter((id, index, ids) => ids.indexOf(id) !== index),
          };
        });
        assertEquals(facts.charts, releaseCases.length);
        assert(facts.completeNames);
        assert(facts.visibleEncodings);
        assertEquals(facts.cueFailures, []);
        assert(facts.swatches > 0);
        if (posture.forcedColors === "active") {
          assert(facts.forcedAdjustment);
          assert(facts.visibleSwatches);
          assertEquals(facts.swatchCueCount, 6);
        }
        assertEquals(facts.duplicateIds, []);
        assertEquals(failures, []);
      } finally {
        await page.close();
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

async function imageHash(
  locator: import("playwright-core").Locator,
): Promise<string> {
  const bytes = await locator.screenshot({ animations: "disabled" });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    Uint8Array.from(bytes).buffer,
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.test("every standalone chart case and theme works inline and through img", async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({
    colorScheme: "light",
    viewport: { width: 2_000, height: 1_000 },
  });
  try {
    const assets = releaseCases.flatMap(({ label, spec }) =>
      (["light", "dark", "adaptive"] as const).map((theme) => ({
        alt: chartAltText(spec),
        id: `chart-${label.replaceAll("/", "-")}-${theme}`,
        kind: label.split("/")[0]!,
        label,
        svg: renderChartSvg(spec, { theme }),
        theme,
      }))
    );
    const imageMarkup = assets.map(({ alt, id, svg }) =>
      `<img id="${id}" src="data:image/svg+xml;charset=utf-8,${
        encodeURIComponent(svg)
      }" alt="${alt.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">`
    ).join("");
    await page.setContent(
      `<style>html,body{margin:0}main{display:grid;gap:16px}img{display:block;max-width:100%;height:auto}</style><main>${imageMarkup}</main>`,
    );
    await Promise.all(
      assets.map(({ id }) =>
        page.locator(`#${id}`).waitFor({ state: "visible" })
      ),
    );
    const imageFacts = await page.locator("img").evaluateAll((images) =>
      images.map((element) => {
        const image = element as HTMLImageElement;
        return {
          alt: image.alt,
          complete: image.complete,
          naturalHeight: image.naturalHeight,
          naturalWidth: image.naturalWidth,
        };
      })
    );
    assertEquals(imageFacts.length, assets.length);
    for (const [index, image] of imageFacts.entries()) {
      assert(image.complete);
      assert(image.naturalWidth > 0 && image.naturalHeight > 0);
      assertEquals(image.alt, assets[index]?.alt);
    }
    const adaptive = page.locator("img[id$='-adaptive']").first();
    const adaptiveLight = await imageHash(adaptive);
    await page.emulateMedia({ colorScheme: "dark" });
    await waitForPaintedFrames(page);
    const adaptiveDark = await imageHash(adaptive);
    assertNotEquals(adaptiveLight, adaptiveDark);
    await page.emulateMedia({ colorScheme: "light", forcedColors: "active" });
    await waitForPaintedFrames(page);
    const adaptiveForced = await imageHash(adaptive);
    assert(
      adaptiveForced.length > 0,
      "forced-colour image delivery stays painted",
    );

    await page.emulateMedia({ colorScheme: "light", forcedColors: "none" });
    const inlineMarkup = assets.map(({ kind, label, svg, theme }) =>
      `<section class="standalone" data-chart-browser-case="${label}/${theme}" data-chart-browser-kind="${kind}">${svg}</section>`
    ).join("");
    await page.setContent(
      `<style>html,body{margin:0;max-width:100%}main{display:grid;gap:16px}.standalone{max-width:100%;overflow:auto}</style><main>${inlineMarkup}</main>`,
    );
    const inlineInspection = await inspectBrowserCharts(page);
    assertBrowserGeometry(
      inlineInspection,
      assets.length,
      "standalone/inline",
    );
    for (const { label } of releaseCases) {
      const light = inlineInspection.charts.find((chart) =>
        chart.label === `${label}/light`
      );
      const dark = inlineInspection.charts.find((chart) =>
        chart.label === `${label}/dark`
      );
      const adaptive = inlineInspection.charts.find((chart) =>
        chart.label === `${label}/adaptive`
      );
      assert(
        light !== undefined && dark !== undefined && adaptive !== undefined,
      );
      assertNotEquals(light.canvasFill, dark.canvasFill, `${label}/canvas`);
      assertNotEquals(light.markFill, dark.markFill, `${label}/data paint`);
      assertEquals(adaptive.canvasFill, light.canvasFill, `${label}/adaptive`);
    }
  } finally {
    await page.close();
    await browser.close();
  }
});
