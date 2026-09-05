import {
  DISCERN_GLYPH_CATEGORIES,
  DISCERN_GLYPH_RECOMMENDATION_STATES,
  type DiscernGlyphCategory,
  type DiscernGlyphRecommendationState,
} from "../../../src/glyphs/atlas.ts";
import {
  type GlyphCatalogueEntry,
  glyphSearchRecordsForEntries,
} from "../../routes.ts";
import { searchRecords } from "../../search/mod.ts";
import { preserveCatalogueAppearanceHref } from "../../shell/appearance-state.ts";

export interface GlyphExplorerState {
  readonly query: string;
  readonly category?: DiscernGlyphCategory;
  readonly recommendation?: DiscernGlyphRecommendationState;
  readonly collection?: "interface" | "reference";
  readonly terminal?: "one-cell" | "ascii" | "unicode-only";
  readonly presentation?: "text" | "emoji";
}

function glyphCategory(value: string | null): DiscernGlyphCategory | undefined {
  return DISCERN_GLYPH_CATEGORIES.find((candidate) => candidate === value);
}

function glyphRecommendation(
  value: string | null,
): DiscernGlyphRecommendationState | undefined {
  return DISCERN_GLYPH_RECOMMENDATION_STATES.find((candidate) =>
    candidate === value
  );
}

/** Parse only valid source-vocabulary filter values from one explorer URL. */
export function parseGlyphExplorerState(url: URL): GlyphExplorerState {
  const category = glyphCategory(url.searchParams.get("category"));
  const recommendation = glyphRecommendation(
    url.searchParams.get("recommendation"),
  );
  const collection = url.searchParams.get("collection");
  const terminal = url.searchParams.get("terminal");
  const presentation = url.searchParams.get("presentation");
  return {
    query: url.searchParams.get("q") ?? "",
    ...(category === undefined ? {} : { category }),
    ...(recommendation === undefined ? {} : { recommendation }),
    ...(collection === "interface" || collection === "reference"
      ? { collection }
      : {}),
    ...(terminal === "one-cell" || terminal === "ascii" ||
        terminal === "unicode-only"
      ? { terminal }
      : {}),
    ...(presentation === "text" || presentation === "emoji"
      ? { presentation }
      : {}),
  };
}

/** Serialize Glyph discovery state while retaining canonical Appearance state. */
export function glyphExplorerUrl(
  current: URL,
  state: GlyphExplorerState,
): URL {
  const parameters = new URLSearchParams();
  if (state.query !== "") parameters.set("q", state.query);
  if (state.category !== undefined) {
    parameters.set("category", state.category);
  }
  if (state.recommendation !== undefined) {
    parameters.set("recommendation", state.recommendation);
  }
  if (state.collection !== undefined) {
    parameters.set("collection", state.collection);
  }
  if (state.terminal !== undefined) parameters.set("terminal", state.terminal);
  if (state.presentation !== undefined) {
    parameters.set("presentation", state.presentation);
  }
  const suffix = parameters.size === 0 ? "" : `?${parameters}`;
  return new URL(
    preserveCatalogueAppearanceHref(
      current,
      `/catalogue/glyphs/${suffix}`,
    ),
    current,
  );
}

/** Filter curation and then use the universal engine for local query matching. */
export function matchingGlyphCatalogueEntries(
  entries: readonly GlyphCatalogueEntry[],
  state: GlyphExplorerState,
): readonly GlyphCatalogueEntry[] {
  return glyphExplorerResults(entries, state).map(({ entry }) => entry);
}

/** Shared search reasons distinguish a recommended use from a reference mention. */
export function glyphExplorerResults(
  entries: readonly GlyphCatalogueEntry[],
  state: GlyphExplorerState,
): readonly {
  readonly entry: GlyphCatalogueEntry;
  readonly reason?: string;
  readonly referenceMatch?: boolean;
}[] {
  const filtered = entries.filter((entry) => {
    const published = entry.aliases.filter(({ publication }) =>
      publication === "candidate"
    );
    if (state.collection === "interface" && published.length === 0) {
      return false;
    }
    if (state.collection === "reference" && published.length > 0) return false;
    if (
      state.presentation !== undefined &&
      entry.canonical.presentation.effectivePresentation !== state.presentation
    ) return false;
    if (state.terminal === "one-cell" && entry.canonical.terminalWidth !== 1) {
      return false;
    }
    if (
      state.category === undefined && state.recommendation === undefined &&
      state.terminal !== "ascii" && state.terminal !== "unicode-only"
    ) return true;
    const aliases = state.collection === "interface"
      ? published
      : entry.aliases;
    return aliases.some((alias) =>
      (state.category === undefined || alias.category === state.category) &&
      (state.recommendation === undefined ||
        alias.recommendation.state === state.recommendation) &&
      (state.terminal !== "ascii" ||
        alias.surfaces.terminal.posture === "supported") &&
      (state.terminal !== "unicode-only" ||
        alias.surfaces.terminal.posture === "unicode-only")
    );
  });
  if (state.query.trim() === "") {
    return [...filtered].sort((a, b) =>
      Number(b.aliases.some(({ publication }) => publication === "candidate")) -
      Number(a.aliases.some(({ publication }) => publication === "candidate"))
    ).map((entry) => ({ entry }));
  }
  return searchRecords(
    glyphSearchRecordsForEntries(filtered),
    state.query,
  ).flatMap(({ record, reasons }) =>
    record.payload === undefined ? [] : [{
      entry: record.payload,
      ...(reasons[0] === undefined ? {} : {
        reason: `${reasons[0].label}: ${reasons[0].value}`,
        referenceMatch: reasons.every(({ field }) =>
          field === "fact" || field === "description"
        ),
      }),
    }]
  );
}
