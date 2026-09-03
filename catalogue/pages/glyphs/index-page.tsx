import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../src/components/core/button/button.tsx";
import { Badge } from "../../../src/components/display/badge/badge.tsx";
import { Input } from "../../../src/components/forms/input/input.tsx";
import { Select } from "../../../src/components/forms/select/select.tsx";
import {
  DISCERN_GLYPH_CATEGORIES,
  DISCERN_GLYPH_RECOMMENDATION_STATES,
} from "../../../src/glyphs/atlas.ts";
import {
  catalogueGlyphPath,
  type GlyphCatalogueData,
  glyphCatalogueEntries,
  type GlyphCatalogueEntry,
  glyphSequenceSlug,
} from "../../routes.ts";
import { preserveCatalogueAppearanceHref } from "../../shell/appearance-state.ts";
import { announceCatalogueLocationChange } from "../../shell/location.ts";
import { CatalogueIndexCard, CataloguePageHeader } from "../shared.tsx";
import {
  type GlyphExplorerState,
  glyphExplorerUrl,
  matchingGlyphCatalogueEntries,
  parseGlyphExplorerState,
} from "./state.ts";

function humanize(value: string): string {
  return value.replaceAll("-", " ").replace(
    /^./,
    (letter) => letter.toUpperCase(),
  );
}

function terminalSummary(entry: GlyphCatalogueEntry): string {
  const width = entry.canonical.terminalWidth;
  return width === 1 ? "1 terminal cell" : `${width} terminal cells — inspect`;
}

function GlyphCard(
  {
    entry,
    currentUrl,
  }: { readonly entry: GlyphCatalogueEntry; readonly currentUrl: URL },
) {
  const { canonical, aliases } = entry;
  return (
    <CatalogueIndexCard
      data-discern-glyph-card={glyphSequenceSlug(canonical.codePoints)}
      href={preserveCatalogueAppearanceHref(
        currentUrl,
        catalogueGlyphPath(canonical),
      )}
      title={canonical.officialLabel}
      description={canonical.id}
      action="Inspect identity"
      primaryAriaLabel={`Inspect ${canonical.officialLabel}, ${canonical.id}`}
      eyebrow={`${humanize(canonical.kind)} · ${
        humanize(canonical.presentation.effectivePresentation)
      }`}
      media={
        <span
          className="discern-catalogue-glyph-card__specimen"
          aria-hidden="true"
        >
          {canonical.text}
        </span>
      }
      metadata={
        <>
          <span>{terminalSummary(entry)}</span>
          {canonical.atlas.hazards.length === 0
            ? null
            : (
              <span className="discern-catalogue-glyph-card__warning">
                {canonical.atlas.hazards.map(humanize).join(" · ")}
              </span>
            )}
          {aliases.length === 0
            ? <span>No curated Discern alias</span>
            : (
              <span className="discern-catalogue-glyph-card__aliases">
                {aliases.map((alias) => (
                  <Badge
                    key={alias.name}
                    tone={alias.publication === "deferred" ||
                        alias.recommendation.state === "brand-reserved"
                      ? "warning"
                      : alias.recommendation.state === "recommended"
                      ? "success"
                      : "neutral"}
                  >
                    {alias.name} · {humanize(alias.recommendation.state)} ·{" "}
                    {humanize(alias.publication)}
                  </Badge>
                ))}
              </span>
            )}
        </>
      }
    />
  );
}

function initialUrl(currentUrl: URL | undefined): URL {
  return currentUrl ?? new URL(globalThis.location.href);
}

export function GlyphIndexPage(
  {
    data,
    currentUrl,
  }: {
    readonly data: GlyphCatalogueData;
    readonly currentUrl?: URL;
  },
) {
  const entries = useMemo(() => glyphCatalogueEntries(data), [data]);
  const [locationUrl, setLocationUrl] = useState(() => initialUrl(currentUrl));
  const [state, setState] = useState(() =>
    parseGlyphExplorerState(initialUrl(currentUrl))
  );

  useEffect(() => {
    const restore = (): void => {
      const url = new URL(globalThis.location.href);
      setLocationUrl(url);
      setState(parseGlyphExplorerState(url));
    };
    globalThis.addEventListener("popstate", restore);
    return () => globalThis.removeEventListener("popstate", restore);
  }, []);

  const navigate = (next: GlyphExplorerState, replace = false): void => {
    const nextUrl = glyphExplorerUrl(
      new URL(globalThis.location.href),
      next,
    );
    globalThis.history[replace ? "replaceState" : "pushState"](
      null,
      "",
      nextUrl,
    );
    setLocationUrl(nextUrl);
    setState(next);
    announceCatalogueLocationChange();
  };

  const matches = matchingGlyphCatalogueEntries(entries, state);
  const categories = DISCERN_GLYPH_CATEGORIES.filter((category) =>
    data.aliases.some((alias) => alias.category === category)
  );
  const recommendations = DISCERN_GLYPH_RECOMMENDATION_STATES.filter(
    (recommendation) =>
      data.aliases.some((alias) =>
        alias.recommendation.state === recommendation
      ),
  );
  const reset = (): void => navigate({ query: "" });

  return (
    <div className="discern-catalogue-page discern-catalogue-glyphs">
      <CataloguePageHeader
        index="03"
        eyebrow="Glyph Atlas"
        title="Find the identity before assigning the meaning."
        description="Atlas records exact Unicode identity and reference facts. Discern Glyphs adds contextual names, recommendations, and surface guidance without claiming one universal interface meaning."
      />

      <div className="discern-catalogue-glyphs__populations">
        <p>
          <strong>{data.canonical.length}</strong> canonical Atlas records
        </p>
        <p>
          <strong>{data.aliases.length}</strong> curated Discern aliases
        </p>
      </div>

      <section
        className="discern-catalogue-explorer-controls discern-catalogue-glyphs__controls"
        aria-label="Glyph explorer controls"
      >
        <Input
          type="search"
          label="Search Glyphs"
          value={state.query}
          onChange={(event) =>
            navigate({ ...state, query: event.currentTarget.value }, true)}
          placeholder="Paste ✓, enter U+2713, a Unicode name, alias, category, or use"
        />
        <Select
          label="Discern category"
          value={state.category ?? ""}
          onChange={(event) => {
            const category = categories.find((candidate) =>
              candidate === event.currentTarget.value
            );
            navigate({
              query: state.query,
              ...(category === undefined ? {} : { category }),
              ...(state.recommendation === undefined
                ? {}
                : { recommendation: state.recommendation }),
            });
          }}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option value={category} key={category}>
              {humanize(category)}
            </option>
          ))}
        </Select>
        <Select
          label="Recommendation"
          value={state.recommendation ?? ""}
          onChange={(event) => {
            const recommendation = recommendations.find((candidate) =>
              candidate === event.currentTarget.value
            );
            navigate({
              query: state.query,
              ...(state.category === undefined
                ? {}
                : { category: state.category }),
              ...(recommendation === undefined ? {} : { recommendation }),
            });
          }}
        >
          <option value="">All recommendations</option>
          {recommendations.map((recommendation) => (
            <option value={recommendation} key={recommendation}>
              {humanize(recommendation)}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={reset}
          disabled={state.query === "" && state.category === undefined &&
            state.recommendation === undefined}
        >
          Clear search and filters
        </Button>
      </section>

      <section aria-labelledby="glyph-results-title">
        <div className="discern-catalogue-results-header">
          <h2 id="glyph-results-title">Canonical identities</h2>
          <p aria-live="polite">
            {matches.length} glyph{matches.length === 1 ? "" : "s"}
          </p>
        </div>
        {matches.length === 0
          ? (
            <div className="discern-catalogue-empty">
              <h3>No Glyphs found</h3>
              <p>
                Try an exact glyph, a U+ identifier, a Unicode name, or clear
                the Discern filters.
              </p>
              <Button variant="secondary" onClick={reset}>
                Show all Glyphs
              </Button>
            </div>
          )
          : (
            <div className="discern-catalogue-glyph-grid">
              {matches.map((entry) => (
                <GlyphCard
                  entry={entry}
                  currentUrl={locationUrl}
                  key={entry.canonical.id}
                />
              ))}
            </div>
          )}
      </section>
    </div>
  );
}
