import {
  assert,
  assertEquals,
  assertNotMatch,
  assertStringIncludes,
} from "@std/assert";
import { Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataFigure, Diagram, type DiagramProps } from "../../src/react.ts";
import { componentRegistry } from "../../src/generated/component-registry.ts";
import type { FlowDiagramSpec } from "../../src/diagram/mod.ts";
import {
  DIAGRAM_CONNECTOR_STYLE_BUNDLES,
  DIAGRAM_GUIDE_STYLE_BUNDLES,
  DIAGRAM_LINE_TREATMENTS,
  DIAGRAM_NODE_STYLE_BUNDLES,
  DIAGRAM_PAINT_TOKEN_NAMES,
  DIAGRAM_REGION_STYLE_BUNDLES,
} from "../../src/diagram/roles.ts";
import { baseTokens, themeTokens } from "../../src/tokens/tokens.ts";
import fixtures from "../../src/diagram/kinds/flow/flow.fixtures.ts";

const compact = fixtures[1];

const rejectsAccessibilityRole: "role" extends keyof DiagramProps ? false
  : true = true;
void rejectsAccessibilityRole;

Deno.test("React Diagram maps the conformant scene to named semantic SVG", () => {
  const html = renderToStaticMarkup(<Diagram spec={compact} />);
  assertStringIncludes(html, '<svg class="discern-diagram"');
  assertStringIncludes(html, 'data-discern-diagram-kind="flow"');
  assertStringIncludes(html, 'role="img"');
  assertStringIncludes(
    html,
    'aria-label="Publish reference material: Authoring, checking, and publication progress from left to right."',
  );
  assertStringIncludes(html, "aria-description=");
  assertNotMatch(html, /aria-describedby=/u);
  assertStringIncludes(html, "<title>Publish reference material</title>");
  assertStringIncludes(html, "<desc>");
  assertStringIncludes(html, "Relationships:");
  assertStringIncludes(html, "<polyline");
  assertStringIncludes(html, "discern-diagram__arrowhead--primary");
  assertStringIncludes(html, '<text class="discern-diagram__text');
  assertStringIncludes(html, 'text-anchor="middle"');
  assertNotMatch(html, /dangerouslySetInnerHTML/iu);
});

Deno.test("React Diagram escapes authored text instead of injecting markup", () => {
  const hostile = {
    ...compact,
    title: "<script>Reference & review</script>",
    summary: "A <foreignObject> must remain text.",
    nodes: compact.nodes.map((node, index) =>
      index === 0 ? { ...node, label: "<image onload='run'>" } : node
    ),
  } satisfies FlowDiagramSpec;
  const html = renderToStaticMarkup(<Diagram spec={hostile} />);
  assertStringIncludes(
    html,
    "&lt;script&gt;Reference &amp; review&lt;/script&gt;",
  );
  assertStringIncludes(html, "&lt;image onload=&#x27;run&#x27;&gt;");
  assertNotMatch(html, /<(?:script|foreignObject|image)\b/iu);
  assertNotMatch(html, /\sonload=["']/iu);
});

Deno.test("React Diagram descriptions remain collision-free across roots", () => {
  const together = renderToStaticMarkup(
    <Fragment>
      <Diagram spec={compact} />
      <Diagram spec={compact} />
    </Fragment>,
  );
  const separate = `${renderToStaticMarkup(<Diagram spec={compact} />)}${
    renderToStaticMarkup(<Diagram spec={compact} />)
  }`;
  for (const html of [together, separate]) {
    assertEquals((html.match(/aria-description=/gu) ?? []).length, 2);
    assertEquals((html.match(/<desc>/gu) ?? []).length, 2);
    assertNotMatch(html, /<desc\s+id=|aria-describedby=/u);
  }
});

Deno.test("Diagram composes as DataFigure visual without visible canvas prose", () => {
  const html = renderToStaticMarkup(
    <DataFigure
      title="Publish reference material"
      visual={<Diagram spec={compact} />}
      caption="A compact illustrative sequence."
      source="Example specification"
    />,
  );
  assertEquals((html.match(/<figure\b/gu) ?? []).length, 1);
  assertEquals((html.match(/<svg\b/gu) ?? []).length, 1);
  assertStringIncludes(html, "<h3>Publish reference material</h3>");
  const visibleLabels = [...html.matchAll(/<tspan\b[^>]*>(.*?)<\/tspan>/gu)]
    .map((match) => match[1]);
  assert(!visibleLabels.includes("Publish reference material"));
  assert(
    !visibleLabels.some((line) => line?.startsWith("Authoring, checking")),
  );
});

Deno.test("Diagram CSS resolves the paired role authority through public Tokens", async () => {
  const css = await Deno.readTextFile(
    new URL(
      "../../src/components/editorial/diagram/diagram.css",
      import.meta.url,
    ),
  );
  assertNotMatch(
    css,
    /(?<!max-)inline-size:\s*100%/u,
  );
  const tokenNames = new Set(
    [...baseTokens, ...themeTokens].map(({ name }) => name),
  );
  for (const tokenName of Object.values(DIAGRAM_PAINT_TOKEN_NAMES)) {
    assert(tokenNames.has(tokenName), `${tokenName} is not a public Token`);
    assertStringIncludes(css, `var(${tokenName})`);
  }
  for (const [role, bundle] of Object.entries(DIAGRAM_NODE_STYLE_BUNDLES)) {
    const block = css.match(
      new RegExp(`\\.discern-diagram__node--${role} \\{([^}]+)\\}`, "u"),
    )?.[1] ?? "";
    assertStringIncludes(
      block,
      `fill: var(${DIAGRAM_PAINT_TOKEN_NAMES[bundle.surface]})`,
    );
    assertStringIncludes(
      block,
      `stroke: var(${DIAGRAM_PAINT_TOKEN_NAMES[bundle.border]})`,
    );
  }
  for (
    const [role, bundle] of Object.entries(DIAGRAM_CONNECTOR_STYLE_BUNDLES)
  ) {
    const connector = css.match(
      new RegExp(
        `\\.discern-diagram__connector--${role} \\{([^}]+)\\}`,
        "u",
      ),
    )?.[1] ?? "";
    const marker = css.match(
      new RegExp(
        `\\.discern-diagram__arrowhead--${role} \\{([^}]+)\\}`,
        "u",
      ),
    )?.[1] ?? "";
    assertStringIncludes(
      connector,
      `stroke: var(${DIAGRAM_PAINT_TOKEN_NAMES[bundle.stroke]})`,
    );
    assertStringIncludes(
      marker,
      `fill: var(${DIAGRAM_PAINT_TOKEN_NAMES[bundle.marker]})`,
    );
    const dash = DIAGRAM_LINE_TREATMENTS[bundle.treatment];
    if (dash === "") assertNotMatch(connector, /stroke-dasharray/u);
    else assertStringIncludes(connector, `stroke-dasharray: ${dash}`);
  }
  const region = DIAGRAM_REGION_STYLE_BUNDLES.boundary;
  const regionBlock = css.match(
    /\.discern-diagram__region \{([^}]+)\}/u,
  )?.[1] ?? "";
  assertStringIncludes(
    regionBlock,
    `fill: var(${DIAGRAM_PAINT_TOKEN_NAMES[region.surface]})`,
  );
  assertStringIncludes(
    regionBlock,
    `stroke: var(${DIAGRAM_PAINT_TOKEN_NAMES[region.border]})`,
  );
  assertStringIncludes(
    regionBlock,
    `stroke-dasharray: ${DIAGRAM_LINE_TREATMENTS[region.treatment]}`,
  );
  for (const [style, bundle] of Object.entries(DIAGRAM_GUIDE_STYLE_BUNDLES)) {
    const selector = style === "solid"
      ? ".discern-diagram__guide {"
      : `.discern-diagram__guide--${style} {`;
    assertStringIncludes(css, selector);
    assertStringIncludes(
      css,
      `stroke: var(${DIAGRAM_PAINT_TOKEN_NAMES[bundle.stroke]})`,
    );
    const dash = DIAGRAM_LINE_TREATMENTS[bundle.treatment];
    if (dash !== "") assertStringIncludes(css, `stroke-dasharray: ${dash}`);
  }

  const registered = componentRegistry.find(({ meta }) =>
    meta.slug === "diagram"
  );
  assert(registered !== undefined);
  assertEquals(registered.dependencies, []);
  assertStringIncludes(registered.css, ".discern-diagram__canvas");
  assertStringIncludes(registered.css, "--discern-color-accent-700");
});
