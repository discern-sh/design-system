import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cliCompositionRecipes } from "../catalogue/cli-compositions.ts";
import { TerminalLayoutRecipe } from "../catalogue/terminal-layout-inspector.tsx";

Deno.test("Catalogue terminal compositions form one source-backed inventory", () => {
  assertEquals(
    cliCompositionRecipes.map(({ id }) => id),
    [
      "operational-status",
      "failure-report",
      "command-reference",
      "guided-choice",
    ],
  );

  for (const recipe of cliCompositionRecipes) {
    assertStringIncludes(recipe.source, "composeCliBlocks");
    assertStringIncludes(recipe.source, "createCliPresenter");
    assertStringIncludes(recipe.source, "const output =");
  }
});

Deno.test("Catalogue terminal layout recipe starts with inspectable standard geometry", () => {
  const recipe = cliCompositionRecipes[0];
  if (recipe === undefined) throw new TypeError("missing terminal recipe");

  const html = renderToStaticMarkup(
    createElement(TerminalLayoutRecipe, { recipe, theme: "dark" }),
  );

  assertStringIncludes(
    html,
    'data-discern-cli-composition="operational-status"',
  );
  assertStringIncludes(
    html,
    'aria-label="Operational status terminal viewport"',
  );
  assertStringIncludes(html, "Compact</span><small>40 × 24");
  assertStringIncludes(html, "Standard</span><small>80 × 24");
  assertStringIncludes(html, "Wide</span><small>120 × 30");
  assertStringIncludes(html, "Show cell grid");
  assertStringIncludes(html, 'data-discern-terminal-columns="80"');
  assertStringIncludes(html, 'data-discern-terminal-rows="24"');
  assertStringIncludes(html, "Copy composition source");
});

Deno.test("Catalogue terminal layouts render content and inspector chrome in the resolved theme", () => {
  const recipe = cliCompositionRecipes[0];
  if (recipe === undefined) throw new TypeError("missing terminal recipe");

  const light = renderToStaticMarkup(
    createElement(TerminalLayoutRecipe, { recipe, theme: "light" }),
  );
  const dark = renderToStaticMarkup(
    createElement(TerminalLayoutRecipe, { recipe, theme: "dark" }),
  );

  assertNotEquals(light, dark);
  assertStringIncludes(light, 'data-discern-terminal-ruler="labels"');
  assertStringIncludes(light, 'data-discern-terminal-ruler="ticks"');
});
