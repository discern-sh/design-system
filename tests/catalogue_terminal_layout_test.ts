import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stripAnsi } from "../src/cli/ansi.ts";
import {
  type CliCompositionRecipe,
  cliCompositionRecipes,
} from "../catalogue/cli-compositions.ts";
import { registry } from "../catalogue/generated/registry.ts";
import { TerminalRecipeNavigation } from "../catalogue/pages/terminal/navigation.tsx";
import {
  TerminalDetailPage,
  TerminalIndexPage,
  terminalRecipeNeighbors,
} from "../catalogue/pages/terminal/page.tsx";
import {
  catalogueRoute,
  catalogueTerminalLayoutPath,
} from "../catalogue/routes.ts";
import { terminalSearchRecords } from "../catalogue/routes/terminal.ts";
import { searchRecords } from "../catalogue/search/mod.ts";
import { projectTerminalLayoutRecipe } from "../catalogue/terminal-layout-inspector.tsx";
import { parseTerminalLabState } from "../catalogue/terminal-lab-state.ts";
import { resolveCatalogueTerminalPresentation } from "../catalogue/terminal-theme.ts";

const fieldLight = resolveCatalogueTerminalPresentation("light", undefined);
const fieldDark = resolveCatalogueTerminalPresentation("dark", undefined);

const futureRecipe: CliCompositionRecipe = {
  id: "future-signal-lab",
  title: "Future signal lab",
  description: "Correlates an unrelated future signal with a review frame.",
  components: ["section"],
  capabilityControls: ["unicode", "colorDepth"],
  source: [
    'import { renderSection } from "@discern-sh/design-system/cli";',
    'const output = renderSection({ title: "Signal" }, capabilities);',
  ].join("\n"),
  render: (capabilities, presentation = fieldDark, rows) =>
    `${presentation.theme}:${capabilities.columns}:${rows}:${
      capabilities.unicode ? "✓" : "ok"
    }`,
};

Deno.test("Catalogue terminal compositions form one source-backed inventory", () => {
  assertEquals(
    cliCompositionRecipes.map(({ id }) => id),
    [
      "operational-status",
      "failure-report",
      "command-reference",
      "guided-choice",
      "markdown-browser",
    ],
  );

  const componentSlugs = new Set(registry.map(({ meta }) => meta.slug));
  for (const recipe of cliCompositionRecipes) {
    if (recipe.id === "markdown-browser") {
      assertStringIncludes(recipe.source, "renderMarkdownBrowser");
      assertStringIncludes(recipe.source, "/cli/interactive");
    } else {
      assertStringIncludes(recipe.source, "composeCliBlocks");
      assertStringIncludes(recipe.source, "createCliPresenter");
    }
    assertStringIncludes(recipe.source, "const output =");
    for (const slug of recipe.components) {
      assert(componentSlugs.has(slug), `${recipe.id} names unknown ${slug}`);
    }
  }
});

Deno.test("Terminal index remains light and detail renders one focused URL-backed lab", () => {
  const index = renderToStaticMarkup(createElement(TerminalIndexPage));
  assertEquals(
    index.match(/data-discern-terminal-index-card=/g)?.length,
    cliCompositionRecipes.length,
  );
  assertEquals(index.includes("data-discern-terminal-inspector"), false);
  assertStringIncludes(index, "Inspect layout");
  assertStringIncludes(
    index,
    catalogueTerminalLayoutPath("operational-status"),
  );
  assertStringIncludes(index, "/catalogue/components/docs-header/");

  const recipe = cliCompositionRecipes[0];
  if (recipe === undefined) throw new TypeError("missing terminal recipe");
  const currentUrl = new URL(
    `${
      catalogueTerminalLayoutPath(recipe.id)
    }?preset=wide&columns=96&rows=31&unicode=0&color=ansi16&grid=1`,
    "https://catalogue.example",
  );
  const detail = renderToStaticMarkup(createElement(TerminalDetailPage, {
    recipe,
    recipes: cliCompositionRecipes,
    terminalPresentation: fieldDark,
    currentUrl,
  }));

  assertEquals(detail.match(/data-discern-cli-composition=/g)?.length, 1);
  assertStringIncludes(detail, 'data-discern-terminal-columns="96"');
  assertStringIncludes(detail, 'data-discern-terminal-rows="31"');
  assertStringIncludes(detail, "Custom");
  assertStringIncludes(detail, "Copy raw terminal output");
  assertStringIncludes(detail, "Copy adaptable composition source");
  assertStringIncludes(detail, "Copy reproducible lab URL");
  assertStringIncludes(detail, "data-discern-overflow-cue");
  assertStringIncludes(detail, "data-discern-overflow-cue-target");
  assertStringIncludes(detail, "Adaptable composition source");
  assertEquals(
    detail.includes('discern-catalogue-terminal-lab__source" open'),
    false,
  );
});

Deno.test("validated capabilities feed the real renderer and inspector authorities", () => {
  const recipe = cliCompositionRecipes[0];
  if (recipe === undefined) throw new TypeError("missing terminal recipe");
  const { state } = parseTerminalLabState(
    new URLSearchParams(
      "preset=tall&columns=91&rows=37&unicode=0&color=ansi256&grid=1",
    ),
    recipe.capabilityControls,
  );
  const projection = projectTerminalLayoutRecipe(recipe, state, fieldLight);

  assertEquals(projection.capabilities.columns, 91);
  assertEquals(projection.capabilities.unicode, false);
  assertEquals(projection.capabilities.colorDepth, "ansi256");
  assertEquals(
    projection.output,
    recipe.render(projection.capabilities, fieldLight, 37),
  );
  assertNotEquals(projection.output, recipe.source);
  assertStringIncludes(
    projection.inspectorHtml,
    'data-discern-terminal-columns="91"',
  );
  assertStringIncludes(
    projection.inspectorHtml,
    'data-discern-terminal-rows="37"',
  );
  assertStringIncludes(projection.inspectorHtml, "repeating-linear-gradient");
});

Deno.test("guided choice independently demonstrates the contextual menu contract", () => {
  const recipe = cliCompositionRecipes.find(({ id }) => id === "guided-choice");
  if (recipe === undefined) throw new TypeError("missing guided-choice recipe");
  const { state } = parseTerminalLabState(
    new URLSearchParams("preset=standard"),
    recipe.capabilityControls,
  );
  const output = stripAnsi(
    projectTerminalLayoutRecipe(recipe, state, fieldDark).output,
  );

  assertStringIncludes(recipe.source, 'presentation: "menu"');
  assertStringIncludes(output, "› × Local artifact");
  assertStringIncludes(output, "Channels that require deliberate");
  assertStringIncludes(output, "Unavailable until a local artifact");
  assertEquals(output.includes("[●]"), false);
  assertEquals(output.includes("(disabled)"), false);
  const localRow = output.split("\n").find((line) =>
    line.includes("Local artifact")
  );
  assert(localRow !== undefined);
  assertEquals(localRow.includes("Unavailable until"), false);
});

Deno.test("theme changes re-project the same recipe and inspector consistently", () => {
  const recipe = cliCompositionRecipes[0];
  if (recipe === undefined) throw new TypeError("missing terminal recipe");
  const { state } = parseTerminalLabState(
    new URLSearchParams("preset=standard"),
    recipe.capabilityControls,
  );
  const light = projectTerminalLayoutRecipe(recipe, state, fieldLight);
  const dark = projectTerminalLayoutRecipe(recipe, state, fieldDark);

  assertNotEquals(light.output, dark.output);
  assertNotEquals(light.inspectorHtml, dark.inspectorHtml);
  assertStringIncludes(
    light.inspectorHtml,
    'data-discern-terminal-theme="light"',
  );
  assertStringIncludes(
    dark.inspectorHtml,
    'data-discern-terminal-theme="dark"',
  );
});

Deno.test("a future recipe auto-enrols across routes, pages, search, order, and rendering", () => {
  const recipes = [...cliCompositionRecipes, futureRecipe];
  const path = catalogueTerminalLayoutPath(futureRecipe.id);
  assertEquals(
    catalogueRoute(new URL(path, "https://catalogue.example")),
    { family: "terminal", page: "detail", recipeId: futureRecipe.id },
  );

  const index = renderToStaticMarkup(
    createElement(TerminalIndexPage, { recipes }),
  );
  const navigation = renderToStaticMarkup(
    createElement(TerminalRecipeNavigation, {
      recipes,
      activeRecipeId: futureRecipe.id,
      onNavigate: () => undefined,
    }),
  );
  assertStringIncludes(index, futureRecipe.title);
  assertStringIncludes(index, path);
  assertStringIncludes(navigation, futureRecipe.title);
  assertStringIncludes(navigation, 'aria-current="location"');

  const neighbors = terminalRecipeNeighbors(recipes, futureRecipe.id);
  assertEquals(neighbors.previous?.id, "markdown-browser");
  assertEquals(neighbors.next, undefined);

  const records = terminalSearchRecords(recipes);
  const [result] = searchRecords(records, "unrelated signal");
  assertEquals(result?.record.id, `terminal-layout:${futureRecipe.id}`);
  assertEquals(result?.reasons.map(({ field }) => field), [
    "description",
    "title",
  ]);

  const { state } = parseTerminalLabState(
    new URLSearchParams("preset=compact&unicode=1&color=truecolor"),
    futureRecipe.capabilityControls,
  );
  const projection = projectTerminalLayoutRecipe(
    futureRecipe,
    state,
    fieldDark,
  );
  assertEquals(projection.output, "dark:40:24:✓");
  assertStringIncludes(projection.inspectorHtml, "Future signal lab");
});
