import {
  glyphBrowserFontRoles,
  glyphJavaScriptEscape,
} from "../catalogue/pages/glyphs/presentation.ts";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GlyphDetailPage,
  glyphPresentationFamily,
} from "../catalogue/pages/glyphs/detail-page.tsx";
import { GlyphIndexPage } from "../catalogue/pages/glyphs/index-page.tsx";
import { GlyphsPage } from "../catalogue/pages/glyphs/page.tsx";
import { OverviewPage } from "../catalogue/pages/overview/page.tsx";
import {
  glyphExplorerResults,
  type GlyphExplorerState,
  glyphExplorerUrl,
  matchingGlyphCatalogueEntries,
  parseGlyphExplorerState,
} from "../catalogue/pages/glyphs/state.ts";
import {
  catalogueGlyphPath,
  catalogueRoute,
  catalogueSearchRecords,
  type GlyphCatalogueData,
  glyphCatalogueEntries,
  glyphSearchRecords,
  glyphSequenceSlug,
  parseGlyphSequenceSlug,
} from "../catalogue/routes.ts";
import { searchRecords } from "../catalogue/search/mod.ts";
import {
  defineCanonicalGlyph,
  defineDiscernGlyphAlias,
  defineUnicodeScalarFacts,
  glyphAtlasData,
  glyphSequenceId,
} from "../src/glyphs/atlas.ts";
import type { DesignToken } from "../src/tokens/tokens.ts";

function syntheticFutureData(): GlyphCatalogueData {
  const canonical = defineCanonicalGlyph({
    kind: "scalar",
    scalar: defineUnicodeScalarFacts({
      codePoint: 0x25EF,
      name: "LARGE CIRCLE",
      nameAliases: [],
      generalCategory: "So",
      block: "Geometric Shapes",
      age: "1.1",
      eastAsianWidth: "A",
      emojiProperties: [],
      standardizedVariations: [],
    }),
    atlas: {
      rationale: "Synthetic future member proving Catalogue enrollment.",
      hazards: [],
    },
  });
  const alias = defineDiscernGlyphAlias({
    name: "future-circle",
    discoveryTitle: "Future circle",
    canonicalId: canonical.id,
    searchTerms: ["future fixture", "round witness"],
    category: "shape",
    publication: "candidate",
    recommendation: {
      state: "recommended",
      rationale: "Synthetic future alias proving joined Catalogue guidance.",
    },
    recommendedUses: ["Future enrollment fixture"],
    discouragedUses: ["Production data"],
    surfaces: {
      browser: {
        posture: "supported",
        guidance: "Synthetic browser guidance for future enrollment.",
      },
      terminal: {
        posture: "supported",
        geometry: "one-cell",
        guidance: "Synthetic terminal guidance for future enrollment.",
        asciiFallback: {
          text: "O",
          fidelity: "approximation",
          guidance: "A capital letter retains a circular outline.",
        },
      },
    },
  });
  return {
    canonical: [...glyphAtlasData.canonical, canonical],
    aliases: [...glyphAtlasData.aliases, alias],
  };
}

Deno.test("every canonical Glyph owns one collision-free reversible detail route", () => {
  const slugs = new Set<string>();
  const paths = new Set<string>();
  for (const canonical of glyphAtlasData.canonical) {
    const slug = glyphSequenceSlug(canonical.codePoints);
    const path = catalogueGlyphPath(canonical);
    assertEquals(parseGlyphSequenceSlug(slug), canonical.codePoints);
    assert(!slugs.has(slug), slug);
    assert(!paths.has(path), path);
    slugs.add(slug);
    paths.add(path);
    assertEquals(
      catalogueRoute(new URL(path, "https://catalogue.example")),
      { family: "glyphs", page: "detail", slug },
    );
  }
  assertEquals(slugs.size, glyphAtlasData.canonical.length);
  assertEquals(parseGlyphSequenceSlug("u-26a0-fe0e"), [0x26A0, 0xFE0E]);
  assertEquals(parseGlyphSequenceSlug("u-1f469-200d-1f4bb"), [
    0x1F469,
    0x200D,
    0x1F4BB,
  ]);
  for (const malformed of ["", "u-", "u-XYZ", "u-026a0", "u-d800"]) {
    assertEquals(parseGlyphSequenceSlug(malformed), undefined, malformed);
  }
  assertEquals(
    catalogueRoute(
      new URL(
        "/catalogue/glyphs/u-not-hex/",
        "https://catalogue.example",
      ),
    ),
    { family: "not-found", page: "not-found" },
  );
});

Deno.test("glyph capability filters compose on one alias and keep reference matches explained", () => {
  const entries = glyphCatalogueEntries(glyphAtlasData);
  const states: readonly GlyphExplorerState[] = [
    {
      query: "",
      collection: "interface",
      terminal: "ascii",
      presentation: "text",
    },
    { query: "", collection: "reference", presentation: "emoji" },
    { query: "", terminal: "unicode-only" },
  ];
  for (const state of states) {
    const url = glyphExplorerUrl(
      new URL("https://catalogue.example/catalogue/glyphs/?theme=dark"),
      state,
    );
    assertEquals(parseGlyphExplorerState(url), state);
    const matches = matchingGlyphCatalogueEntries(entries, state);
    assert(matches.length > 0);
    for (const entry of matches) {
      if (state.collection === "interface") {
        assert(
          entry.aliases.some((alias) =>
            alias.publication === "candidate" &&
            alias.surfaces.terminal.posture === "supported"
          ),
        );
      }
      if (state.collection === "reference") {
        assert(
          entry.aliases.every((alias) => alias.publication === "deferred"),
        );
      }
      if (state.terminal === "unicode-only") {
        assert(
          entry.aliases.some((alias) =>
            alias.surfaces.terminal.posture === "unicode-only"
          ),
        );
      }
    }
  }
  const copy = glyphExplorerResults(entries, { query: "copy" });
  assertEquals(copy[0]?.entry.canonical.text, "⧉");
  assertEquals(copy[0]?.referenceMatch, false);
  assert(copy[0]?.reason?.includes("copy"));
  const warning = entries.find(({ canonical }) => canonical.text === "⚠︎");
  assert(warning !== undefined);
  assertEquals(
    glyphPresentationFamily(warning, entries).map(({ canonical }) =>
      canonical.text
    ),
    ["⚠", "⚠︎", "⚠️"],
  );
});

Deno.test("Atlas and alias authorities project one canonical card, route, and search destination", () => {
  const entries = glyphCatalogueEntries(glyphAtlasData);
  const records = glyphSearchRecords(glyphAtlasData);
  assertEquals(entries.length, glyphAtlasData.canonical.length);
  assertEquals(records.length, glyphAtlasData.canonical.length);
  assertEquals(new Set(records.map(({ id }) => id)).size, records.length);
  assertEquals(new Set(records.map(({ href }) => href)).size, records.length);
  const global = catalogueSearchRecords({
    components: [],
    glyphs: glyphAtlasData,
    tokens: [],
    compositions: [],
    terminalLayouts: [],
    terminalFoundations: [],
  }).filter(({ id }) => id.startsWith("glyph:"));
  assertEquals(global.map(({ id }) => id), records.map(({ id }) => id));
  for (const alias of glyphAtlasData.aliases) {
    assert(
      entries.some((entry) =>
        entry.canonical.id === alias.canonicalId &&
        entry.aliases.includes(alias)
      ),
      alias.name,
    );
  }

  const markup = renderToStaticMarkup(createElement(GlyphIndexPage, {
    data: glyphAtlasData,
    currentUrl: new URL(
      "/catalogue/glyphs/",
      "https://catalogue.example",
    ),
  }));
  assertEquals(
    (markup.match(/data-discern-glyph-card=/g) ?? []).length,
    glyphAtlasData.canonical.length,
  );
  assertEquals(
    (markup.match(/data-discern-catalogue-index-card-primary=/g) ?? []).length,
    glyphAtlasData.canonical.length,
  );
  const overview = renderToStaticMarkup(createElement(OverviewPage));
  assertStringIncludes(
    overview,
    `${glyphAtlasData.canonical.length} Atlas records · ${glyphAtlasData.aliases.length} Discern aliases`,
  );
});

Deno.test("Glyph search shares exact literals and all canonical or curated discovery fields", () => {
  const records = glyphSearchRecords(glyphAtlasData);
  const literalCases = [
    ["⚠", glyphSequenceId(0x26A0)],
    ["⚠︎", glyphSequenceId(0x26A0, 0xFE0E)],
    ["⚠️", glyphSequenceId(0x26A0, 0xFE0F)],
  ] as const;
  for (const [query, expectedId] of literalCases) {
    const result = searchRecords(records, query);
    assertEquals(result.length, 1, query);
    assertEquals(result[0]?.record.payload?.canonical.id, expectedId, query);
    assertEquals(result[0]?.reasons[0]?.label, "Literal glyph", query);
  }

  const checkId = glyphSequenceId(0x2713);
  for (
    const query of [
      "✓",
      "U+2713",
      "CHECK MARK",
      "selection-selected",
      "selection",
      "Selected option",
      "chosen",
    ]
  ) {
    assert(
      searchRecords(records, query).some(({ record }) =>
        record.payload?.canonical.id === checkId
      ),
      query,
    );
  }
  const alias = searchRecords(records, "status-complete").find(({ record }) =>
    record.payload?.canonical.id === checkId
  );
  assert(
    alias?.reasons.some(({ label }) => label === "Discern alias"),
    "Curated alias matches should retain a Discern alias explanation",
  );
  assertEquals(
    searchRecords(records, "deferred").map(({ record }) =>
      record.payload?.aliases.find(({ publication }) =>
        publication === "deferred"
      )?.name
    ).sort(),
    [
      "arrow-bidirectional",
      "shape-circle",
      "shape-diamond",
      "shape-square",
      "shape-star",
    ],
  );

  const zwjId = glyphSequenceId(0x1F469, 0x200D, 0x1F4BB);
  assert(
    searchRecords(records, "U+1F469 U+200D U+1F4BB").some(({ record }) =>
      record.payload?.canonical.id === zwjId
    ),
  );
});

Deno.test("Glyph explorer URL state validates filters, preserves Appearance, and restores matching", () => {
  const invalid = new URL(
    "https://catalogue.example/catalogue/glyphs/?q=check&category=invented&recommendation=unknown&theme=dark",
  );
  assertEquals(parseGlyphExplorerState(invalid), { query: "check" });

  const current = new URL(
    "https://catalogue.example/catalogue/glyphs/?theme=dark&appearance=accent&accent=300&field=1,1,1,1",
  );
  const target = glyphExplorerUrl(current, {
    query: "warning sign",
    category: "status",
    recommendation: "recommended",
  });
  assertEquals(target.pathname, "/catalogue/glyphs/");
  assertEquals(target.searchParams.get("q"), "warning sign");
  assertEquals(target.searchParams.get("category"), "status");
  assertEquals(target.searchParams.get("recommendation"), "recommended");
  assertEquals(target.searchParams.get("theme"), "dark");
  assertEquals(target.searchParams.get("accent"), "300");
  assertEquals(target.searchParams.has("appearance"), false);

  const entries = glyphCatalogueEntries(glyphAtlasData);
  const matches = matchingGlyphCatalogueEntries(entries, {
    query: "warning",
    category: "status",
    recommendation: "recommended",
  });
  assertEquals(
    matches.map(({ canonical }) => canonical.id),
    [glyphSequenceId(0x26A0, 0xFE0E)],
  );
});

Deno.test("future canonical and alias members auto-enrol every Catalogue projection", () => {
  const data = syntheticFutureData();
  const future = data.canonical.at(-1);
  const alias = data.aliases.at(-1);
  assert(future !== undefined && alias !== undefined);
  const entries = glyphCatalogueEntries(data);
  const records = glyphSearchRecords(data);
  assertEquals(entries.length, data.canonical.length);
  assertEquals(records.length, data.canonical.length);
  assertEquals(
    catalogueRoute(
      new URL(catalogueGlyphPath(future), "https://catalogue.example"),
    ),
    {
      family: "glyphs",
      page: "detail",
      slug: glyphSequenceSlug(future.codePoints),
    },
  );
  assertEquals(
    searchRecords(records, "round witness")[0]?.record.payload?.canonical.id,
    future.id,
  );

  const index = renderToStaticMarkup(createElement(GlyphIndexPage, {
    data,
    currentUrl: new URL(
      "/catalogue/glyphs/",
      "https://catalogue.example",
    ),
  }));
  assertStringIncludes(
    index,
    `data-discern-glyph-card="${glyphSequenceSlug(future.codePoints)}"`,
  );

  const entry = entries.at(-1);
  assert(entry !== undefined);
  const detail = renderToStaticMarkup(createElement(GlyphDetailPage, {
    entry,
    entries,
    currentUrl: new URL(
      catalogueGlyphPath(future),
      "https://catalogue.example",
    ),
  }));
  assertStringIncludes(detail, 'data-discern-glyph-alias="future-circle"');
  assertStringIncludes(detail, "Future enrollment fixture");
  assertStringIncludes(detail, "Available in ./glyphs");
});

Deno.test("unknown canonical Glyph slugs render Not Found and exact sequences remain copyable", () => {
  const unknown = renderToStaticMarkup(createElement(GlyphsPage, {
    route: { family: "glyphs", page: "detail", slug: "u-10ffff" },
    data: glyphAtlasData,
    currentUrl: new URL(
      "/catalogue/glyphs/u-10ffff/",
      "https://catalogue.example",
    ),
  }));
  assertStringIncludes(
    unknown,
    "That Catalogue destination does not exist.",
  );

  for (
    const id of [
      glyphSequenceId(0x26A0, 0xFE0E),
      glyphSequenceId(0x1F469, 0x200D, 0x1F4BB),
    ]
  ) {
    const canonical = glyphAtlasData.canonical.find((record) =>
      record.id === id
    );
    assert(canonical !== undefined);
    assertEquals(
      glyphJavaScriptEscape(canonical),
      canonical.codePoints.map((codePoint) =>
        `\\u{${codePoint.toString(16).toUpperCase()}}`
      ).join(""),
    );
  }
});

Deno.test("Glyph rendering comparison derives every live browser font-stack role", () => {
  assertEquals(
    glyphBrowserFontRoles().map(({ token }) => token),
    [
      "--discern-font-display",
      "--discern-font-body",
      "--discern-font-mono",
      "--discern-font-ui",
    ],
  );
  const future = {
    name: "--discern-font-reading",
    value: "ui-serif, serif",
    category: "Typography",
    description: "Synthetic future font stack.",
  } as const satisfies DesignToken;
  assertEquals(glyphBrowserFontRoles([future]), [{
    token: future.name,
    label: "Reading",
  }]);
});
