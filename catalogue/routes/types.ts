import type { ComponentMeta } from "../../src/types/component-meta.ts";
import type { DesignToken, ThemeToken } from "../../src/tokens/tokens.ts";
import type { SearchRecord } from "../search/mod.ts";
import type { GlyphAtlasData } from "../../src/glyphs/atlas.ts";

/** Canonical human-facing Catalogue families. */
export type CatalogueRouteFamilyId =
  | "overview"
  | "components"
  | "glyphs"
  | "foundations"
  | "compositions"
  | "terminal"
  | "compare";

/** One routed Catalogue destination, with detail patterns owned by its family. */
export type CatalogueRoute =
  | { readonly family: "overview"; readonly page: "index" }
  | { readonly family: "components"; readonly page: "index" }
  | {
    readonly family: "components";
    readonly page: "detail";
    readonly slug: string;
  }
  | { readonly family: "glyphs"; readonly page: "index" }
  | {
    readonly family: "glyphs";
    readonly page: "detail";
    readonly slug: string;
  }
  | { readonly family: "foundations"; readonly page: "index" }
  | { readonly family: "foundations"; readonly page: "field" }
  | { readonly family: "foundations"; readonly page: "tokens" }
  | { readonly family: "foundations"; readonly page: "terminal-index" }
  | {
    readonly family: "foundations";
    readonly page: "terminal-detail";
    readonly sheetId: string;
  }
  | { readonly family: "compositions"; readonly page: "index" }
  | {
    readonly family: "compositions";
    readonly page: "detail";
    readonly slug: string;
  }
  | { readonly family: "terminal"; readonly page: "index" }
  | {
    readonly family: "terminal";
    readonly page: "detail";
    readonly recipeId: string;
  }
  | { readonly family: "compare"; readonly page: "index" }
  | { readonly family: "not-found"; readonly page: "not-found" };

/** One canonical name, order, path, and description for human navigation. */
export interface CatalogueRouteDescriptor {
  readonly id: CatalogueRouteFamilyId;
  readonly label: string;
  readonly path: string;
  readonly description: string;
  readonly searchTerms: readonly string[];
}

/** Source shapes consumed by route-family search projections. */
export interface CatalogueSearchSources {
  readonly components: readonly { readonly meta: ComponentMeta }[];
  readonly glyphs: GlyphAtlasData;
  readonly tokens: readonly (DesignToken | ThemeToken)[];
  readonly compositions: readonly {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly status: { readonly label: string };
    readonly components: readonly string[];
  }[];
  readonly terminalLayouts: readonly {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly components: readonly string[];
  }[];
  readonly terminalFoundations: readonly {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly keywords: string;
  }[];
}

/** Concrete seam owned by one planned route family. */
export interface CatalogueRouteFamily {
  readonly descriptor: CatalogueRouteDescriptor;
  readonly match: (pathname: string) => CatalogueRoute | undefined;
  readonly ownsShellPath: (pathname: string) => boolean;
  readonly searchRecords: (
    sources: CatalogueSearchSources,
  ) => readonly SearchRecord[];
}

export function normalizedCataloguePathname(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function routeDescriptorSearchRecord(
  descriptor: CatalogueRouteDescriptor,
): SearchRecord {
  return {
    id: `route:${descriptor.id}`,
    href: descriptor.path,
    title: descriptor.label,
    context: "Catalogue",
    description: descriptor.description,
    keywords: descriptor.searchTerms,
  };
}
