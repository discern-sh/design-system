import type {
  DesignToken,
  ThemeToken,
  TokenCategory,
} from "../../src/tokens/tokens.ts";
import { searchRecords } from "../search/mod.ts";
import type { SearchRecord } from "../search/mod.ts";
import { terminalFoundationSheets } from "../terminal-foundations.ts";
import type { CatalogueRouteFamily, CatalogueSearchSources } from "./types.ts";
import { routeDescriptorSearchRecord } from "./types.ts";

export type FoundationToken = DesignToken | ThemeToken;

export const foundationsRouteDescriptor = {
  id: "foundations",
  label: "Foundations",
  path: "/catalogue/foundations/",
  description: "Explore Tokens and terminal foundations.",
  searchTerms: ["tokens", "color", "type", "spacing", "terminal motifs"],
} as const;

export const foundationsPaths = Object.freeze({
  index: foundationsRouteDescriptor.path,
  field: `${foundationsRouteDescriptor.path}field/`,
  tokens: `${foundationsRouteDescriptor.path}tokens/`,
  terminal: `${foundationsRouteDescriptor.path}terminal/`,
});

export function catalogueTerminalFoundationPath(id: string): string {
  return `${foundationsPaths.terminal}${encodeURIComponent(id)}/`;
}

export function foundationTokenCategories(
  tokens: readonly FoundationToken[],
): readonly TokenCategory[] {
  return [...new Set(tokens.map(({ category }) => category))];
}

export function foundationTokenCategoryPath(category: TokenCategory): string {
  const url = new URL(foundationsPaths.tokens, "https://catalogue.invalid");
  url.searchParams.set("category", slugify(category));
  return `${url.pathname}${url.search}`;
}

export function foundationTokenFragment(name: string): string {
  return `token-${slugify(name)}`;
}

export function foundationTokenHref(token: FoundationToken): string {
  return `${foundationTokenCategoryPath(token.category)}#${
    foundationTokenFragment(token.name)
  }`;
}

function terminalSheetIdFromPath(pathname: string): string | undefined {
  if (!pathname.startsWith(foundationsPaths.terminal)) return undefined;
  const suffix = pathname.slice(foundationsPaths.terminal.length);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(suffix)) return undefined;
  return suffix.slice(0, -1);
}

export const foundationsRouteFamily: CatalogueRouteFamily = {
  descriptor: foundationsRouteDescriptor,
  match: (pathname) => {
    if (pathname === foundationsPaths.index) {
      return { family: "foundations", page: "index" };
    }
    if (pathname === foundationsPaths.tokens) {
      return { family: "foundations", page: "tokens" };
    }
    if (pathname === foundationsPaths.field) {
      return { family: "foundations", page: "field" };
    }
    if (pathname === foundationsPaths.terminal) {
      return { family: "foundations", page: "terminal-index" };
    }
    const sheetId = terminalSheetIdFromPath(pathname);
    return sheetId === undefined
      ? undefined
      : { family: "foundations", page: "terminal-detail", sheetId };
  },
  ownsShellPath: (pathname) =>
    pathname === foundationsPaths.index ||
    pathname === foundationsPaths.field ||
    pathname === foundationsPaths.tokens ||
    pathname === foundationsPaths.terminal ||
    terminalSheetIdFromPath(pathname) !== undefined,
  searchRecords: (sources) => foundationsSearchRecords(sources),
};

export interface FoundationTokenExplorerState {
  readonly query: string;
  readonly category?: TokenCategory;
}

export function foundationTokenExplorerState(
  url: URL,
  tokens: readonly FoundationToken[],
): FoundationTokenExplorerState {
  const requestedCategory = url.searchParams.get("category");
  const category = foundationTokenCategories(tokens).find((candidate) =>
    slugify(candidate) === requestedCategory
  );
  return {
    query: url.searchParams.get("q") ?? "",
    ...(category === undefined ? {} : { category }),
  };
}

export function foundationTokenExplorerUrl(
  current: URL,
  state: FoundationTokenExplorerState,
): URL {
  const url = new URL(current.href);
  url.pathname = foundationsPaths.tokens;
  url.hash = "";
  if (state.query === "") url.searchParams.delete("q");
  else url.searchParams.set("q", state.query);
  if (state.category === undefined) url.searchParams.delete("category");
  else url.searchParams.set("category", slugify(state.category));
  return url;
}

function tokenFacts(token: FoundationToken) {
  return "light" in token
    ? [
      { label: "Light value", value: token.light },
      { label: "Dark value", value: token.dark },
    ]
    : [{ label: "Authored value", value: token.value }];
}

export function foundationTokenSearchRecords(
  tokens: readonly FoundationToken[],
): readonly SearchRecord<FoundationToken>[] {
  return tokens.map((token, order) => ({
    id: `token:${token.name}`,
    href: foundationTokenHref(token),
    title: token.name,
    context: `Token · ${token.category}`,
    slug: token.name,
    category: token.category,
    description: token.description,
    facts: tokenFacts(token),
    order,
    payload: token,
  }));
}

export function matchingFoundationTokens(
  tokens: readonly FoundationToken[],
  state: FoundationTokenExplorerState,
): readonly FoundationToken[] {
  const records = foundationTokenSearchRecords(tokens).filter(({ payload }) =>
    state.category === undefined || payload?.category === state.category
  );
  return state.query.trim() === ""
    ? records.flatMap(({ payload }) => payload === undefined ? [] : [payload])
    : searchRecords(records, state.query).flatMap(({ record }) =>
      record.payload === undefined ? [] : [record.payload]
    );
}

export function foundationsSearchRecords(
  sources: Pick<CatalogueSearchSources, "tokens" | "terminalFoundations">,
): readonly SearchRecord[] {
  return [
    routeDescriptorSearchRecord(foundationsRouteDescriptor),
    {
      id: "foundations:field",
      href: foundationsPaths.field,
      title: "Field",
      context: "Foundations",
      description:
        "Place the live design system at one continuous field point.",
      keywords: ["darkness", "structure", "emphasis", "density", "proof"],
    },
    {
      id: "foundations:tokens",
      href: foundationsPaths.tokens,
      title: "Tokens",
      context: "Foundations",
      description: "Search and filter visual design Tokens.",
      keywords: ["color", "typography", "spacing", "shape", "motion"],
    },
    ...foundationTokenCategories(sources.tokens).map((category, order) => ({
      id: `token-category:${slugify(category)}`,
      href: foundationTokenCategoryPath(category),
      title: category,
      context: "Token category",
      category,
      keywords: ["tokens"],
      order,
    })),
    ...foundationTokenSearchRecords(sources.tokens),
    {
      id: "foundations:terminal",
      href: foundationsPaths.terminal,
      title: "Terminal foundations",
      context: "Foundations",
      description: "Motifs and narration primitives for terminal surfaces.",
      keywords: ["terminal", "motif", "narration"],
    },
    ...sources.terminalFoundations.map((sheet, order) => ({
      id: `terminal-foundation:${sheet.id}`,
      href: catalogueTerminalFoundationPath(sheet.id),
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

export function canonicalFoundationsLegacyUrl(current: URL): URL {
  const url = new URL(current.href);
  const path = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  if (path !== "/catalogue/" && path !== foundationsPaths.index) return url;
  const fragment = decodeFragment(url.hash);
  if (fragment === "foundations") {
    url.pathname = foundationsPaths.index;
    url.hash = "";
    return url;
  }
  if (fragment.startsWith("tokens-")) {
    url.pathname = foundationsPaths.tokens;
    url.searchParams.set("category", fragment.slice("tokens-".length));
    url.hash = "";
    return url;
  }
  if (fragment.startsWith("terminal-foundation-")) {
    const remainder = fragment.slice("terminal-foundation-".length);
    const sheet = [...terminalFoundationSheets].sort((left, right) =>
      right.id.length - left.id.length
    ).find(({ id }) => remainder === id || remainder.startsWith(`${id}-`));
    if (sheet !== undefined) {
      url.pathname = catalogueTerminalFoundationPath(sheet.id);
    }
  }
  return url;
}

function decodeFragment(hash: string): string {
  if (!hash.startsWith("#")) return "";
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
