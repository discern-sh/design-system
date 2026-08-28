import type { SearchRecord } from "../search/mod.ts";
import type { CatalogueRouteFamily, CatalogueSearchSources } from "./types.ts";
import { routeDescriptorSearchRecord } from "./types.ts";

const RECIPE_FRAGMENT_PREFIX = "#recipe-";

export interface CompositionDestinationSource {
  readonly id: string;
  readonly title: string;
}

/** Stable detail destination for one recipe identity. */
export function compositionRecipePath(id: string): string {
  return `${compositionsRouteFamily.descriptor.path}${encodeURIComponent(id)}/`;
}

/** Resolve one bounded detail identity from the family-owned path pattern. */
export function compositionRecipeIdFromPathname(
  pathname: string,
): string | undefined {
  const prefix = compositionsRouteFamily.descriptor.path;
  if (!pathname.startsWith(prefix) || pathname === prefix) return undefined;
  const remainder = pathname.slice(prefix.length).replace(/\/$/, "");
  if (remainder === "" || remainder.includes("/")) return undefined;
  try {
    return decodeURIComponent(remainder);
  } catch {
    return undefined;
  }
}

/** Resolve current detail state, including the former index fragment shape. */
export function compositionRecipeIdFromUrl(url: URL): string | undefined {
  const routed = compositionRecipeIdFromPathname(url.pathname);
  if (routed !== undefined) return routed;
  if (
    url.pathname.replace(/\/?$/, "/") !==
      compositionsRouteFamily.descriptor.path ||
    !url.hash.startsWith(RECIPE_FRAGMENT_PREFIX)
  ) return undefined;
  const encoded = url.hash.slice(RECIPE_FRAGMENT_PREFIX.length);
  if (encoded === "") return undefined;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return undefined;
  }
}

/** Upgrade a former `#recipe-*` destination without losing query state. */
export function canonicalCompositionUrl(current: URL): URL {
  const url = new URL(current.href);
  const id = compositionRecipeIdFromUrl(url);
  if (
    id !== undefined &&
    url.pathname.replace(/\/?$/, "/") ===
      compositionsRouteFamily.descriptor.path
  ) {
    url.pathname = compositionRecipePath(id);
    url.hash = "";
  }
  return url;
}

/** Local navigation projected in recipe order. */
export function compositionNavigationItems(
  recipes: readonly CompositionDestinationSource[],
) {
  return recipes.map(({ id, title }) => ({
    id,
    title,
    href: compositionRecipePath(id),
  }));
}

export const compositionsRouteFamily: CatalogueRouteFamily = {
  descriptor: {
    id: "compositions",
    label: "Compositions",
    path: "/catalogue/compositions/",
    description: "See Components combined into adaptable browser patterns.",
    searchTerms: ["recipes", "patterns", "journeys", "browser"],
  },
  match: (pathname) => {
    if (pathname === compositionsRouteFamily.descriptor.path) {
      return { family: "compositions", page: "index" };
    }
    const slug = compositionRecipeIdFromPathname(pathname);
    return slug === undefined
      ? undefined
      : { family: "compositions", page: "detail", slug };
  },
  ownsShellPath: (pathname) =>
    compositionsRouteFamily.match(pathname) !== undefined,
  searchRecords: (sources) => compositionSearchRecords(sources.compositions),
};

export function compositionSearchRecords(
  recipes: CatalogueSearchSources["compositions"],
): readonly SearchRecord[] {
  return [
    routeDescriptorSearchRecord(compositionsRouteFamily.descriptor),
    ...recipes.map((recipe, order) => ({
      id: `composition:${recipe.id}`,
      href: compositionRecipePath(recipe.id),
      title: recipe.title,
      context: recipe.status.label,
      slug: recipe.id,
      description: recipe.description,
      facts: [{ label: "Components", value: recipe.components.join(" ") }],
      order,
    })),
  ];
}
