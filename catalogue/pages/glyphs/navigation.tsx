import {
  type DiscernGlyphCategory,
  glyphAtlasData,
} from "../../../src/glyphs/atlas.ts";
import type {
  CatalogueNavigationSections,
  LocalNavigationProps,
} from "../navigation-types.ts";
import { catalogueNavigationLabel } from "../navigation-types.ts";
import type { GlyphCatalogueData } from "../../routes.ts";
import { glyphExplorerUrl, parseGlyphExplorerState } from "./state.ts";

/** Source-backed Glyph filters projected into the shared Catalogue navigation. */
export function glyphsNavigationSections(
  { route, url }: LocalNavigationProps,
  data: GlyphCatalogueData = glyphAtlasData,
): CatalogueNavigationSections {
  if (route.family !== "glyphs") return [];
  const state = parseGlyphExplorerState(url);
  const categoryCounts = new Map<DiscernGlyphCategory, number>();
  for (const alias of data.aliases) {
    categoryCounts.set(
      alias.category,
      (categoryCounts.get(alias.category) ?? 0) + 1,
    );
  }
  const allTarget = glyphExplorerUrl(url, { query: "" });
  return [
    {
      items: [{
        label: catalogueNavigationLabel("All Glyphs", data.canonical.length),
        href: allTarget.pathname + allTarget.search,
        current: route.page === "index" && state.category === undefined
          ? "location"
          : false,
      }],
    },
    {
      title: "Discern categories",
      items: [...categoryCounts].map(([category, count]) => {
        const target = glyphExplorerUrl(url, {
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
