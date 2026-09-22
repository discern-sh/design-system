import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDesignSystem } from "../scripts/build.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";
import { designTokens } from "../src/tokens/tokens.ts";

const PAGE_WIDTH_TOKENS = ["--discern-page-max", "--discern-page-max-wide"];

interface BuiltBuilderModules {
  readonly core: typeof import("../catalogue/builder/registry-core.ts");
  readonly render: typeof import("../catalogue/builder/render.tsx");
}

let builtModules: Promise<BuiltBuilderModules> | undefined;

function builderModules(): Promise<BuiltBuilderModules> {
  builtModules ??= (async () => {
    await buildDesignSystem();
    const [core, render] = await Promise.all([
      import("../catalogue/builder/registry-core.ts"),
      import("../catalogue/builder/render.tsx"),
    ]);
    return { core, render };
  })();
  return builtModules;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

Deno.test("no component stylesheet restates a page-width token as a literal", () => {
  const literals = designTokens
    .filter(({ name }) => PAGE_WIDTH_TOKENS.includes(name))
    .map(({ value }) => value);
  assertEquals(literals.length, PAGE_WIDTH_TOKENS.length);
  for (const { meta, css } of componentRegistry) {
    for (const literal of literals) {
      assert(
        !new RegExp(`(?<![\\d.])${escapeRegExp(literal)}`).test(css),
        `${meta.slug} writes ${literal} instead of its page-width token`,
      );
    }
  }
});

Deno.test("every Marketing block framed at the page measure offers the campaign frame", async () => {
  const { core, render } = await builderModules();
  const framed = componentRegistry.filter(({ meta, css }) =>
    meta.group === "Marketing" && css.includes("var(--discern-page-max)")
  );
  assert(framed.length > 0, "no Marketing block frames its own content");
  for (const { meta, css } of framed) {
    const wideRule = new RegExp(
      `\\.discern-${meta.slug}--frame-wide \\{[^}]*var\\(--discern-page-max-wide\\)`,
    );
    assert(wideRule.test(css), `${meta.slug} has no wide frame rule`);

    const entry = core.registryCoreBySlug.get(meta.slug);
    assert(entry !== undefined, `${meta.slug} is missing from the Builder`);
    const control = entry.controls.find(({ name }) => name === "frame");
    assert(
      control?.control === "select" &&
        ["standard", "wide"].every((value) => control.options.includes(value)),
      `${meta.slug} offers no standard and wide frame control`,
    );

    const node = core.instantiateComponent(meta.slug);
    const markup = renderToStaticMarkup(
      <>
        {render.renderBuilderChild({
          ...node,
          props: { ...node.props, frame: { kind: "string", value: "wide" } },
        })}
      </>,
    );
    assertStringIncludes(markup, `discern-${meta.slug}--frame-wide`);
  }
});
