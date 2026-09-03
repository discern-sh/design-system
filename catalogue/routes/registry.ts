import { componentGroups } from "../../src/types/component-meta.ts";
import type { SearchRecord } from "../search/mod.ts";
import { compareRouteFamily } from "./compare.ts";
import { componentsRouteFamily } from "./components.ts";
import { compositionsRouteFamily } from "./compositions.ts";
import { foundationsRouteFamily } from "./foundations.ts";
import { glyphsRouteFamily } from "./glyphs.ts";
import { overviewRouteFamily } from "./overview.ts";
import { terminalRouteFamily } from "./terminal.ts";
import type {
  CatalogueRoute,
  CatalogueRouteDescriptor,
  CatalogueRouteFamily,
  CatalogueSearchSources,
} from "./types.ts";
import { normalizedCataloguePathname } from "./types.ts";

/** The one human navigation authority, in canonical visible order. */
export const catalogueRouteFamilies = Object.freeze(
  [
    overviewRouteFamily,
    componentsRouteFamily,
    glyphsRouteFamily,
    foundationsRouteFamily,
    compositionsRouteFamily,
    terminalRouteFamily,
    compareRouteFamily,
  ] satisfies readonly CatalogueRouteFamily[],
);

export const catalogueNavigation: readonly CatalogueRouteDescriptor[] =
  catalogueRouteFamilies.map(({ descriptor }) => descriptor);

/** Canonical paths projected from route descriptors; review is a compatibility alias. */
export const catalogueRoutePaths = Object.freeze({
  overview: overviewRouteFamily.descriptor.path,
  components: componentsRouteFamily.descriptor.path,
  glyphs: glyphsRouteFamily.descriptor.path,
  foundations: foundationsRouteFamily.descriptor.path,
  compositions: compositionsRouteFamily.descriptor.path,
  terminal: terminalRouteFamily.descriptor.path,
  compare: compareRouteFamily.descriptor.path,
  review: compareRouteFamily.descriptor.path,
});

/** Resolve the current URL through family-owned route patterns. */
export function catalogueRoute(url: URL): CatalogueRoute {
  const pathname = normalizedCataloguePathname(url.pathname);
  for (const family of catalogueRouteFamilies) {
    const route = family.match(pathname);
    if (route !== undefined) return route;
  }
  return { family: "not-found", page: "not-found" };
}

/** Resolve a canonical shell path without coupling the server to page modules. */
export function canonicalCatalogueShellPathname(
  pathname: string,
): string | null {
  const normalized = normalizedCataloguePathname(pathname);
  return catalogueRouteFamilies.some((family) =>
      family.ownsShellPath(normalized)
    )
    ? normalized
    : null;
}

/** Global records projected by each family from source-backed registries. */
export function catalogueSearchRecords(
  sources: CatalogueSearchSources,
): readonly SearchRecord[] {
  return catalogueRouteFamilies.flatMap((family) =>
    family.searchRecords(sources)
  );
}

/** Resolve a Group slug using the canonical Metadata vocabulary. */
export function catalogueGroupFromCanonicalSlug(slug: string | null) {
  return componentGroups.find((group) => group.toLowerCase() === slug);
}
