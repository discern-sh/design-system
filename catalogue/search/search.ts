/** UI-independent fields that may explain why a Catalogue search record matched. */
export type SearchField =
  | "title"
  | "slug"
  | "group"
  | "category"
  | "description"
  | "purpose"
  | "keywords"
  | "fact";

/** One bounded, source-backed fact that a provider makes searchable. */
export interface SearchFact {
  readonly label: string;
  readonly value: string;
}

/**
 * One provider-owned search record. Providers decide the population and URL;
 * the engine alone decides normalisation, matching, ranking, and reasons.
 */
export interface SearchRecord<Payload = unknown> {
  readonly id: string;
  readonly href: string;
  readonly title: string;
  readonly context: string;
  readonly slug?: string;
  readonly group?: string;
  readonly category?: string;
  readonly description?: string;
  readonly purposes?: readonly string[];
  readonly keywords?: readonly string[];
  readonly facts?: readonly SearchFact[];
  readonly order?: number;
  readonly payload?: Payload;
}

/** A truthful explanation of the strongest field match for one query token. */
export interface SearchMatchReason {
  readonly field: SearchField;
  readonly label: string;
  readonly value: string;
  readonly token: string;
}

/** Stable result contract shared by global and population-restricted consumers. */
export interface SearchResult<Payload = unknown> {
  readonly record: SearchRecord<Payload>;
  readonly score: number;
  readonly reasons: readonly SearchMatchReason[];
}

/** One canonical vocabulary for established abbreviations and human intent. */
export const searchAliases = Object.freeze({
  "call to action": "cta",
  "command line interface": "cli",
  "user interface": "ui",
  "application programming interface": "api",
  colour: "color",
});

function normaliseCharacters(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Mark}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Canonical query normalisation, including phrase aliases. */
export function normalizeSearchText(value: string): string {
  let normalized = normaliseCharacters(value);
  for (const [phrase, replacement] of Object.entries(searchAliases)) {
    normalized = normalized.replace(
      new RegExp(`(?:^| )${phrase.replaceAll(" ", "\\s+")}(?= |$)`, "g"),
      (match) => `${match.startsWith(" ") ? " " : ""}${replacement}`,
    );
  }
  return normalized.trim().replace(/\s+/g, " ");
}

/** Stable tokenisation used by every search consumer. */
export function tokenizeSearchText(value: string): readonly string[] {
  const normalized = normalizeSearchText(value);
  return normalized === "" ? [] : normalized.split(" ");
}

interface Candidate {
  readonly field: SearchField;
  readonly label: string;
  readonly value: string;
  readonly normalized: string;
  readonly tier: number;
}

function candidates(record: SearchRecord): readonly Candidate[] {
  const values: Candidate[] = [{
    field: "title",
    label: "Name",
    value: record.title,
    normalized: normalizeSearchText(record.title),
    tier: 0,
  }];
  const add = (
    field: SearchField,
    label: string,
    value: string | undefined,
    tier: number,
  ): void => {
    if (value === undefined || value.trim() === "") return;
    values.push({
      field,
      label,
      value,
      normalized: normalizeSearchText(value),
      tier,
    });
  };
  add("slug", "Slug", record.slug, 2);
  add("group", "Group", record.group, 3);
  add("category", "Category", record.category, 3);
  add("description", "Description", record.description, 6);
  for (const purpose of record.purposes ?? []) {
    add("purpose", "Purpose", purpose, 4);
  }
  for (const keyword of record.keywords ?? []) {
    add("keywords", "Keywords", keyword, 5);
  }
  for (const fact of record.facts ?? []) {
    add("fact", fact.label, fact.value, 7);
  }
  return values;
}

function matchCandidate(candidate: Candidate, token: string): number | null {
  const words = candidate.normalized.split(" ");
  if (candidate.field === "title") {
    if (words.includes(token)) return candidate.tier;
    if (words.some((word) => word.startsWith(token))) return 1;
    if (candidate.normalized.includes(token)) return 2;
    return null;
  }
  if (candidate.normalized === token) return candidate.tier;
  if (words.some((word) => word.startsWith(token))) return candidate.tier + 1;
  return candidate.normalized.includes(token) ? candidate.tier + 2 : null;
}

function compareRecords(
  left: SearchRecord,
  right: SearchRecord,
): number {
  return (left.order ?? 0) - (right.order ?? 0) ||
    normalizeSearchText(left.title).localeCompare(
      normalizeSearchText(right.title),
    ) || left.id.localeCompare(right.id);
}

/**
 * Search any provider-selected population with shared semantics. Every query
 * token must match; direct names dominate aliases and supporting prose.
 */
export function searchRecords<Payload>(
  records: readonly SearchRecord<Payload>[],
  query: string,
  options: Readonly<{ limit?: number }> = {},
): readonly SearchResult<Payload>[] {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = tokenizeSearchText(query);
  if (tokens.length === 0) return [];

  const results: SearchResult<Payload>[] = [];
  for (const record of records) {
    const available = candidates(record);
    const reasons: SearchMatchReason[] = [];
    const tiers: number[] = [];
    let titleMatches = 0;
    for (const token of tokens) {
      const matches = available.flatMap((candidate) => {
        const tier = matchCandidate(candidate, token);
        return tier === null ? [] : [{ candidate, tier }];
      }).sort((left, right) =>
        left.tier - right.tier ||
        left.candidate.normalized.length - right.candidate.normalized.length ||
        left.candidate.label.localeCompare(right.candidate.label)
      );
      const strongest = matches[0];
      if (strongest === undefined) {
        tiers.length = 0;
        break;
      }
      tiers.push(strongest.tier);
      if (strongest.candidate.field === "title") titleMatches += 1;
      reasons.push({
        field: strongest.candidate.field,
        label: strongest.candidate.label,
        value: strongest.candidate.value,
        token,
      });
    }
    if (tiers.length !== tokens.length) continue;

    const title = normalizeSearchText(record.title);
    const exactTitle = title === normalizedQuery;
    const prefixTitle = title.startsWith(normalizedQuery);
    const worstTier = Math.max(...tiers);
    const tierTotal = tiers.reduce((total, tier) => total + tier, 0);
    const rank = worstTier * 100_000 + tierTotal * 1_000 -
      titleMatches * 100 - (exactTitle ? 50 : prefixTitle ? 25 : 0);
    results.push({ record, score: 10_000_000 - rank, reasons });
  }

  results.sort((left, right) =>
    right.score - left.score || compareRecords(left.record, right.record)
  );
  return results.slice(0, options.limit ?? results.length);
}

/** First non-title reason suitable for compact search-result explanation. */
export function supportingMatchReason(
  result: SearchResult,
): SearchMatchReason | undefined {
  return result.reasons.find(({ field }) =>
    field !== "title" && field !== "slug"
  );
}
