import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../../scripts/browser.ts";
import { DataFigure, Diagram } from "../../src/react.ts";
import { emitDesignSystemRuntime } from "../../src/runtime.ts";
import {
  type FlowDiagramSpec,
  renderDiagramSvg,
} from "../../src/diagram/mod.ts";
import fixtures from "../../src/diagram/kinds/flow/flow.fixtures.ts";

const decisionFlow = fixtures[0];

const longFlow = {
  kind: "flow",
  title: "Preserve detailed reference wording",
  summary:
    "Conservative geometry gives complete labels and annotations enough room at narrow and wide browser sizes.",
  direction: "left-to-right",
  nodes: [
    {
      id: "collect",
      label: "Collect relevant source observations",
      annotation: "Retain their qualifying context",
      role: "start",
    },
    {
      id: "compare",
      label: "Compare against stated criteria",
    },
    {
      id: "record",
      label: "Record conclusion with context",
      role: "end",
    },
  ],
  edges: [
    { id: "collected", from: "collect", to: "compare" },
    {
      id: "supported",
      from: "compare",
      to: "record",
    },
  ],
} as const satisfies FlowDiagramSpec;

interface DiagramBrowserInspection {
  readonly documentOverflow: number;
  readonly viewBoxFailures: readonly string[];
  readonly connectorDefects: readonly string[];
  readonly canvasFill: string;
  readonly nodeFill: string;
  readonly nodeStroke: string;
  readonly textFill: string;
}

interface DiagramProjectionInspection {
  readonly scales: readonly number[];
  readonly misalignedLines: readonly string[];
  readonly documentOverflow: number;
}

async function inspectBrowserDiagram(
  page: import("playwright-core").Page,
): Promise<DiagramBrowserInspection> {
  return await page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>(".discern-diagram");
    if (svg === null) throw new Error("missing Diagram SVG");
    const viewBox = svg.viewBox.baseVal;
    const withinViewBox = (box: DOMRect | SVGRect): boolean =>
      box.x >= viewBox.x - 0.5 && box.y >= viewBox.y - 0.5 &&
      box.x + box.width <= viewBox.x + viewBox.width + 0.5 &&
      box.y + box.height <= viewBox.y + viewBox.height + 0.5;
    const viewBoxFailures = [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        ".discern-diagram__node, .discern-diagram__text, .discern-diagram__connector, .discern-diagram__arrowhead",
      ),
    ].flatMap((element) => {
      const box = element.getBBox();
      return withinViewBox(box) ? [] : [
        `${element.getAttribute("class") ?? element.tagName} escaped viewBox`,
      ];
    });
    const obstacles = [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        ".discern-diagram__node, .discern-diagram__text",
      ),
    ].map((element) => ({
      name: element.getAttribute("data-discern-diagram-owner") ??
        element.getAttribute("class") ?? element.tagName,
      box: element.getBBox(),
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
      for (
        let pointIndex = 1;
        pointIndex < line.points.numberOfItems;
        pointIndex += 1
      ) {
        const start = line.points.getItem(pointIndex - 1);
        const end = line.points.getItem(pointIndex);
        for (let step = 1; step < 20; step += 1) {
          const amount = step / 20;
          const x = start.x + (end.x - start.x) * amount;
          const y = start.y + (end.y - start.y) * amount;
          for (const obstacle of obstacles) {
            const inset = obstacle.text ? -0.5 : 1;
            const crosses = obstacle.text
              ? x > obstacle.box.x + inset &&
                x < obstacle.box.x + obstacle.box.width - inset &&
                y > obstacle.box.y + inset &&
                y < obstacle.box.y + obstacle.box.height - inset
              : (obstacle.element as SVGGeometryElement).isPointInFill(
                new DOMPoint(x, y),
              );
            if (crosses) {
              connectorDefects.push(
                `${relationship} crosses ${obstacle.name} at ${x},${y}`,
              );
            }
          }
        }
      }
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
      documentOverflow: document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      viewBoxFailures,
      connectorDefects,
      canvasFill: getComputedStyle(canvas).fill,
      nodeFill: getComputedStyle(node).fill,
      nodeStroke: getComputedStyle(node).stroke,
      textFill: getComputedStyle(text).fill,
    };
  });
}

async function inspectDiagramProjection(
  page: import("playwright-core").Page,
): Promise<DiagramProjectionInspection> {
  return await page.evaluate(() => {
    const svgs = [
      ...document.querySelectorAll<SVGSVGElement>(".discern-diagram"),
    ];
    const misalignedLines = svgs.flatMap((svg, diagramIndex) =>
      [...svg.querySelectorAll<SVGTSpanElement>("tspan")].flatMap((line) => {
        const anchor = Number(line.getAttribute("x"));
        const bounds = line.getBBox();
        const offset = Math.abs(bounds.x + bounds.width / 2 - anchor);
        return offset <= 0.75 ? [] : [
          `diagram ${diagramIndex} ${
            line.textContent ?? "line"
          } offset ${offset}`,
        ];
      })
    );
    return {
      scales: svgs.map((svg) =>
        svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
      ),
      misalignedLines,
      documentOverflow: document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

Deno.test("React Diagram browser geometry holds across themes and viewports", async () => {
  const output = await Deno.makeTempDir({ prefix: "diagram-browser-" });
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["diagram", "data-figure"],
      theme: "discern",
    });
    const css = await Deno.readTextFile(join(output, "discern.css"));
    const markup = renderToStaticMarkup(
      <DataFigure
        title="Preserve detailed reference wording"
        visual={<Diagram spec={longFlow} />}
        caption="Complete wording remains inside the responsive figure."
        source="Illustrative specification"
      />,
    );
    const palette = new Map<string, DiagramBrowserInspection>();
    for (const width of [360, 980]) {
      for (const theme of ["light", "dark"] as const) {
        const page = await browser.newPage({
          colorScheme: theme,
          viewport: { width, height: 900 },
        });
        try {
          await page.setContent(
            `<style>html,body{margin:0;max-width:100%;overflow-x:visible}${css}</style><main data-discern-root data-discern-theme="${theme}">${markup}</main>`,
          );
          const inspection = await inspectBrowserDiagram(page);
          assert(
            inspection.documentOverflow <= 0,
            `${width}px page overflowed`,
          );
          assertEquals(inspection.viewBoxFailures, []);
          assertEquals(inspection.connectorDefects, []);
          assertNotEquals(inspection.nodeFill, inspection.textFill);
          assertNotEquals(inspection.nodeStroke, inspection.nodeFill);
          palette.set(`${width}-${theme}`, inspection);
        } finally {
          await page.close();
        }
      }
    }
    assertNotEquals(
      palette.get("980-light")?.canvasFill,
      palette.get("980-dark")?.canvasFill,
    );
    assertNotEquals(
      palette.get("980-light")?.textFill,
      palette.get("980-dark")?.textFill,
    );

    const comparisonPage = await browser.newPage({
      colorScheme: "light",
      viewport: { width: 820, height: 1_000 },
    });
    try {
      const comparisonMarkup = renderToStaticMarkup(
        <main data-discern-root data-discern-theme="light">
          <Diagram spec={fixtures[1]} />
          <Diagram spec={decisionFlow} />
          <Diagram spec={longFlow} />
        </main>,
      );
      await comparisonPage.setContent(
        `<style>html,body{margin:0}main{inline-size:642px}${css}</style>${comparisonMarkup}`,
      );
      const projection = await inspectDiagramProjection(comparisonPage);
      assertEquals(projection.documentOverflow, 0);
      assertEquals(projection.misalignedLines, []);
      for (const [index, scale] of projection.scales.entries()) {
        assert(
          Math.abs(scale - 1) <= 0.01,
          `Catalogue-width Diagram ${index} rendered at ${scale} instead of intrinsic scale`,
        );
      }
    } finally {
      await comparisonPage.close();
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("standalone adaptive SVG loads externally and keeps text inside its viewBox", async () => {
  const svg = renderDiagramSvg(decisionFlow, { theme: "adaptive" });
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const browser = await launchBrowser();
  const page = await browser.newPage({
    colorScheme: "light",
    viewport: { width: 420, height: 720 },
  });
  try {
    await page.setContent(
      `<style>html,body{margin:0}img{display:block;max-width:100%;height:auto}</style><img id="asset" src="${source}" alt="Reference flow">`,
    );
    await page.locator("#asset").waitFor({ state: "visible" });
    const image = await page.locator("#asset").evaluate((element) => {
      const asset = element as HTMLImageElement;
      return {
        complete: asset.complete,
        naturalWidth: asset.naturalWidth,
        naturalHeight: asset.naturalHeight,
        overflow: document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });
    assert(image.complete);
    assert(image.naturalWidth > 0 && image.naturalHeight > 0);
    assert(image.overflow <= 0);

    await page.setContent(svg);
    const light = await inspectBrowserDiagram(page);
    assertEquals(light.viewBoxFailures, []);
    assertEquals(light.connectorDefects, []);
    await page.emulateMedia({ colorScheme: "dark" });
    const dark = await inspectBrowserDiagram(page);
    assertEquals(dark.viewBoxFailures, []);
    assertEquals(dark.connectorDefects, []);
    assertNotEquals(light.canvasFill, dark.canvasFill);
    assertNotEquals(light.textFill, dark.textFill);
  } finally {
    await page.close();
    await browser.close();
  }
});
