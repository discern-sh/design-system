import { preserveCatalogueAppearanceHref } from "../../shell/appearance-state.ts";
import { catalogueRoutePaths } from "../../routes.ts";
import {
  componentExplorerHref,
  parseComponentExplorerState,
} from "./explorer-state.ts";

/** A result anchor is useful in shared links without depending on tab storage. */
export function componentResultId(slug: string): string {
  return `component-result-${slug}`;
}

/** Accept only a local Components directory URL and its known discovery state. */
export function componentReturnHref(url: URL): string | undefined {
  const value = url.searchParams.get("return");
  if (!value?.startsWith("/catalogue/components/")) return undefined;
  const target = new URL(value, url);
  if (
    target.origin !== url.origin ||
    target.pathname !== catalogueRoutePaths.components
  ) return undefined;
  const href = preserveCatalogueAppearanceHref(
    target,
    componentExplorerHref(parseComponentExplorerState(target)),
  );
  const hash = /^#component-result-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target.hash)
    ? target.hash
    : "";
  return href + hash;
}

/** Carry discovery context and Appearance through native detail destinations. */
export function preserveComponentReturnHref(url: URL, href: string): string {
  const target = new URL(preserveCatalogueAppearanceHref(url, href), url);
  const returnHref = componentReturnHref(url);
  if (returnHref !== undefined) target.searchParams.set("return", returnHref);
  return target.pathname + target.search + target.hash;
}

/** Native links keep the same result destination when opened in a new tab. */
export function componentDiscoveryDetailHref(
  url: URL,
  href: string,
  slug: string,
): string {
  const target = new URL(preserveCatalogueAppearanceHref(url, href), url);
  if (
    parseComponentExplorerState(url).availability === "cli" &&
    !target.searchParams.has("surface")
  ) target.searchParams.set("surface", "cli");
  target.searchParams.set(
    "return",
    preserveCatalogueAppearanceHref(
      url,
      componentExplorerHref(parseComponentExplorerState(url)),
    ) + `#${componentResultId(slug)}`,
  );
  return target.pathname + target.search + target.hash;
}
