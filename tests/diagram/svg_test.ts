import {
  assert,
  assertEquals,
  assertMatch,
  assertNotMatch,
  assertThrows,
} from "@std/assert";
import {
  renderDiagramSvg,
  type RenderDiagramSvgOptions,
} from "../../src/diagram/mod.ts";
import fixtures from "../../src/diagram/kinds/flow/flow.fixtures.ts";
import architectureFixtures from "../../src/diagram/kinds/architecture/architecture.fixtures.ts";
import sequenceFixtures from "../../src/diagram/kinds/sequence/sequence.fixtures.ts";
import { resolveDiagramPalette } from "../../src/diagram/palette.ts";
import {
  DIAGRAM_CONNECTOR_STYLE_BUNDLES,
  DIAGRAM_GUIDE_STYLE_BUNDLES,
  DIAGRAM_LINE_TREATMENTS,
  DIAGRAM_NODE_STYLE_BUNDLES,
  DIAGRAM_REGION_STYLE_BUNDLES,
} from "../../src/diagram/roles.ts";
import { diagramKindRegistry } from "../../src/generated/diagram-registry.ts";
import { compactFlowLightSvg } from "./snapshots.ts";

const compact = fixtures[1];
if (compact === undefined) throw new TypeError("Missing compact flow fixture");
const architecture = architectureFixtures[0];
const sequence = sequenceFixtures[0];

Deno.test("standalone SVG bytes match the canonical light snapshot", () => {
  assertEquals(
    renderDiagramSvg(compact, { theme: "light" }),
    compactFlowLightSvg,
  );
});

Deno.test("standalone SVG is deterministic, finite, and canonically ordered", () => {
  const first = renderDiagramSvg(compact);
  for (let run = 0; run < 10; run += 1) {
    assertEquals(renderDiagramSvg(compact), first);
  }
  assertMatch(
    first,
    /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="discern-diagram discern-diagram--standalone" viewBox="[^"]+" width="[^"]+" height="[^"]+" role="img" aria-label="[^"]+">/u,
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
  const canvas = first.indexOf('<rect class="discern-diagram__canvas"');
  assert(
    0 < title && title < description && description < style && style < canvas,
  );
  assert(first.endsWith("</svg>\n"));
});

Deno.test("standalone SVG escapes semantic text and admits no active or external content", () => {
  const hostile = {
    ...compact,
    title: "<script data-x=\"one\">Title & 'copy'</script>",
    summary: 'Summary <image href="https://example.invalid/x">',
    nodes: compact.nodes.map((node, index) =>
      index === 0 ? { ...node, label: "Author <foreignObject> & finish" } : node
    ),
  };
  const svg = renderDiagramSvg(hostile, { theme: "dark" });

  assert(svg.includes("&lt;script data-x=&quot;one&quot;&gt;"));
  assert(svg.includes("&apos;copy&apos;"));
  assert(svg.includes("Author &lt;foreignObject&gt; &amp; finish"));
  assertNotMatch(svg, /<(?:script|foreignObject|image|a|use|iframe)\b/iu);
  assertNotMatch(svg, /\s(?:href|xlink:href|on[a-z]+)=["']/iu);
  assertNotMatch(svg, /url\s*\(/iu);
  assertNotMatch(svg, /context-stroke/iu);
  assertNotMatch(svg, /<marker\b/iu);
  assertMatch(svg, /<polygon class="discern-diagram__arrowhead/u);
  assertMatch(svg, /<text\b[^>]* text-anchor="middle">/u);
});

Deno.test("every generated release asset is intrinsic, namespaced, and standalone-safe", () => {
  for (const entry of diagramKindRegistry) {
    for (const releaseCase of entry.releaseCorpus.cases) {
      for (const theme of ["light", "dark", "adaptive"] as const) {
        const context = `${entry.meta.slug}/${releaseCase.name}/${theme}`;
        const svg = renderDiagramSvg(releaseCase.spec, { theme });
        assertEquals(
          renderDiagramSvg(structuredClone(releaseCase.spec), { theme }),
          svg,
          context,
        );
        assertNotMatch(
          svg,
          /<(?:script|foreignObject|image|a|use|iframe|audio|video)\b/iu,
        );
        assertNotMatch(svg, /\s(?:href|xlink:href|on[a-z]+)=/iu);
        const structuralMarkup = svg.replaceAll(
          /<(title|desc|tspan)\b[^>]*>[\s\S]*?<\/\1>/gu,
          "",
        );
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
          const baseCanvas = svg.indexOf(".discern-diagram__canvas");
          assert(baseCanvas >= 0 && media > baseCanvas, context);
        } else {
          assertNotMatch(svg, /prefers-color-scheme/u);
        }
      }
    }
  }
});

Deno.test("accessibility context is present without visible canvas headings", () => {
  const svg = renderDiagramSvg(compact);
  assert(svg.includes('role="img"'));
  assert(svg.includes(
    'aria-label="Publish reference material: Authoring, checking, and publication progress from left to right."',
  ));
  assert(svg.includes("<title>Publish reference material</title>"));
  assert(svg.includes(
    "<desc>Title: Publish reference material&#10;Summary: Authoring, checking, and publication progress from left to right.",
  ));
  const visibleText = [...svg.matchAll(/<tspan\b[^>]*>(.*?)<\/tspan>/gu)]
    .map((match) => match[1]);
  assert(!visibleText.includes("Publish reference material"));
  assert(!visibleText.some((line) => line?.startsWith("Authoring, checking")));
});

Deno.test("standalone palettes resolve paired semantic roles as literal styles", () => {
  for (const variant of ["light", "dark"] as const) {
    const palette = resolveDiagramPalette(variant);
    const svg = renderDiagramSvg(compact, { theme: variant });
    assertNotMatch(svg, /var\(--discern-/u);
    for (const [role, bundle] of Object.entries(DIAGRAM_NODE_STYLE_BUNDLES)) {
      assert(svg.includes(
        `.discern-diagram__node--${role} { fill: ${
          palette[bundle.surface]
        }; stroke: ${palette[bundle.border]}; }`,
      ));
    }
    for (
      const [role, bundle] of Object.entries(DIAGRAM_CONNECTOR_STYLE_BUNDLES)
    ) {
      assert(svg.includes(
        `.discern-diagram__connector--${role} { stroke: ${
          palette[bundle.stroke]
        };`,
      ));
      assert(svg.includes(
        `.discern-diagram__arrowhead--${role} { fill: ${
          palette[bundle.marker]
        }; }`,
      ));
      const dash = DIAGRAM_LINE_TREATMENTS[bundle.treatment];
      if (dash !== "") assert(svg.includes(`stroke-dasharray: ${dash}`));
    }
    const region = DIAGRAM_REGION_STYLE_BUNDLES.boundary;
    const regionSvg = renderDiagramSvg(architecture, { theme: variant });
    assert(regionSvg.includes(`fill: ${palette[region.surface]}`));
    assert(regionSvg.includes(`stroke: ${palette[region.border]}`));
    assert(regionSvg.includes(
      `stroke-dasharray: ${DIAGRAM_LINE_TREATMENTS[region.treatment]}`,
    ));
    const guideSvg = renderDiagramSvg(sequence, { theme: variant });
    for (const bundle of Object.values(DIAGRAM_GUIDE_STYLE_BUNDLES)) {
      assert(guideSvg.includes(`stroke: ${palette[bundle.stroke]}`));
      const dash = DIAGRAM_LINE_TREATMENTS[bundle.treatment];
      if (dash !== "") assert(guideSvg.includes(`stroke-dasharray: ${dash}`));
    }
  }
  const adaptive = renderDiagramSvg(compact, { theme: "adaptive" });
  assert(adaptive.includes("@media (prefers-color-scheme: dark)"));
  assert(
    adaptive.indexOf(resolveDiagramPalette("light").canvas) <
      adaptive.indexOf("@media (prefers-color-scheme: dark)"),
  );
  assert(adaptive.includes(resolveDiagramPalette("dark").canvas));

  assertThrows(
    () =>
      renderDiagramSvg(compact, {
        theme: "automatic",
      } as unknown as RenderDiagramSvgOptions),
    TypeError,
    "light, dark, or adaptive",
  );
});
