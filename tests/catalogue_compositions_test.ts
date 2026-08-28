import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  compositionConstituents,
  compositionExampleImport,
  compositionRecipes,
  defineRecipe,
  illustrativePatternStatus,
} from "../catalogue/compositions.tsx";
import { renderDiagramSvg } from "../src/diagram/svg.ts";
import {
  markdownDiagramExampleSource,
  markdownDiagramExampleSpec,
} from "../src/diagram/markdown.example.ts";
import { catalogue } from "./support/catalogue.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

Deno.test("Catalogue writes its Markdown SVG preview from the typed spec", async () => {
  await catalogue();
  assertEquals(
    await Deno.readTextFile(
      join(PACKAGE_ROOT, markdownDiagramExampleSource.slice(1)),
    ),
    renderDiagramSvg(markdownDiagramExampleSpec, { theme: "adaptive" }),
  );
});

Deno.test("Composition status, membership, source, and order share the recipe authority", () => {
  assertEquals(
    compositionRecipes.map(({ id }) => id),
    [
      "documentation-task",
      "next-action",
      "failure-triage",
      "handoff-verification-report",
      "survey-artifacts",
      "reading-first-landing",
    ],
  );
  for (const recipe of compositionRecipes) {
    assertEquals(recipe.status, illustrativePatternStatus);
    assertEquals(
      compositionConstituents(recipe).map(({ slug }) => slug),
      recipe.components,
    );
    assertEquals(new Set(recipe.components).size, recipe.components.length);
    assertEquals(
      recipe.source.startsWith(`${compositionExampleImport(recipe)}\n\n`),
      true,
    );
    assertStringIncludes(recipe.source, "@discern-sh/design-system/react");
  }
});

Deno.test("defineRecipe projects one definition into its preview and adaptable source", () => {
  const recipe = defineRecipe({
    id: "future-pattern",
    title: "Future pattern",
    description: "Help someone see one future outcome.",
    components: ["branch-choice"],
    definition: { message: "One structured definition" },
    render: ({ message }) => createElement("p", null, message),
    source: ({ message }) =>
      `<BranchChoice title={${JSON.stringify(message)}} choices={[]} />`,
  });

  assertStringIncludes(
    renderToStaticMarkup(createElement(recipe.Example)),
    "One structured definition",
  );
  assertStringIncludes(recipe.source, 'title={"One structured definition"}');
  assertEquals(recipe.components, ["branch-choice"]);
  assertEquals(recipe.status.label, "Illustrative pattern");
});

Deno.test("defineRecipe refuses dead or duplicated Component membership", () => {
  const definition = {
    id: "invalid-pattern",
    title: "Invalid pattern",
    description: "Prove invalid membership cannot reach a page.",
    definition: null,
    render: () => null,
    source: () => "<div />",
  } as const;

  assertThrows(
    () => defineRecipe({ ...definition, components: ["invented-component"] }),
    TypeError,
    "unknown Component",
  );
  assertThrows(
    () => defineRecipe({ ...definition, components: ["button", "button"] }),
    TypeError,
    "repeats a Component",
  );
});
