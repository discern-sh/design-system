import type { SearchRecord } from "../search/mod.ts";
import type { CatalogueRouteFamily, CatalogueSearchSources } from "./types.ts";
import { routeDescriptorSearchRecord } from "./types.ts";

/** Canonical detail path for one source-backed terminal recipe. */
export function catalogueTerminalLayoutPath(recipeId: string): string {
  return `/catalogue/terminal/${encodeURIComponent(recipeId)}/`;
}

export const terminalRouteFamily: CatalogueRouteFamily = {
  descriptor: {
    id: "terminal",
    label: "Terminal layouts",
    path: "/catalogue/terminal/",
    description: "Inspect complete CLI frames at explicit terminal sizes.",
    searchTerms: ["cli", "frames", "geometry", "width", "layouts"],
  },
  match: (pathname) => {
    if (pathname === terminalRouteFamily.descriptor.path) {
      return { family: "terminal", page: "index" };
    }
    if (!pathname.startsWith(terminalRouteFamily.descriptor.path)) {
      return undefined;
    }
    const encoded = pathname.slice(terminalRouteFamily.descriptor.path.length)
      .replace(/\/$/u, "");
    if (encoded === "" || encoded.includes("/")) return undefined;
    try {
      return {
        family: "terminal",
        page: "detail",
        recipeId: decodeURIComponent(encoded),
      };
    } catch {
      return undefined;
    }
  },
  ownsShellPath: (pathname) =>
    terminalRouteFamily.match(pathname) !== undefined,
  searchRecords: (sources) => terminalSearchRecords(sources.terminalLayouts),
};

export function terminalSearchRecords(
  recipes: CatalogueSearchSources["terminalLayouts"],
): readonly SearchRecord[] {
  return [
    routeDescriptorSearchRecord(terminalRouteFamily.descriptor),
    ...recipes.map((recipe, order) => ({
      id: `terminal-layout:${recipe.id}`,
      href: catalogueTerminalLayoutPath(recipe.id),
      title: recipe.title,
      context: "Terminal layout",
      slug: recipe.id,
      category: "Terminal",
      description: recipe.description,
      keywords: [...recipe.components, "terminal", "layout", "cli"],
      order,
    })),
  ];
}
