import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  browserFontCss,
  scanBrowserAccessibility,
  waitForPaintedFrames,
} from "../../scripts/browser-conformance-support.ts";
import { launchBrowser } from "../../scripts/browser.ts";
import {
  auditDiagramFontMetricAssets,
  DIAGRAM_FONT_METRICS,
  type DiagramFontRole,
  measureDiagramText,
} from "../../src/diagram/font-metrics.ts";
import {
  diagramAltText,
  renderDiagramMarkdownImage,
  renderDiagramSvg,
} from "../../src/diagram/mod.ts";
import { diagramKindRegistry } from "../../src/generated/diagram-registry.ts";
import type { DiagramSpec } from "../../src/generated/diagram-spec.ts";
import { DataFigure, Diagram, Markdown } from "../../src/react.ts";
import { emitDesignSystemRuntime } from "../../src/runtime.ts";

const releaseCases = diagramKindRegistry.flatMap(({ meta, releaseCorpus }) =>
  releaseCorpus.cases.map((releaseCase) => ({
    label: `${meta.slug}/${releaseCase.name}`,
    spec: releaseCase.spec as DiagramSpec,
  }))
);

const browserCases = diagramKindRegistry.map(({ meta, releaseCorpus }) => ({
  label: meta.slug,
  spec: (releaseCorpus.cases.find(({ name }) => name === "long-text") ??
    releaseCorpus.cases[0])?.spec as DiagramSpec,
}));

function renderCases(
  cases: readonly { readonly label: string; readonly spec: DiagramSpec }[],
): string {
  return renderToStaticMarkup(
    <main data-discern-root data-discern-theme="light">
      {cases.map(({ label, spec }) => (
        <div key={label} style={{ display: "grid" }}>
          <section data-diagram-browser-case={label}>
            <figure style={{ margin: 0 }}>
              <Diagram spec={spec} />
            </figure>
          </section>
        </div>
      ))}
    </main>,
  );
}

interface DiagramBrowserInspection {
  readonly label: string;
  readonly kind: string;
  readonly scale: number;
  readonly viewBoxFailures: readonly string[];
  readonly textCollisions: readonly string[];
  readonly textContainmentFailures: readonly string[];
  readonly connectorDefects: readonly string[];
  readonly lineAlignmentFailures: readonly string[];
  readonly localOverflow: number;
  readonly localOverflowReachable: boolean;
  readonly canvasFill: string;
  readonly nodeFill: string;
  readonly nodeStroke: string;
  readonly textFill: string;
  readonly fontFamily: string;
}

interface DiagramPageInspection {
  readonly documentOverflow: number;
  readonly diagrams: readonly DiagramBrowserInspection[];
}

async function inspectBrowserDiagrams(
  page: import("playwright-core").Page,
): Promise<DiagramPageInspection> {
  return await page.evaluate(() => {
    const diagrams = [
      ...document.querySelectorAll<SVGSVGElement>(".discern-diagram"),
    ].map((svg, diagramIndex) => {
      const viewBox = svg.viewBox.baseVal;
      const withinViewBox = (box: DOMRect | SVGRect): boolean =>
        box.x >= viewBox.x - 0.5 && box.y >= viewBox.y - 0.5 &&
        box.x + box.width <= viewBox.x + viewBox.width + 0.5 &&
        box.y + box.height <= viewBox.y + viewBox.height + 0.5;
      const viewBoxFailures = [
        ...svg.querySelectorAll<SVGGraphicsElement>(
          ".discern-diagram__node, .discern-diagram__text, .discern-diagram__connector, .discern-diagram__arrowhead, .discern-diagram__region, .discern-diagram__guide",
        ),
      ].flatMap((element) => {
        const box = element.getBBox();
        return withinViewBox(box) ? [] : [
          `${element.getAttribute("class") ?? element.tagName} escaped viewBox`,
        ];
      });

      const lines = [
        ...svg.querySelectorAll<SVGTSpanElement>("tspan"),
      ].map((line, lineIndex) => ({
        box: line.getBBox(),
        owner: line.parentElement?.getAttribute(
          "data-discern-diagram-owner",
        ) ?? `unowned-${lineIndex}`,
        text: line.textContent ?? "",
      }));
      const textCollisions: string[] = [];
      for (let leftIndex = 0; leftIndex < lines.length; leftIndex += 1) {
        const left = lines[leftIndex];
        if (left === undefined) continue;
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < lines.length;
          rightIndex += 1
        ) {
          const right = lines[rightIndex];
          if (right === undefined || left.owner === right.owner) continue;
          const overlapX = Math.min(
            left.box.x + left.box.width,
            right.box.x + right.box.width,
          ) - Math.max(left.box.x, right.box.x);
          const overlapY = Math.min(
            left.box.y + left.box.height,
            right.box.y + right.box.height,
          ) - Math.max(left.box.y, right.box.y);
          if (overlapX > 0.5 && overlapY > 0.5) {
            textCollisions.push(
              `${left.owner}/${left.text} overlaps ${right.owner}/${right.text}`,
            );
          }
        }
      }

      const textContainmentFailures = [
        ...svg.querySelectorAll<SVGGElement>(".discern-diagram__group"),
      ].flatMap((group) => {
        const node = group.querySelector<SVGGraphicsElement>(
          ":scope > .discern-diagram__node",
        );
        const text = group.querySelector<SVGTextElement>(
          ":scope > .discern-diagram__text",
        );
        if (node === null || text === null) return [];
        const nodeBox = node.getBBox();
        const textBox = text.getBBox();
        const contained = textBox.x >= nodeBox.x + 1 &&
          textBox.y >= nodeBox.y + 1 &&
          textBox.x + textBox.width <= nodeBox.x + nodeBox.width - 1 &&
          textBox.y + textBox.height <= nodeBox.y + nodeBox.height - 1;
        return contained ? [] : [
          `${text.dataset.discernDiagramOwner ?? "text"} escaped its node`,
        ];
      });

      const obstacles = [
        ...svg.querySelectorAll<SVGGraphicsElement>(
          ".discern-diagram__node, .discern-diagram__text",
        ),
      ].map((element) => ({
        name: element.getAttribute("data-discern-diagram-owner") ??
          element.getAttribute("class") ?? element.tagName,
        owner: element.getAttribute("data-discern-diagram-owner"),
        text: element.matches("text"),
        element,
      }));
      const connectorDefects: string[] = [];
      for (
        const line of svg.querySelectorAll<SVGPolylineElement>(
          ".discern-diagram__connector",
        )
      ) {
        const relationship = line.closest<SVGGElement>(
          "[data-discern-diagram-relationship]",
        )?.dataset.discernDiagramRelationship ?? "unknown";
        const first = line.points.getItem(0);
        const last = line.points.getItem(line.points.numberOfItems - 1);
        const attached = new Set<SVGGraphicsElement>();
        for (const obstacle of obstacles) {
          if (obstacle.text) continue;
          const geometry = obstacle.element as SVGGeometryElement;
          if (
            geometry.isPointInFill(first) || geometry.isPointInFill(last) ||
            geometry.isPointInStroke(first) || geometry.isPointInStroke(last)
          ) {
            attached.add(obstacle.element);
          }
        }
        for (
          let pointIndex = 1;
          pointIndex < line.points.numberOfItems;
          pointIndex += 1
        ) {
          const start = line.points.getItem(pointIndex - 1);
          const end = line.points.getItem(pointIndex);
          for (let step = 1; step < 20; step += 1) {
            const amount = step / 20;
            const point = new DOMPoint(
              start.x + (end.x - start.x) * amount,
              start.y + (end.y - start.y) * amount,
            );
            for (const obstacle of obstacles) {
              if (
                attached.has(obstacle.element) ||
                (obstacle.text && obstacle.owner === relationship)
              ) continue;
              const obstacleBox = obstacle.element.getBBox();
              const crosses = obstacle.text
                ? obstacleBox.x < point.x &&
                  obstacleBox.x + obstacleBox.width > point.x &&
                  obstacleBox.y < point.y &&
                  obstacleBox.y + obstacleBox.height > point.y
                : (obstacle.element as SVGGeometryElement).isPointInFill(
                  point,
                );
              if (crosses) {
                connectorDefects.push(
                  `${relationship} crosses ${obstacle.name} at ${point.x},${point.y}`,
                );
              }
            }
          }
        }
      }

      const lineAlignmentFailures = [
        ...svg.querySelectorAll<SVGTSpanElement>("tspan"),
      ].flatMap((line) => {
        const anchor = Number(line.getAttribute("x"));
        const characterExtents = Array.from(
          { length: line.getNumberOfChars() },
          (_, index) => [
            line.getStartPositionOfChar(index).x,
            line.getEndPositionOfChar(index).x,
          ],
        ).flat();
        const advanceStart = Math.min(...characterExtents);
        const advanceEnd = Math.max(...characterExtents);
        const offset = Math.abs((advanceStart + advanceEnd) / 2 - anchor);
        return offset <= 0.05 ? [] : [
          `${line.textContent ?? "line"} offset ${offset}`,
        ];
      });
      const viewport = svg.closest<HTMLElement>(
        ".discern-diagram__viewport",
      );
      const localOverflow = viewport === null
        ? 0
        : viewport.scrollWidth - viewport.clientWidth;
      let localOverflowReachable = true;
      if (viewport !== null && localOverflow > 0) {
        viewport.scrollLeft = viewport.scrollWidth;
        localOverflowReachable = viewport.scrollLeft >= localOverflow - 1;
        viewport.scrollLeft = 0;
      }
      const canvas = svg.querySelector<SVGRectElement>(
        ".discern-diagram__canvas",
      );
      const node = svg.querySelector<SVGGraphicsElement>(
        ".discern-diagram__node",
      );
      const text = svg.querySelector<SVGTextElement>(
        ".discern-diagram__text",
      );
      if (canvas === null || node === null || text === null) {
        throw new Error("incomplete Diagram paint structure");
      }
      return {
        label: svg.closest<HTMLElement>("[data-diagram-browser-case]")
          ?.dataset.diagramBrowserCase ?? `diagram-${diagramIndex}`,
        kind: svg.dataset.discernDiagramKind ?? "unknown",
        scale: svg.getBoundingClientRect().width / viewBox.width,
        viewBoxFailures,
        textCollisions,
        textContainmentFailures,
        connectorDefects,
        lineAlignmentFailures,
        localOverflow,
        localOverflowReachable,
        canvasFill: getComputedStyle(canvas).fill,
        nodeFill: getComputedStyle(node).fill,
        nodeStroke: getComputedStyle(node).stroke,
        textFill: getComputedStyle(text).fill,
        fontFamily: getComputedStyle(text).fontFamily,
      };
    });
    return {
      documentOverflow: document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      diagrams,
    };
  });
}

function assertBrowserGeometry(
  inspection: DiagramPageInspection,
  expectedCases: number,
  context: string,
): void {
  assert(
    inspection.documentOverflow <= 0,
    `${context} created ${inspection.documentOverflow}px page overflow`,
  );
  assertEquals(inspection.diagrams.length, expectedCases);
  for (const diagram of inspection.diagrams) {
    assertEquals(diagram.viewBoxFailures, [], `${context}/${diagram.label}`);
    assertEquals(diagram.textCollisions, [], `${context}/${diagram.label}`);
    assertEquals(
      diagram.textContainmentFailures,
      [],
      `${context}/${diagram.label}`,
    );
    assertEquals(diagram.connectorDefects, [], `${context}/${diagram.label}`);
    assertEquals(
      diagram.lineAlignmentFailures,
      [],
      `${context}/${diagram.label}`,
    );
    assert(
      Math.abs(diagram.scale - 1) <= 0.01,
      `${context}/${diagram.label} rendered at ${diagram.scale} instead of intrinsic scale`,
    );
    assert(
      diagram.localOverflowReachable,
      `${context}/${diagram.label} local overflow was unreachable`,
    );
    assertNotEquals(diagram.nodeFill, diagram.textFill);
    assertNotEquals(diagram.nodeStroke, diagram.nodeFill);
  }
}

Deno.test("React Diagram browser geometry holds for the generated corpus", async () => {
  const output = await Deno.makeTempDir({ prefix: "diagram-browser-" });
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["diagram", "data-figure", "markdown"],
      theme: "discern",
    });
    const runtimeCss = await Deno.readTextFile(join(output, "discern.css"));
    const fontCss = await browserFontCss("bundled");
    const corpusPage = await browser.newPage({
      colorScheme: "light",
      viewport: { width: 1_440, height: 1_000 },
    });
    try {
      await corpusPage.setContent(
        `<style>html,body{margin:0;max-width:100%}${runtimeCss}${fontCss}</style>${
          renderCases(releaseCases)
        }`,
      );
      await corpusPage.evaluate(() => document.fonts.ready);
      assertBrowserGeometry(
        await inspectBrowserDiagrams(corpusPage),
        releaseCases.length,
        "complete corpus",
      );
    } finally {
      await corpusPage.close();
    }

    const palettes = new Map<string, DiagramBrowserInspection>();
    for (const fontMode of ["bundled", "system"] as const) {
      for (const width of [360, 1_200]) {
        for (const theme of ["light", "dark"] as const) {
          for (const pageScale of [1, 1.5]) {
            const page = await browser.newPage({
              colorScheme: theme,
              viewport: { width, height: 900 },
            });
            try {
              const cdp = await page.context().newCDPSession(page);
              await cdp.send("Emulation.setPageScaleFactor", {
                pageScaleFactor: pageScale,
              });
              const selectedFontCss = fontMode === "bundled"
                ? fontCss
                : await browserFontCss("system");
              const markup = renderCases(browserCases).replace(
                'data-discern-theme="light"',
                `data-discern-theme="${theme}"`,
              );
              await page.setContent(
                `<style>html,body{margin:0;max-width:100%;font-size:${
                  pageScale === 1 ? 100 : 125
                }%}${runtimeCss}${selectedFontCss}</style>${markup}`,
              );
              await page.evaluate(() => document.fonts.ready);
              const inspection = await inspectBrowserDiagrams(page);
              assertBrowserGeometry(
                inspection,
                browserCases.length,
                `${fontMode}/${width}/${theme}/${pageScale}`,
              );
              for (const diagram of inspection.diagrams) {
                if (fontMode === "bundled") {
                  assert(
                    diagram.fontFamily.includes("Inter"),
                    `${diagram.label} did not use the bundled interface role`,
                  );
                } else {
                  assert(
                    !diagram.fontFamily.includes("Inter"),
                    `${diagram.label} did not reach the system fallback`,
                  );
                }
              }
              const actualScale = await page.evaluate(() =>
                globalThis.visualViewport?.scale ?? 1
              );
              assert(
                Math.abs(actualScale - pageScale) <= 0.01,
                `requested page scale ${pageScale}, found ${actualScale}`,
              );
              palettes.set(
                `${fontMode}/${width}/${theme}/${pageScale}`,
                inspection.diagrams[0]!,
              );
            } finally {
              await page.close();
            }
          }
        }
      }
    }
    assertNotEquals(
      palettes.get("bundled/1200/light/1")?.canvasFill,
      palettes.get("bundled/1200/dark/1")?.canvasFill,
    );
    assertNotEquals(
      palettes.get("bundled/1200/light/1")?.textFill,
      palettes.get("bundled/1200/dark/1")?.textFill,
    );
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("diagram metric approximation is conservative and digest-bound", async () => {
  const assets = await Promise.all(
    Object.values(DIAGRAM_FONT_METRICS).map(async ({ source }) => ({
      source,
      bytes: await Deno.readFile(join("assets", source)),
    })),
  );
  assertEquals(await auditDiagramFontMetricAssets(assets), []);

  const samples: readonly {
    readonly role: DiagramFontRole;
    readonly text: string;
  }[] = [
    { role: "interface", text: "Reference wording" },
    { role: "interface", text: "設計系统圖" },
    { role: "interface", text: "Cafe\u0301 and naïve" },
    { role: "interface", text: 'API / v2.0: "ready"?' },
    { role: "mono", text: "src/api-v2.ts → cache" },
  ];
  const probes = samples.map(({ role, text }, index) =>
    `<text data-probe="${index}" data-role="${role}" data-limit="${
      measureDiagramText(text, 16, role)
    }" x="0" y="${24 + index * 40}" font-size="16" font-family="${
      role === "mono" ? "JetBrains Mono, monospace" : "Inter, sans-serif"
    }">${
      text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(
        ">",
        "&gt;",
      )
    }</text>`
  ).join("");
  const browser = await launchBrowser();
  try {
    for (const fontMode of ["bundled", "system"] as const) {
      const page = await browser.newPage();
      try {
        const fontCss = fontMode === "bundled"
          ? await browserFontCss("bundled")
          : "text[data-role=interface]{font-family:system-ui,sans-serif!important}text[data-role=mono]{font-family:ui-monospace,monospace!important}";
        await page.setContent(
          `<style>${fontCss}</style><svg width="1200" height="${
            samples.length * 40
          }">${probes}</svg>`,
        );
        await page.evaluate(() => document.fonts.ready);
        const measurements = await page.locator("[data-probe]").evaluateAll(
          (nodes) =>
            nodes.map((node) => {
              const text = node as SVGTextContentElement;
              return {
                actual: text.getComputedTextLength(),
                limit: Number((text as SVGTextElement).dataset.limit),
              };
            }),
        );
        for (const [index, measurement] of measurements.entries()) {
          assert(
            measurement.actual <= measurement.limit + 0.5,
            `${fontMode}/${
              samples[index]?.text
            } measured ${measurement.actual}px against ${measurement.limit}px authority`,
          );
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

Deno.test("Diagram and registered Markdown compositions are Axe-clean in forced colours", async () => {
  const output = await Deno.makeTempDir({ prefix: "diagram-axe-" });
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["diagram", "data-figure", "markdown"],
      theme: "discern",
    });
    const css = await Deno.readTextFile(join(output, "discern.css"));
    const resource = {
      source: "./reference-flow.svg",
      spec: browserCases[0]!.spec,
    } as const;
    const source = renderDiagramMarkdownImage(resource);
    const markup = renderToStaticMarkup(
      <main data-discern-root data-discern-theme="light">
        {releaseCases.map(({ label, spec }) => (
          <DataFigure
            key={label}
            title={`${label} reference`}
            visual={<Diagram spec={spec} />}
            caption="The surrounding document owns the visible caption."
          />
        ))}
        <Markdown source={source} diagrams={[resource]} />
      </main>,
    );
    const context = await browser.newContext({
      colorScheme: "light",
      forcedColors: "active",
      viewport: { width: 1_200, height: 900 },
    });
    const page = await context.newPage();
    try {
      await page.setContent(`<style>${css}</style>${markup}`);
      const accessibility = await scanBrowserAccessibility(page, "main");
      assertEquals(
        accessibility.violations.map(({ id }) => id),
        [],
      );
      const posture = await page.evaluate(() => {
        const svgs = [...document.querySelectorAll(".discern-diagram")];
        const returned = document.querySelector(
          ".discern-diagram__connector--return",
        );
        const secondary = document.querySelector(
          ".discern-diagram__connector--secondary",
        );
        if (returned === null || secondary === null) {
          throw new Error("release corpus omitted connector line treatments");
        }
        return {
          diagrams: svgs.length,
          completeNames: svgs.every((svg) =>
            svg.querySelector("title")?.textContent?.trim() !== "" &&
            svg.querySelector("desc")?.textContent?.trim() !== ""
          ),
          visibleNodes: svgs.every((svg) =>
            [...svg.querySelectorAll<SVGGraphicsElement>(
              ".discern-diagram__node",
            )].every((node) => {
              const style = getComputedStyle(node);
              return style.stroke !== "none" && style.stroke !== "transparent";
            })
          ),
          visibleConnectors: svgs.every((svg) =>
            [...svg.querySelectorAll<SVGGraphicsElement>(
              ".discern-diagram__connector",
            )].every((connector) => {
              const style = getComputedStyle(connector);
              return style.stroke !== "none" && style.stroke !== "transparent";
            })
          ),
          returnDash: getComputedStyle(returned).strokeDasharray,
          secondaryDash: getComputedStyle(secondary).strokeDasharray,
          duplicateIds: [...document.querySelectorAll("[id]")]
            .map((element) => element.id)
            .filter((id, index, ids) => ids.indexOf(id) !== index),
        };
      });
      assertEquals(posture.diagrams, releaseCases.length + 1);
      assert(posture.completeNames);
      assert(posture.visibleNodes);
      assert(posture.visibleConnectors);
      assertNotEquals(posture.returnDash, posture.secondaryDash);
      assertEquals(posture.duplicateIds, []);
    } finally {
      await page.close();
      await context.close();
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

Deno.test("every standalone theme and kind works inline and through img", async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({
    colorScheme: "light",
    viewport: { width: 2_000, height: 1_000 },
  });
  try {
    const assets = browserCases.flatMap(({ label, spec }) =>
      (["light", "dark", "adaptive"] as const).map((theme) => ({
        alt: diagramAltText(spec),
        id: `${label}-${theme}`,
        svg: renderDiagramSvg(spec, { theme }),
        theme,
      }))
    );
    const markup = assets.map(({ alt, id, svg }) =>
      `<img id="${id}" src="data:image/svg+xml;charset=utf-8,${
        encodeURIComponent(svg)
      }" alt="${alt.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">`
    ).join("");
    await page.setContent(
      `<style>html,body{margin:0}main{display:grid;gap:16px}img{display:block;max-width:100%;height:auto}</style><main>${markup}</main>`,
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

    for (const { id, svg, theme } of assets) {
      await page.emulateMedia({
        colorScheme: theme === "dark" ? "dark" : "light",
      });
      await page.setContent(svg);
      const inspection = await inspectBrowserDiagrams(page);
      assertBrowserGeometry(inspection, 1, `standalone/${id}`);
    }
  } finally {
    await page.close();
    await browser.close();
  }
});
