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
  const allTarget = glyphExplorerUrl(url, { query: "" });
  return [
    {
      items: [{
        label: catalogueNavigationLabel("All Glyphs", data.canonical.length),
        href: allTarget.pathname + allTarget.search,
        current: route.page === "index" && Object.keys(state).length === 1 &&
            state.query === ""
          ? "location"
          : false,
      }],
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
