import {
  type ComponentGroup,
  componentGroups,
} from "../src/types/component-meta.ts";

/** Canonical browser routes for the Catalogue explorer. */
export const catalogueRoutePaths = Object.freeze({
  overview: "/catalogue/",
  foundations: "/catalogue/foundations/",
  components: "/catalogue/components/",
  compositions: "/catalogue/compositions/",
  terminal: "/catalogue/terminal/",
  review: "/catalogue/review/",
});

/** One route resolved from the Catalogue's mounted URL space. */
export type CatalogueRoute =
  | { readonly kind: "overview" }
  | { readonly kind: "foundations" }
  | { readonly kind: "components" }
  | { readonly kind: "component"; readonly slug: string }
  | { readonly kind: "compositions" }
  | { readonly kind: "terminal" }
  | { readonly kind: "review" }
  | { readonly kind: "not-found" };

/** Stable URL slug for one metadata-owned Component Group. */
export function catalogueGroupSlug(group: ComponentGroup): string {
  return group.toLowerCase();
}

/** Resolve a URL slug back to the canonical metadata-owned Component Group. */
export function catalogueGroupFromSlug(
  slug: string | null,
): ComponentGroup | undefined {
  return componentGroups.find((group) => catalogueGroupSlug(group) === slug);
}

/** Canonical detail route for one generated Component entry. */
export function catalogueComponentPath(slug: string): string {
  return `${catalogueRoutePaths.components}${encodeURIComponent(slug)}/`;
}

function normalizedPathname(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

/** Resolve the current browser URL to one Catalogue explorer route. */
export function catalogueRoute(url: URL): CatalogueRoute {
  const pathname = normalizedPathname(url.pathname);
  for (
    const [kind, routePath] of Object.entries(
      catalogueRoutePaths,
    ) as ReadonlyArray<
      [Exclude<CatalogueRoute["kind"], "component" | "not-found">, string]
    >
  ) {
    if (pathname === routePath) return { kind };
  }
  const component = /^\/catalogue\/components\/([^/]+)\/$/.exec(pathname);
  if (component?.[1] !== undefined) {
    try {
      return { kind: "component", slug: decodeURIComponent(component[1]) };
    } catch {
      return { kind: "not-found" };
    }
  }
  return { kind: "not-found" };
}

/**
 * Return the canonical shell pathname for a routed Catalogue request.
 * Static assets and source-rendered review artifacts deliberately return null.
 */
export function canonicalCatalogueShellPathname(
  pathname: string,
): string | null {
  const normalized = normalizedPathname(pathname);
  if (
    (Object.values(catalogueRoutePaths) as readonly string[]).includes(
      normalized,
    )
  ) return normalized;
  return /^\/catalogue\/components\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(
      normalized,
    )
    ? normalized
    : null;
}

function decodedFragment(hash: string): string {
  if (!hash.startsWith("#")) return "";
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

/**
 * Upgrade links from the former one-page inventory to their routed destination.
 * The original fragment is retained when the destination still owns that id.
 */
export function canonicalCatalogueLegacyUrl(current: URL): URL {
  const url = new URL(current.href);
  if (
    normalizedPathname(url.pathname) !== catalogueRoutePaths.overview ||
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
    url.pathname = catalogueRoutePaths.review;
    url.searchParams.set("scope", "all");
  }
  return url;
}
