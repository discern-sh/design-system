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
import { CompositionsNavigation } from "../catalogue/pages/compositions/navigation.tsx";
import {
  compositionGalleryItems,
  CompositionsPage,
} from "../catalogue/pages/compositions/page.tsx";
import {
  canonicalCompositionUrl,
  compositionNavigationItems,
  compositionRecipePath,
  compositionSearchRecords,
} from "../catalogue/routes/compositions.ts";
import { catalogueRoute, catalogueRoutePaths } from "../catalogue/routes.ts";
import { searchRecords } from "../catalogue/search/mod.ts";
import { renderDiagramSvg } from "../src/diagram/svg.ts";
import {
  markdownDiagramExampleSource,
  markdownDiagramExampleSpec,
} from "../src/diagram/markdown.example.ts";
import { catalogue } from "./support/catalogue.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

function futureRecipe(onRender: () => void = () => undefined) {
  return defineRecipe({
    id: "future-pattern",
    title: "Future pattern",
    description: "Help someone see one future outcome.",
    components: ["branch-choice"],
    definition: { message: "One structured definition" },
    render: ({ message }) => {
      onRender();
      return createElement("p", null, message);
    },
    source: ({ message }) =>
      `<BranchChoice title={${JSON.stringify(message)}} choices={[]} />`,
  });
}

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
  const recipe = futureRecipe();

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

Deno.test("every recipe auto-enrols in gallery, route, navigation, and search projections", () => {
  const recipes = [...compositionRecipes, futureRecipe()];
  assertEquals(
    compositionGalleryItems(recipes).map(({ id }) => id),
    recipes.map(({ id }) => id),
  );
  assertEquals(
    compositionNavigationItems(recipes).map(({ id }) => id),
    recipes.map(({ id }) => id),
  );
  assertEquals(
    compositionSearchRecords(recipes).slice(1).map(({ id }) => id),
    recipes.map(({ id }) => `composition:${id}`),
  );
  for (const recipe of recipes) {
    assertEquals(
      catalogueRoute(
        new URL(compositionRecipePath(recipe.id), "https://catalogue.example"),
      ),
      { family: "compositions", page: "detail", slug: recipe.id },
    );
  }

  const futureSearch = searchRecords(
    compositionSearchRecords([recipes.at(-1)!]),
    "branch choice",
  );
  assertEquals(futureSearch[0]?.record.context, "Illustrative pattern");
  assertEquals(
    futureSearch[0]?.record.href,
    compositionRecipePath("future-pattern"),
  );
});

Deno.test("the gallery stays light and a detail route mounts only its selected demonstration", () => {
  let renders = 0;
  const future = futureRecipe(() => renders += 1);
  const recipes = [...compositionRecipes, future];
  const indexHtml = renderToStaticMarkup(
    createElement(CompositionsPage, {
      recipes,
      currentUrl: new URL(
        catalogueRoutePaths.compositions,
        "https://catalogue.example",
      ),
    }),
  );
  assertEquals(renders, 0);
  assertEquals(
    (indexHtml.match(/data-discern-composition-card=/g) ?? []).length,
    recipes.length,
  );
  assertEquals(indexHtml.includes("View adaptable example source"), false);
  assertEquals(indexHtml.includes("One structured definition"), false);

  const detailHtml = renderToStaticMarkup(
    createElement(CompositionsPage, {
      recipes,
      currentUrl: new URL(
        compositionRecipePath(future.id),
        "https://catalogue.example",
      ),
    }),
  );
  assertEquals(renders, 1);
  assertStringIncludes(
    detailHtml,
    'data-discern-composition-detail="future-pattern"',
  );
  assertStringIncludes(detailHtml, "One structured definition");
  assertEquals((detailHtml.match(/<h1/g) ?? []).length, 1);
});

Deno.test("local navigation uses stable detail paths and current-pattern state", () => {
  const recipes = [...compositionRecipes, futureRecipe()];
  const current = recipes.at(-1)!;
  const html = renderToStaticMarkup(
    createElement(CompositionsNavigation, {
      route: {
        family: "compositions",
        page: "detail",
        slug: current.id,
      },
      url: new URL(
        compositionRecipePath(current.id),
        "https://catalogue.example",
      ),
      sortedComponents: [],
      onNavigate: () => undefined,
      recipes,
    }),
  );
  assertEquals(
    (html.match(/class="discern-catalogue-nav__child"/g) ?? []).length,
    recipes.length,
  );
  assertStringIncludes(
    html,
    `href="${compositionRecipePath(current.id)}" aria-current="page"`,
  );
});

Deno.test("former recipe fragments upgrade in place to stable detail routes", () => {
  const legacy = new URL(
    "https://catalogue.example/catalogue/compositions/?width=narrow#recipe-next-action",
  );
  assertEquals(
    canonicalCompositionUrl(legacy).href,
    "https://catalogue.example/catalogue/compositions/next-action/?width=narrow",
  );
});
