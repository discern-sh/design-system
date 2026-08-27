/**
 * Compatibility entrypoint for Catalogue routing. Concrete route patterns and
 * search projections live with their families under `catalogue/routes/`.
 */

import { componentGroups } from "../src/types/component-meta.ts";
import type { ComponentGroup } from "../src/types/component-meta.ts";
import {
  catalogueComponentPath,
  catalogueGroupFromSlug as groupFromSlug,
  catalogueGroupSlug,
  componentSearchRecords,
} from "./routes/components.ts";
import {
  canonicalCatalogueShellPathname,
  catalogueNavigation,
  catalogueRoute,
  catalogueRouteFamilies,
  catalogueRoutePaths,
  catalogueSearchRecords,
} from "./routes/registry.ts";
import type {
  CatalogueRoute,
  CatalogueRouteDescriptor,
  CatalogueRouteFamilyId,
  CatalogueSearchSources,
} from "./routes/types.ts";
import { normalizedCataloguePathname } from "./routes/types.ts";

export {
  canonicalCatalogueShellPathname,
  catalogueComponentPath,
  catalogueGroupSlug,
  catalogueNavigation,
  catalogueRoute,
  catalogueRouteFamilies,
  catalogueRoutePaths,
  catalogueSearchRecords,
  componentSearchRecords,
};
export type {
  CatalogueRoute,
  CatalogueRouteDescriptor,
  CatalogueRouteFamilyId,
  CatalogueSearchSources,
};

/** Resolve a URL slug back to the canonical Metadata-owned Component Group. */
export function catalogueGroupFromSlug(
  slug: string | null,
): ComponentGroup | undefined {
  return groupFromSlug(slug, componentGroups);
}

function decodedFragment(hash: string): string {
  if (!hash.startsWith("#")) return "";
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

/** Upgrade former one-page links to their routed destination. */
export function canonicalCatalogueLegacyUrl(current: URL): URL {
  const url = new URL(current.href);
  if (
    normalizedCataloguePathname(url.pathname) !==
      catalogueRoutePaths.overview ||
    url.searchParams.get("conformance") === "1"
  ) return url;

  const fragment = decodedFragment(url.hash);
  if (fragment.startsWith("component-")) {
    const slug = fragment.slice("component-".length).split("--", 1)[0];
    if (slug) url.pathname = catalogueComponentPath(slug);
    return url;
  }
  if (fragment.startsWith("group-")) {
    url.pathname = catalogueRoutePaths.components;
    url.searchParams.set("group", fragment.slice("group-".length));
    url.hash = "";
    return url;
  }
  if (fragment === "components") {
    url.pathname = catalogueRoutePaths.components;
    url.hash = "";
    return url;
  }
  if (
    fragment === "foundations" || fragment.startsWith("tokens-") ||
    fragment.startsWith("terminal-foundation-")
  ) {
    url.pathname = catalogueRoutePaths.foundations;
    return url;
  }
  if (fragment === "compositions" || fragment.startsWith("recipe-")) {
    url.pathname = catalogueRoutePaths.compositions;
    return url;
  }
  if (
    fragment === "terminal-layouts" || fragment.startsWith("terminal-layout-")
  ) {
    url.pathname = catalogueRoutePaths.terminal;
    return url;
  }
  if (url.searchParams.has("purpose")) {
    url.pathname = catalogueRoutePaths.components;
    return url;
  }
  if (url.searchParams.has("surface")) {
    url.pathname = catalogueRoutePaths.compare;
    url.searchParams.set("scope", "all");
  }
  return url;
}
