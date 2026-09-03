import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type CliCompositionRecipe,
  cliCompositionRecipes,
} from "../catalogue/cli-compositions.ts";
import {
  compositionRecipes,
  defineRecipe,
} from "../catalogue/compositions.tsx";
import { registry } from "../catalogue/generated/registry.ts";
import {
  ComponentCollectionCard,
  ComponentResultCard,
} from "../catalogue/pages/components/directory-card.tsx";
import { componentDirectory } from "../catalogue/pages/components/collections.ts";
import { CompositionsPage } from "../catalogue/pages/compositions/page.tsx";
import { FoundationsPage } from "../catalogue/pages/foundations/page.tsx";
import { GlyphIndexPage } from "../catalogue/pages/glyphs/index-page.tsx";
import {
  overviewCatalogueDestinations,
  OverviewPage,
} from "../catalogue/pages/overview/page.tsx";
import { CatalogueIndexCard } from "../catalogue/pages/shared.tsx";
import { TerminalIndexPage } from "../catalogue/pages/terminal/page.tsx";
import { resolveCatalogueTerminalPresentation } from "../catalogue/terminal-theme.ts";
import {
  catalogueRoutePaths,
  catalogueTerminalLayoutPath,
} from "../catalogue/routes.ts";

import { compositionRecipePath } from "../catalogue/routes/compositions.ts";
import { foundationsPaths } from "../catalogue/routes/foundations.ts";
import { terminalFoundationSheets } from "../catalogue/terminal-foundations.ts";
import { glyphAtlasData } from "../src/glyphs/atlas.ts";

const fieldLight = resolveCatalogueTerminalPresentation("light", undefined);

function attributeCount(markup: string, attribute: string): number {
  return (markup.match(new RegExp(`${attribute}=`, "g")) ?? []).length;
}

function classTokenCount(markup: string, token: string): number {
  return [...markup.matchAll(/class="([^"]*)"/g)].filter((match) =>
    (match[1] ?? "").split(/\s+/).includes(token)
  ).length;
}

function assertSharedCards(
  markup: string,
  expected: number,
  variant: "visual" | "compact",
): void {
  assertEquals(
    (markup.match(
      new RegExp(
        `data-discern-catalogue-index-card="${variant}"`,
        "g",
      ),
    ) ?? []).length,
    expected,
  );
  assertEquals(
    attributeCount(markup, "data-discern-catalogue-index-card-primary"),
    expected,
  );
  assertEquals(
    classTokenCount(markup, "discern-card"),
    expected,
    "a route-index Card bypassed CatalogueIndexCard",
  );
}

Deno.test("CatalogueIndexCard keeps one stretched primary action and sibling secondary actions", () => {
  const markup = renderToStaticMarkup(
    createElement(CatalogueIndexCard, {
      href: "/catalogue/future-instruments/remote-signal/",
      title: "Remote signal",
      description: "Inspect an independently named future route member.",
      action: "Inspect signal",
      variant: "compact",
      media: createElement("span", null, "future pixels"),
      metadata: createElement("span", null, "3 readings"),
      secondaryActions: [{
        href: "/catalogue/components/section/",
        label: "Section",
      }, {
        href: "/catalogue/review/?components=section",
        label: "Compare",
      }],
    }),
  );

  assertStringIncludes(markup, "discern-card");
  assertSharedCards(markup, 1, "compact");
  assertEquals(
    attributeCount(markup, "data-discern-catalogue-index-card-secondary"),
    2,
  );
  const primaryStart = markup.indexOf(
    "data-discern-catalogue-index-card-primary",
  );
  const primaryEnd = markup.indexOf("</a>", primaryStart);
  const secondaryStart = markup.indexOf(
    "data-discern-catalogue-index-card-secondary",
  );
  assert(primaryStart >= 0 && primaryEnd > primaryStart);
  assert(secondaryStart > primaryEnd);
  assertEquals(
    (markup.slice(primaryStart, primaryEnd).match(/<a\b/g) ?? []).length,
    0,
  );
  assertThrows(
    () =>
      assertSharedCards(
        `${markup}<div class="discern-card">future route</div>`,
        1,
        "compact",
      ),
    Error,
    "bypassed CatalogueIndexCard",
  );
});

Deno.test("every source-backed Catalogue index population uses the shared card authority", () => {
  const overview = renderToStaticMarkup(createElement(OverviewPage));
  assertSharedCards(overview, overviewCatalogueDestinations.length, "visual");

  const directory = componentDirectory(registry);
  const collection = directory.groups[0];
  const entry = registry[0];
  assert(collection !== undefined && entry !== undefined);
  assertSharedCards(
    renderToStaticMarkup(createElement(ComponentCollectionCard, {
      collection,
    })),
    1,
    "visual",
  );
  assertSharedCards(
    renderToStaticMarkup(createElement(ComponentResultCard, {
      entry,
      showGroup: true,
    })),
    1,
    "visual",
  );

  const foundations = renderToStaticMarkup(createElement(FoundationsPage, {
    terminalPresentation: fieldLight,
    url: new URL(foundationsPaths.index, "https://catalogue.example"),
  }));
  assertSharedCards(foundations, 3, "visual");

  const glyphs = renderToStaticMarkup(createElement(GlyphIndexPage, {
    data: glyphAtlasData,
    currentUrl: new URL(
      catalogueRoutePaths.glyphs,
      "https://catalogue.example",
    ),
  }));
  assertSharedCards(glyphs, glyphAtlasData.canonical.length, "visual");
  const terminalFoundations = renderToStaticMarkup(
    createElement(FoundationsPage, {
      terminalPresentation: fieldLight,
      url: new URL(foundationsPaths.terminal, "https://catalogue.example"),
    }),
  );
  assertSharedCards(
    terminalFoundations,
    terminalFoundationSheets.length,
    "compact",
  );

  const compositions = renderToStaticMarkup(createElement(CompositionsPage, {
    currentUrl: new URL(
      catalogueRoutePaths.compositions,
      "https://catalogue.example",
    ),
  }));
  assertSharedCards(compositions, compositionRecipes.length, "visual");

  const terminal = renderToStaticMarkup(createElement(TerminalIndexPage));
  assertSharedCards(
    terminal,
    cliCompositionRecipes.length,
    "compact",
  );
});

Deno.test("future Composition and Terminal members auto-enrol with intentional staging", () => {
  const futureComposition = defineRecipe({
    id: "remote-signal",
    title: "Remote signal",
    description: "Present an unrelated future signal.",
    components: ["section"],
    definition: { message: "future stage witness" },
    render: ({ message }) => createElement("p", null, message),
    source: ({ message }) => `<Section>${JSON.stringify(message)}</Section>`,
  });
  assertEquals(futureComposition.stage, "inset");
  const compositionIndex = renderToStaticMarkup(
    createElement(CompositionsPage, {
      recipes: [futureComposition],
      currentUrl: new URL(
        catalogueRoutePaths.compositions,
        "https://catalogue.example",
      ),
    }),
  );
  assertSharedCards(compositionIndex, 1, "visual");
  const compositionDetail = renderToStaticMarkup(
    createElement(CompositionsPage, {
      recipes: [futureComposition],
      currentUrl: new URL(
        compositionRecipePath(futureComposition.id),
        "https://catalogue.example",
      ),
    }),
  );
  assertStringIncludes(
    compositionDetail,
    'data-discern-pattern-stage="inset"',
  );
  const readingFirst = compositionRecipes.find(({ id }) =>
    id === "reading-first-landing"
  );
  assert(readingFirst !== undefined);
  assertEquals(readingFirst.stage, "full-bleed");
  for (const recipe of [...compositionRecipes, futureComposition]) {
    const detail = renderToStaticMarkup(createElement(CompositionsPage, {
      recipes: [...compositionRecipes, futureComposition],
      currentUrl: new URL(
        compositionRecipePath(recipe.id),
        "https://catalogue.example",
      ),
    }));
    assertStringIncludes(
      detail,
      `data-discern-pattern-stage="${recipe.stage}"`,
    );
  }

  const futureTerminal = {
    id: "remote-signal",
    title: "Remote signal",
    description: "Correlate an unrelated future signal.",
    components: ["section"],
    capabilityControls: [],
    source: "const output = 'future';",
    render: () => "future",
  } satisfies CliCompositionRecipe;
  const terminalIndex = renderToStaticMarkup(
    createElement(TerminalIndexPage, { recipes: [futureTerminal] }),
  );
  assertSharedCards(terminalIndex, 1, "compact");
  assertStringIncludes(
    terminalIndex,
    catalogueTerminalLayoutPath(futureTerminal.id),
  );
});
