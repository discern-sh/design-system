import type { SearchRecord } from "../search/mod.ts";
import type { CatalogueRouteFamily, CatalogueSearchSources } from "./types.ts";
import { routeDescriptorSearchRecord } from "./types.ts";

export const compositionsRouteFamily: CatalogueRouteFamily = {
  descriptor: {
    id: "compositions",
    label: "Compositions",
    path: "/catalogue/compositions/",
    description: "See Components combined into adaptable browser patterns.",
    searchTerms: ["recipes", "patterns", "journeys", "browser"],
  },
  match: (pathname) =>
    pathname === compositionsRouteFamily.descriptor.path
      ? { family: "compositions", page: "index" }
      : undefined,
  ownsShellPath: (pathname) =>
    pathname === compositionsRouteFamily.descriptor.path,
  searchRecords: (sources) => compositionSearchRecords(sources.compositions),
};

export function compositionSearchRecords(
  recipes: CatalogueSearchSources["compositions"],
): readonly SearchRecord[] {
  return [
    routeDescriptorSearchRecord(compositionsRouteFamily.descriptor),
    ...recipes.map((recipe, order) => ({
      id: `composition:${recipe.id}`,
      href: `${compositionsRouteFamily.descriptor.path}#recipe-${recipe.id}`,
      title: recipe.title,
      context: "Composition",
      slug: recipe.id,
      description: recipe.description,
      order,
    })),
  ];
}
