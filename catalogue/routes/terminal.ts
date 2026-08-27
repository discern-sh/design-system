import type { SearchRecord } from "../search/mod.ts";
import type { CatalogueRouteFamily, CatalogueSearchSources } from "./types.ts";
import { routeDescriptorSearchRecord } from "./types.ts";

export const terminalRouteFamily: CatalogueRouteFamily = {
  descriptor: {
    id: "terminal",
    label: "Terminal layouts",
    path: "/catalogue/terminal/",
    description: "Inspect complete CLI frames at explicit terminal sizes.",
    searchTerms: ["cli", "frames", "geometry", "width", "layouts"],
  },
  match: (pathname) =>
    pathname === terminalRouteFamily.descriptor.path
      ? { family: "terminal", page: "index" }
      : undefined,
  ownsShellPath: (pathname) => pathname === terminalRouteFamily.descriptor.path,
  searchRecords: (sources) => terminalSearchRecords(sources.terminalLayouts),
};

export function terminalSearchRecords(
  recipes: CatalogueSearchSources["terminalLayouts"],
): readonly SearchRecord[] {
  return [
    routeDescriptorSearchRecord(terminalRouteFamily.descriptor),
    ...recipes.map((recipe, order) => ({
      id: `terminal-layout:${recipe.id}`,
      href:
        `${terminalRouteFamily.descriptor.path}#terminal-layout-${recipe.id}`,
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
