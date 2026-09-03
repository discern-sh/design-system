import {
  type CanonicalGlyphRecord,
  type DiscernGlyphAlias,
  type GlyphAtlasData,
  glyphSequenceId,
} from "../../src/glyphs/atlas.ts";
import type { SearchFact, SearchRecord } from "../search/mod.ts";
import type { CatalogueRouteFamily } from "./types.ts";
import { routeDescriptorSearchRecord } from "./types.ts";

export type GlyphCatalogueData = Pick<GlyphAtlasData, "canonical" | "aliases">;

/** One canonical Atlas identity with every curated alias that refers to it. */
export interface GlyphCatalogueEntry {
  readonly canonical: CanonicalGlyphRecord;
  readonly aliases: readonly DiscernGlyphAlias[];
}

export const glyphsRouteFamily: CatalogueRouteFamily = {
  descriptor: {
    id: "glyphs",
    label: "Glyphs",
    path: "/catalogue/glyphs/",
    description: "Browse canonical Unicode identities and Discern guidance.",
    searchTerms: [
      "atlas",
      "unicode",
      "symbols",
      "emoji",
      "discern glyphs",
    ],
  },
  match: (pathname) => {
    if (pathname === glyphsRouteFamily.descriptor.path) {
      return { family: "glyphs", page: "index" };
    }
    const detail = /^\/catalogue\/glyphs\/([^/]+)\/$/.exec(pathname);
    if (detail?.[1] === undefined) return undefined;
    let slug: string;
    try {
      slug = decodeURIComponent(detail[1]);
    } catch {
      return { family: "not-found", page: "not-found" };
    }
    return parseGlyphSequenceSlug(slug) === undefined
      ? { family: "not-found", page: "not-found" }
      : { family: "glyphs", page: "detail", slug };
  },
  ownsShellPath: (pathname) =>
    pathname === glyphsRouteFamily.descriptor.path ||
    /^\/catalogue\/glyphs\/[^/]+\/$/.test(pathname),
  searchRecords: (sources) => [
    routeDescriptorSearchRecord(glyphsRouteFamily.descriptor),
    ...glyphSearchRecords(sources.glyphs),
  ],
};

/** Reversible lowercase URL projection of an exact ordered scalar sequence. */
export function glyphSequenceSlug(codePoints: readonly number[]): string {
  if (codePoints.length === 0) {
    throw new TypeError("A Glyph Atlas route needs at least one code point");
  }
  return `u-${codePoints.map((codePoint) => codePoint.toString(16)).join("-")}`;
}

/** Parse only canonical scalar-sequence slugs produced by glyphSequenceSlug. */
export function parseGlyphSequenceSlug(
  slug: string,
): readonly number[] | undefined {
  const match = /^u-([0-9a-f]+(?:-[0-9a-f]+)*)$/.exec(slug);
  if (match?.[1] === undefined) return undefined;
  const codePoints = match[1].split("-").map((value) =>
    Number.parseInt(value, 16)
  );
  if (
    codePoints.some((codePoint) =>
      !Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10FFFF ||
      (codePoint >= 0xD800 && codePoint <= 0xDFFF)
    ) || glyphSequenceSlug(codePoints) !== slug
  ) return undefined;
  return Object.freeze(codePoints);
}

/** Canonical detail path for one exact Atlas identity. */
export function catalogueGlyphPath(
  glyph: Pick<CanonicalGlyphRecord, "codePoints">,
): string {
  return `${glyphsRouteFamily.descriptor.path}${
    glyphSequenceSlug(glyph.codePoints)
  }/`;
}

/** Join curation to canonical identity without materialising another registry. */
export function glyphCatalogueEntries(
  data: GlyphCatalogueData,
): readonly GlyphCatalogueEntry[] {
  const aliasesByCanonicalId = new Map<string, DiscernGlyphAlias[]>();
  for (const alias of data.aliases) {
    const aliases = aliasesByCanonicalId.get(alias.canonicalId) ?? [];
    aliases.push(alias);
    aliasesByCanonicalId.set(alias.canonicalId, aliases);
  }
  return data.canonical.map((canonical) =>
    Object.freeze({
      canonical,
      aliases: Object.freeze([
        ...(aliasesByCanonicalId.get(canonical.id) ?? []),
      ]),
    })
  );
}

/** Resolve one routed identity against the source-injected canonical set. */
export function glyphCatalogueEntryFromSlug(
  data: GlyphCatalogueData,
  slug: string,
): GlyphCatalogueEntry | undefined {
  const codePoints = parseGlyphSequenceSlug(slug);
  if (codePoints === undefined) return undefined;
  const canonicalId = glyphSequenceId(...codePoints);
  return glyphCatalogueEntries(data).find(({ canonical }) =>
    canonical.id === canonicalId
  );
}

function aliasFacts(alias: DiscernGlyphAlias): readonly SearchFact[] {
  return [
    {
      label: "Recommendation rationale",
      value: alias.recommendation.rationale,
    },
    ...alias.discouragedUses.map((value) => ({
      label: "Discouraged use",
      value,
    })),
    { label: "Browser guidance", value: alias.surfaces.browser.guidance },
    {
      label: "Terminal guidance",
      value: alias.surfaces.terminal.guidance,
    },
  ];
}

/** Project one searchable destination per canonical identity. */
export function glyphSearchRecordsForEntries(
  entries: readonly GlyphCatalogueEntry[],
): readonly SearchRecord<GlyphCatalogueEntry>[] {
  return entries.map((entry, order) => ({
    id: `glyph:${glyphSequenceSlug(entry.canonical.codePoints)}`,
    href: catalogueGlyphPath(entry.canonical),
    title: entry.canonical.officialLabel,
    context: `Glyph Atlas · ${entry.canonical.kind.replaceAll("-", " ")}`,
    slug: glyphSequenceSlug(entry.canonical.codePoints),
    literals: [entry.canonical.text],
    aliases: entry.aliases.flatMap((alias) => [
      { label: "Discern alias", value: alias.name },
      { label: "Discovery title", value: alias.discoveryTitle },
    ]),
    categories: [...new Set(entry.aliases.map(({ category }) => category))],
    description: entry.canonical.atlas.rationale,
    purposes: entry.aliases.flatMap(({ recommendedUses }) => recommendedUses),
    keywords: [
      ...entry.canonical.searchTerms,
      entry.canonical.kind,
      entry.canonical.presentation.effectivePresentation,
      ...entry.aliases.flatMap((alias) => [
        ...alias.searchTerms,
        alias.recommendation.state,
      ]),
    ],
    facts: entry.aliases.flatMap(aliasFacts),
    order,
    payload: entry,
  }));
}

/** Source-injected projection shared by global and Glyph-local search. */
export function glyphSearchRecords(
  data: GlyphCatalogueData,
): readonly SearchRecord<GlyphCatalogueEntry>[] {
  return glyphSearchRecordsForEntries(glyphCatalogueEntries(data));
}
