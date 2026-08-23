import {
  assert,
  assertEquals,
  assertMatch,
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
  DIAGRAM_NODE_STYLE_BUNDLES,
  DIAGRAM_PAINT_TOKEN_NAMES,
} from "../../src/diagram/roles.ts";
import { baseTokens } from "../../src/tokens/tokens.ts";
import fixtures from "../../src/diagram/kinds/flow/flow.fixtures.ts";

const compact = fixtures[1];

// @ts-expect-error Diagram deliberately rejects accessibility-contract overrides.
const unsafeProps: DiagramProps = { spec: compact, role: "presentation" };
void unsafeProps;

Deno.test("React Diagram maps the conformant scene to named semantic SVG", () => {
  const html = renderToStaticMarkup(<Diagram spec={compact} />);
  assertStringIncludes(html, '<svg class="discern-diagram"');
  assertStringIncludes(html, 'data-discern-diagram-kind="flow"');
  assertStringIncludes(html, 'role="img"');
  assertStringIncludes(
    html,
    'aria-label="Publish reference material: Authoring, checking, and publication progress from left to right."',
  );
  assertMatch(html, /aria-describedby="discern-diagram-[^"]+-description"/u);
  assertStringIncludes(html, "<title>Publish reference material</title>");
  assertStringIncludes(html, "<desc id=");
  assertStringIncludes(html, "Relationships:");
  assertStringIncludes(html, "<polyline");
  assertStringIncludes(html, "discern-diagram__arrowhead--primary");
  assertStringIncludes(html, '<text class="discern-diagram__text');
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

Deno.test("React Diagram descriptions remain collision-free across instances", () => {
  const html = renderToStaticMarkup(
    <Fragment>
      <Diagram spec={compact} />
      <Diagram spec={compact} />
    </Fragment>,
  );
  const references = [...html.matchAll(/aria-describedby="([^"]+)"/gu)].map(
    (match) => match[1],
  );
  const identities = [...html.matchAll(/<desc id="([^"]+)"/gu)].map(
    (match) => match[1],
  );
  assertEquals(references.length, 2);
  assertEquals(new Set(references).size, 2);
  assertEquals(identities, references);
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
  const tokenNames = new Set(baseTokens.map(({ name }) => name));
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
  }

  const registered = componentRegistry.find(({ meta }) =>
    meta.slug === "diagram"
  );
  assert(registered !== undefined);
  assertEquals(registered.dependencies, []);
  assertStringIncludes(registered.css, ".discern-diagram__canvas");
  assertStringIncludes(registered.css, "--discern-diagram-connector-return");
});
