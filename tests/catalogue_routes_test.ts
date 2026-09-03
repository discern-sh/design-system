import { assertEquals, assertStringIncludes } from "@std/assert";
import { componentGroups } from "../src/types/component-meta.ts";
import {
  canonicalCatalogueLegacyUrl,
  catalogueComponentPath,
  catalogueGlyphPath,
  catalogueGroupFromSlug,
  catalogueGroupSlug,
  catalogueNavigation,
  catalogueRoute,
  catalogueRoutePaths,
  catalogueTerminalFoundationPath,
  catalogueTerminalLayoutPath,
  foundationsPaths,
} from "../catalogue/routes.ts";
import { glyphAtlasData } from "../src/glyphs/atlas.ts";
import { preserveCatalogueAppearanceHref } from "../catalogue/shell/appearance-state.ts";
import { componentReviewPath } from "../catalogue/review/state.ts";
import catalogueServer from "../scripts/serve.ts";

Deno.test("local Component review route serves its instrument and canonical slash", async () => {
  const response = await catalogueServer.fetch(
    new Request(`https://catalogue.example${componentReviewPath}`),
  );
  assertEquals(response.status, 200);
  assertStringIncludes(
    await response.text(),
    "Discern Component posture review",
  );

  const redirect = await catalogueServer.fetch(
    new Request(`https://catalogue.example${componentReviewPath.slice(0, -1)}`),
  );
  assertEquals(redirect.status, 307);
  assertEquals(
    redirect.headers.get("location"),
    `https://catalogue.example${componentReviewPath}`,
  );
});

Deno.test("local Catalogue state transitions preserve valid explicit Appearance", () => {
  const current = new URL(
    "https://catalogue.example/catalogue/components/table/?theme=dark&accent=300",
  );
  assertEquals(
    preserveCatalogueAppearanceHref(
      current,
      "/catalogue/components/table/?example=dense-overflow#component-table--dense-overflow",
    ),
    "/catalogue/components/table/?example=dense-overflow&theme=dark&appearance=accent&accent=300&field=1%2C1%2C1%2C1#component-table--dense-overflow",
  );
  assertEquals(
    preserveCatalogueAppearanceHref(
      new URL(
        "https://catalogue.example/catalogue/foundations/field/?field=0.6,1,0.8,1.2,blue",
      ),
      "/catalogue/components/card/",
    ),
    "/catalogue/components/card/?theme=dark&appearance=accent&accent=255&field=0.6%2C1%2C0.8%2C1.2",
  );
  assertEquals(
    preserveCatalogueAppearanceHref(
      new URL("https://catalogue.example/catalogue/?theme=invalid&accent=999"),
      "/catalogue/review/?scope=all",
    ),
    "/catalogue/review/?scope=all&theme=system&appearance=field&accent=255&field=0%2C1%2C1%2C1",
  );
});

Deno.test("live Appearance URL updates announce link-state changes", async () => {
  const source = await Deno.readTextFile(
    new URL("../catalogue/shell/appearance.tsx", import.meta.url),
  );
  const shell = await Deno.readTextFile(
    new URL("../catalogue/shell/catalogue-shell.tsx", import.meta.url),
  );
  assertStringIncludes(source, "announceCatalogueLocationChange();");
  assertStringIncludes(source, "history.replaceState");
  assertStringIncludes(
    shell,
    "data-discern-theme-storage-key={catalogueAppearanceStorageKey}",
  );
  assertStringIncludes(shell, 'data-discern-theme-storage-parameter="theme"');
});

Deno.test("Catalogue routes resolve every explorer surface and Component detail", () => {
  const cases = [
    [catalogueRoutePaths.overview, { family: "overview", page: "index" }],
    [catalogueRoutePaths.components, { family: "components", page: "index" }],
    [catalogueComponentPath("command-group"), {
      family: "components",
      page: "detail",
      slug: "command-group",
    }],
    [catalogueRoutePaths.glyphs, { family: "glyphs", page: "index" }],
    [catalogueGlyphPath(glyphAtlasData.canonical[0]!), {
      family: "glyphs",
      page: "detail",
      slug: catalogueGlyphPath(glyphAtlasData.canonical[0]!).split("/").at(-2)!,
    }],
    [catalogueRoutePaths.foundations, { family: "foundations", page: "index" }],
    [foundationsPaths.tokens, { family: "foundations", page: "tokens" }],
    [foundationsPaths.field, { family: "foundations", page: "field" }],
    [foundationsPaths.terminal, {
      family: "foundations",
      page: "terminal-index",
    }],
    [catalogueTerminalFoundationPath("motifs"), {
      family: "foundations",
      page: "terminal-detail",
      sheetId: "motifs",
    }],
    [catalogueRoutePaths.compositions, {
      family: "compositions",
      page: "index",
    }],
    [catalogueRoutePaths.terminal, { family: "terminal", page: "index" }],
    [catalogueTerminalLayoutPath("command-reference"), {
      family: "terminal",
      page: "detail",
      recipeId: "command-reference",
    }],
    [catalogueRoutePaths.compare, { family: "compare", page: "index" }],
    ["/catalogue/unknown/", { family: "not-found", page: "not-found" }],
  ] as const;

  for (const [pathname, expected] of cases) {
    assertEquals(
      catalogueRoute(new URL(pathname, "https://catalogue.example")),
      expected,
    );
  }
});

Deno.test("Catalogue navigation has one canonical human order and route vocabulary", () => {
  assertEquals(
    catalogueNavigation.map(({ id, label, path }) => ({ id, label, path })),
    [
      { id: "overview", label: "Overview", path: "/catalogue/" },
      {
        id: "components",
        label: "Components",
        path: "/catalogue/components/",
      },
      { id: "glyphs", label: "Glyphs", path: "/catalogue/glyphs/" },
      {
        id: "foundations",
        label: "Foundations",
        path: "/catalogue/foundations/",
      },
      {
        id: "compositions",
        label: "Compositions",
        path: "/catalogue/compositions/",
      },
      {
        id: "terminal",
        label: "Terminal layouts",
        path: "/catalogue/terminal/",
      },
      { id: "compare", label: "Compare", path: "/catalogue/review/" },
    ],
  );
  assertEquals(catalogueRoutePaths.review, catalogueRoutePaths.compare);
  for (const descriptor of catalogueNavigation) {
    assertEquals(descriptor.description.trim().length > 0, true);
    assertEquals(descriptor.searchTerms.length > 0, true);
  }
});

Deno.test("Catalogue Group slugs round-trip from the canonical vocabulary", () => {
  for (const group of componentGroups) {
    assertEquals(catalogueGroupFromSlug(catalogueGroupSlug(group)), group);
  }
  assertEquals(catalogueGroupFromSlug("invented"), undefined);
});

Deno.test("legacy one-page Catalogue links upgrade to routed destinations", () => {
  const cases = [
    {
      current:
        "https://catalogue.example/catalogue/#component-command--overflow",
      expected:
        "https://catalogue.example/catalogue/components/command/#component-command--overflow",
    },
    {
      current: "https://catalogue.example/catalogue/#group-workflow",
      expected:
        "https://catalogue.example/catalogue/components/?group=workflow",
    },
    {
      current:
        "https://catalogue.example/catalogue/?purpose=displaying-tool-output",
      expected:
        "https://catalogue.example/catalogue/components/?purpose=displaying-tool-output",
    },
    {
      current: "https://catalogue.example/catalogue/?surface=cli",
      expected:
        "https://catalogue.example/catalogue/review/?surface=cli&scope=all",
    },
    {
      current: "https://catalogue.example/catalogue/#tokens-color",
      expected:
        "https://catalogue.example/catalogue/foundations/tokens/?category=color",
    },
    {
      current:
        "https://catalogue.example/catalogue/foundations/#tokens-typography",
      expected:
        "https://catalogue.example/catalogue/foundations/tokens/?category=typography",
    },
    {
      current:
        "https://catalogue.example/catalogue/#terminal-foundation-motifs",
      expected:
        "https://catalogue.example/catalogue/foundations/terminal/motifs/#terminal-foundation-motifs",
    },
    {
      current:
        "https://catalogue.example/catalogue/foundations/#terminal-foundation-narration-success",
      expected:
        "https://catalogue.example/catalogue/foundations/terminal/narration/#terminal-foundation-narration-success",
    },
    {
      current: "https://catalogue.example/catalogue/#recipe-next-action",
      expected:
        "https://catalogue.example/catalogue/compositions/#recipe-next-action",
    },
    {
      current:
        "https://catalogue.example/catalogue/#terminal-layout-command-reference",
      expected:
        "https://catalogue.example/catalogue/terminal/command-reference/",
    },
  ] as const;

  for (const testCase of cases) {
    assertEquals(
      canonicalCatalogueLegacyUrl(new URL(testCase.current)).href,
      testCase.expected,
      testCase.current,
    );
  }

  const conformance = new URL(
    "https://catalogue.example/catalogue/?conformance=1#component-command",
  );
  assertEquals(canonicalCatalogueLegacyUrl(conformance).href, conformance.href);
  const routed = new URL(
    "https://catalogue.example/catalogue/components/command/",
  );
  assertEquals(canonicalCatalogueLegacyUrl(routed).href, routed.href);
});
