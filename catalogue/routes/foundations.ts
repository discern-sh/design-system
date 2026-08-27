import type { SearchRecord } from "../search/mod.ts";
import type { CatalogueRouteFamily, CatalogueSearchSources } from "./types.ts";
import { routeDescriptorSearchRecord } from "./types.ts";

export const foundationsRouteFamily: CatalogueRouteFamily = {
  descriptor: {
    id: "foundations",
    label: "Foundations",
    path: "/catalogue/foundations/",
    description:
      "Explore Tokens and the foundations shared by browser and terminal surfaces.",
    searchTerms: ["tokens", "color", "type", "spacing", "terminal motifs"],
  },
  match: (pathname) =>
    pathname === foundationsRouteFamily.descriptor.path
      ? { family: "foundations", page: "index" }
      : undefined,
  ownsShellPath: (pathname) =>
    pathname === foundationsRouteFamily.descriptor.path,
  searchRecords: (sources) => foundationsSearchRecords(sources),
};

export function foundationsSearchRecords(
  sources: Pick<CatalogueSearchSources, "tokens" | "terminalFoundations">,
): readonly SearchRecord[] {
  return [
    routeDescriptorSearchRecord(foundationsRouteFamily.descriptor),
    ...sources.tokens.map((token, order) => ({
      id: `token:${token.name}`,
      href: `${foundationsRouteFamily.descriptor.path}#tokens-${
        slugify(token.category)
      }`,
      title: token.name,
      context: `Token · ${token.category}`,
      slug: token.name,
      category: token.category,
      description: token.description,
      order,
    })),
    ...sources.terminalFoundations.map((sheet, order) => ({
      id: `terminal-foundation:${sheet.id}`,
      href:
        `${foundationsRouteFamily.descriptor.path}#terminal-foundation-${sheet.id}`,
      title: sheet.title,
      context: "Terminal foundation",
      slug: sheet.id,
      category: "Terminal",
      description: sheet.description,
      keywords: [sheet.keywords],
      order,
    })),
  ];
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
