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
  return {
    query: url.searchParams.get("q") ?? "",
    ...(category === undefined ? {} : { category }),
    ...(recommendation === undefined ? {} : { recommendation }),
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
  const filtered = entries.filter((entry) => {
    if (
      state.category === undefined && state.recommendation === undefined
    ) return true;
    return entry.aliases.some((alias) =>
      (state.category === undefined || alias.category === state.category) &&
      (state.recommendation === undefined ||
        alias.recommendation.state === state.recommendation)
    );
  });
  if (state.query.trim() === "") return filtered;
  return searchRecords(
    glyphSearchRecordsForEntries(filtered),
    state.query,
  ).flatMap(({ record }) =>
    record.payload === undefined ? [] : [record.payload]
  );
}
