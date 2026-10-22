import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDesignSystem } from "../scripts/build.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";
import { designTokens } from "../src/tokens/tokens.ts";
import { appearanceColorRoleLaws } from "../src/tokens/appearance.ts";
import {
  cssDeclarations,
  cssQualifiedRuleBlocks,
} from "../scripts/css-syntax.ts";

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

function composesSection(dependencies: readonly string[]): boolean {
  return dependencies.includes("marketing-section");
}

Deno.test("every Marketing frame control reaches the frame that lays the block out", async () => {
  const { core, render } = await builderModules();
  const framed = componentRegistry.filter(({ meta }) =>
    meta.group === "Marketing" &&
    core.registryCoreBySlug.get(meta.slug)?.controls.some(({ name }) =>
      name === "frame"
    )
  );
  assert(
    framed.some(({ dependencies }) => composesSection(dependencies)),
    "no framed Marketing block composes Marketing section",
  );
  for (const { meta, css, dependencies } of framed) {
    const node = core.instantiateComponent(meta.slug);
    const markup = renderToStaticMarkup(
      <>
        {render.renderBuilderChild({
          ...node,
          props: { ...node.props, frame: { kind: "string", value: "wide" } },
        })}
      </>,
    );
    const ownFrame = css.includes("var(--discern-page-max-wide)");
    if (ownFrame) {
      assertStringIncludes(markup, `discern-${meta.slug}--frame-wide`);
    } else {
      assert(
        composesSection(dependencies),
        `${meta.slug} offers a frame without laying itself out against one`,
      );
      assertStringIncludes(markup, "discern-marketing-section--frame-wide");
    }
  }
});

function uppercaseOrDashedRules(css: string): readonly string[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) =>
      /text-transform\s*:\s*uppercase/.test(body ?? "") ||
      /\bdashed\b/.test(body ?? "") ||
      /font-weight\s*:\s*\d/.test(body ?? "")
    )
    .map(([, selector]) => (selector ?? "").trim());
}

Deno.test("Marketing stylesheets leave uppercase to Kicker, dashed edges to declared states, and weights to Tokens", () => {
  assertEquals(
    uppercaseOrDashedRules(
      ".discern-fresh-eyebrow { letter-spacing: 0.1em; text-transform: uppercase; } .discern-fresh-rule { border-top: 1px dashed red; } .discern-fresh-title { font-weight: 650; }",
    ),
    [".discern-fresh-eyebrow", ".discern-fresh-rule", ".discern-fresh-title"],
    "the fresh hand-rolled fixture escaped the detector",
  );
  const marketing = componentRegistry.filter(({ meta }) =>
    meta.group === "Marketing"
  );
  assert(marketing.length > 0);
  assertEquals(
    marketing.flatMap(({ meta, css }) =>
      uppercaseOrDashedRules(css).map((selector) => `${meta.slug}::${selector}`)
    ),
    [],
    "a Marketing block hand-rolls an uppercase label, a dashed ornament, or a numeric weight",
  );
});

/** Roles of the scope's ladders that a page theme would otherwise leak inside it. */
const CONTRAST_LADDER =
  /^--discern-color-(?:accent-(?:\d+|ink)|ink(?:-muted|-faint)?|canvas|surface(?:-sunken)?|border(?:-strong)?|neutral-edge|action(?:-edge|-shadow)?|on-action|(?:success|warning|danger)-(?:soft|deep))$/u;

function contrastLadderGaps(css: string): readonly string[] {
  const scope = cssQualifiedRuleBlocks(css).rules.find(({ selector }) =>
    selector.trim() === ".discern-marketing-contrast"
  );
  if (scope === undefined) return ["the contrast scope rule"];
  const declared = new Map(
    cssDeclarations(scope.block).map(({ name, value }) => [name, value]),
  );
  return appearanceColorRoleLaws
    .map(({ name }) => name)
    .filter((name) => CONTRAST_LADDER.test(name))
    .filter((name) => {
      const value = declared.get(name);
      if (value === undefined) return true;
      const references = [...value.matchAll(/var\(\s*(--[-a-z0-9]+)/gu)]
        .map((match) => match[1]);
      // A soft or deep tone keeps its own hue, which the scope leaves alone.
      const hue = /^--discern-color-(success|warning|danger)-/u.exec(name)?.[1];
      const stable = references.length > 0 &&
        references.every((reference) =>
          /^--discern-color-inverse-(?:ink|surface)$/u.test(reference ?? "") ||
          (hue !== undefined && reference === `--discern-color-${hue}` &&
            !declared.has(reference)) ||
          (reference !== name && declared.has(reference ?? ""))
        );
      const opaqueWash =
        !/^--discern-color-(?:accent-[1-3]00|surface-sunken|(?:success|warning|danger)-soft)$/u
          .test(name) || !/\btransparent\b/u.test(value);
      return !(stable && opaqueWash);
    });
}

Deno.test("the Marketing contrast scope remaps every ladder role from the stable inverse pigments", () => {
  assertEquals(
    contrastLadderGaps(
      `.discern-marketing-contrast {
        --discern-color-accent-100: color-mix(in oklab, var(--discern-color-inverse-ink) 8%, transparent);
        --discern-color-accent-200: var(--discern-color-accent-200);
        --discern-color-success-soft: color-mix(in oklab, var(--discern-color-success) 8%, transparent);
      }`,
    ).filter((name) => /accent-[12]00$|-(?:soft|deep)$/u.test(name)),
    [
      "--discern-color-accent-100",
      "--discern-color-accent-200",
      "--discern-color-success-soft",
      "--discern-color-success-deep",
      "--discern-color-warning-soft",
      "--discern-color-warning-deep",
      "--discern-color-danger-soft",
    ],
    "the translucent, self-referencing and missing-tone fixture escaped the detector",
  );
  const section = componentRegistry.find(({ meta }) =>
    meta.slug === "marketing-section"
  );
  assert(section, "Marketing section is absent from the registry");
  assertEquals(
    contrastLadderGaps(section.css),
    [],
    "a ladder role keeps its page value inside the contrast scope",
  );
});

/** The declarations that make one hanging opening quote mark a family. */
const QUOTE_MARK_RECIPE = ["color", "font-size", "line-height"] as const;

function quoteMarkRecipe(
  css: string,
  selector: string,
): Readonly<Record<string, string | undefined>> {
  const rule = cssQualifiedRuleBlocks(css).rules.find((candidate) =>
    candidate.selector.trim() === selector
  );
  const declared = new Map(
    cssDeclarations(rule?.block ?? "").map(({ name, value }) => [name, value]),
  );
  return Object.fromEntries(
    QUOTE_MARK_RECIPE.map((name) => [name, declared.get(name)]),
  );
}

Deno.test("Testimonial and Voice break hang Pull quote's opening mark", () => {
  const css = (slug: string) => {
    const entry = componentRegistry.find(({ meta }) => meta.slug === slug);
    assert(entry, `${slug} is absent from the registry`);
    return entry.css;
  };
  const reference = quoteMarkRecipe(
    css("pull-quote"),
    ".discern-pull-quote__mark",
  );
  assert(
    QUOTE_MARK_RECIPE.every((name) => reference[name] !== undefined),
    "Pull quote no longer states the hanging mark recipe",
  );
  for (
    const [slug, selector] of [
      ["testimonial", ".discern-testimonial__mark"],
      ["voice-break", ".discern-voice-break__mark"],
    ] as const
  ) {
    assertEquals(
      quoteMarkRecipe(css(slug), selector),
      reference,
      `${slug} draws its own opening mark`,
    );
    assert(
      !/opacity/u.test(
        cssQualifiedRuleBlocks(css(slug)).rules.find((rule) =>
          rule.selector.trim() === selector
        )?.block ?? "",
      ),
      `${slug} fades its mark with opacity, so its ink depends on the ground`,
    );
  }
});
