import {
  DISCERN_GLYPH_CATEGORIES,
  glyphAtlasData,
} from "../../../src/glyphs/atlas.ts";
import type {
  CatalogueNavigationSections,
  LocalNavigationProps,
} from "../navigation-types.ts";
import { catalogueNavigationLabel } from "../navigation-types.ts";
import {
  type GlyphCatalogueData,
  glyphCatalogueEntries,
} from "../../routes.ts";
import {
  glyphExplorerUrl,
  matchingGlyphCatalogueEntries,
  parseGlyphExplorerState,
} from "./state.ts";

/** Source-backed Glyph filters projected into the shared Catalogue navigation. */
export function glyphsNavigationSections(
  { route, url }: LocalNavigationProps,
  data: GlyphCatalogueData = glyphAtlasData,
): CatalogueNavigationSections {
  if (route.family !== "glyphs") return [];
  const state = parseGlyphExplorerState(url);
  const entries = glyphCatalogueEntries(data);
  const categoryCounts = DISCERN_GLYPH_CATEGORIES.map((category) =>
    [
      category,
      matchingGlyphCatalogueEntries(entries, { ...state, query: "", category })
        .length,
    ] as const
  ).filter(([, count]) => count > 0);
  const collections = [
    {
      label: "Ready to use",
      count: matchingGlyphCatalogueEntries(entries, { query: "" }).length,
      collection: undefined,
    },
    {
      label: "Unicode Atlas",
      count: matchingGlyphCatalogueEntries(entries, {
        query: "",
        collection: "reference",
      }).length,
      collection: "reference" as const,
    },
    {
      label: "All Glyphs",
      count: data.canonical.length,
      collection: "all" as const,
    },
  ];
  return [
    {
      items: collections.map(({ label, count, collection }) => {
        const target = glyphExplorerUrl(url, {
          query: "",
          ...(collection === undefined ? {} : { collection }),
        });
        return {
          label: catalogueNavigationLabel(label, count),
          href: target.pathname + target.search,
          current: route.page === "index" && state.query === "" &&
              state.collection === collection &&
              Object.keys(state).length === (collection === undefined ? 1 : 2)
            ? "location" as const
            : false,
        };
      }),
    },
    {
      title: "Discern categories",
      items: categoryCounts.map(([category, count]) => {
        const target = glyphExplorerUrl(url, {
          ...state,
          query: "",
          category,
        });
        return {
          label: catalogueNavigationLabel(
            category.replace(/^./, (letter) => letter.toUpperCase()),
            count,
          ),
          href: target.pathname + target.search,
          current: route.page === "index" && state.category === category
            ? "location" as const
            : false,
        };
      }),
    },
  ];
}
