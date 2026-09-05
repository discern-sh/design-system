import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "../../../src/components/core/button/button.tsx";
import { CopyButton } from "../../../src/components/docs/copy-button/copy-button.tsx";
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
import { CatalogueIndexCard } from "../shared.tsx";
import {
  glyphExplorerResults,
  type GlyphExplorerState,
  glyphExplorerUrl,
  parseGlyphExplorerState,
} from "./state.ts";
import { glyphHumanize } from "./presentation.ts";

function GlyphCard({ entry, currentUrl, reason, referenceMatch }: {
  readonly entry: GlyphCatalogueEntry;
  readonly currentUrl: URL;
  readonly reason?: string;
  readonly referenceMatch?: boolean;
}) {
  const { canonical, aliases } = entry;
  const available = aliases.filter(({ publication }) =>
    publication === "candidate"
  );
  const title = available[0]?.discoveryTitle ??
    glyphHumanize(canonical.officialLabel);
  return (
    <div className="discern-catalogue-glyph-tile">
      <CatalogueIndexCard
        data-discern-glyph-card={glyphSequenceSlug(canonical.codePoints)}
        data-discern-glyph-available={available.length > 0 ? "" : undefined}
        href={preserveCatalogueAppearanceHref(
          currentUrl,
          catalogueGlyphPath(canonical),
        )}
        title={title}
        description={available.length > 0
          ? available.map(({ name }) => name).join(" · ")
          : canonical.id}
        action={available.length > 0 ? "Use glyph" : "Explore glyph"}
        primaryAriaLabel={`Inspect ${title}, ${canonical.id}`}
        eyebrow={available[0] === undefined
          ? "Atlas reference"
          : glyphHumanize(available[0].category)}
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
            <span>
              {canonical.terminalWidth}{" "}
              cell{canonical.terminalWidth === 1 ? "" : "s"} ·{" "}
              {canonical.presentation.effectivePresentation === "emoji"
                ? "Emoji presentation"
                : "Text presentation"}
            </span>
            {reason === undefined
              ? null
              : (
                <span className="discern-catalogue-glyph-card__reason">
                  {referenceMatch ? "Reference mention · " : ""}
                  {reason}
                </span>
              )}
          </>
        }
      />
      <CopyButton
        className="discern-catalogue-glyph-tile__copy"
        value={canonical.text}
        label="Copy"
        aria-label={`Copy ${title}, ${canonical.id}`}
      />
    </div>
  );
}

export function GlyphIndexPage({ data, currentUrl }: {
  readonly data: GlyphCatalogueData;
  readonly currentUrl?: URL;
}) {
  const entries = useMemo(() => glyphCatalogueEntries(data), [data]);
  const initialUrl = () => currentUrl ?? new URL(globalThis.location.href);
  const [locationUrl, setLocationUrl] = useState(initialUrl);
  const [state, setState] = useState(() =>
    parseGlyphExplorerState(initialUrl())
  );
  const [size, setSize] = useState("56");
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
    const nextUrl = glyphExplorerUrl(new URL(globalThis.location.href), next);
    globalThis.history[replace ? "replaceState" : "pushState"](
      null,
      "",
      nextUrl,
    );
    setLocationUrl(nextUrl);
    setState(next);
    announceCatalogueLocationChange();
  };
  const setFilter = (
    key: keyof Omit<GlyphExplorerState, "query">,
    value: string,
  ): void => {
    const next = new URL(glyphExplorerUrl(locationUrl, state));
    if (value === "") next.searchParams.delete(key);
    else next.searchParams.set(key, value);
    navigate(parseGlyphExplorerState(next));
  };
  const matches = glyphExplorerResults(entries, state);
  const candidates = data.aliases.filter(({ publication }) =>
    publication === "candidate"
  );
  const categories = DISCERN_GLYPH_CATEGORIES.filter((category) =>
    data.aliases.some((alias) => alias.category === category)
  );
  const reset = (): void => navigate({ query: "" });
  return (
    <div className="discern-catalogue-page discern-catalogue-glyphs">
      <header className="discern-catalogue-glyph-hero">
        <div>
          <p className="discern-catalogue-glyph-eyebrow">Discern Glyphs</p>
          <h1>
            Small marks.<br />
            <em>Many meanings.</em>
          </h1>
          <p>
            A working collection of Unicode for interfaces. Find a symbol, try
            it in context, and take the exact characters with you.
          </p>
          <p className="discern-catalogue-glyph-hero__counts">
            {candidates.length} ready-to-use names{" "}
            <span aria-hidden="true">/</span> {data.canonical.length}{" "}
            Unicode identities
          </p>
        </div>
        <div className="discern-catalogue-glyph-hero__marks" aria-hidden="true">
          {candidates.filter((alias, index) =>
            alias.recommendation.state === "recommended" &&
            candidates.findIndex((candidate) =>
                candidate.canonicalId === alias.canonicalId
              ) === index
          ).slice(0, 9).map((alias) => (
            <span key={alias.name}>
              {data.canonical.find(({ id }) => id === alias.canonicalId)?.text}
            </span>
          ))}
        </div>
      </header>
      <section
        className="discern-catalogue-glyphs__discovery"
        aria-label="Glyph explorer controls"
      >
        <Input
          type="search"
          label="Search Glyphs"
          value={state.query}
          onChange={(event) =>
            navigate({ ...state, query: event.currentTarget.value }, true)}
          placeholder="Try ‘undo’, ‘favourite’, an arrow →, or U+2713"
        />
        <div
          className="discern-catalogue-glyphs__collections"
          role="group"
          aria-label="Glyph collection"
        >
          {([["", "All glyphs"], ["interface", "Ready to use"], [
            "reference",
            "Atlas reference",
          ]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={state.collection === (value || undefined)
                ? "primary"
                : "secondary"}
              aria-pressed={state.collection === (value || undefined)}
              onClick={() => setFilter("collection", value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="discern-catalogue-glyphs__controls">
          <Select
            label="Discern category"
            value={state.category ?? ""}
            onChange={(event) =>
              setFilter("category", event.currentTarget.value)}
          >
            <option value="">Every category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {glyphHumanize(category)}
              </option>
            ))}
          </Select>
          <Select
            label="Terminal support"
            value={state.terminal ?? ""}
            onChange={(event) =>
              setFilter("terminal", event.currentTarget.value)}
          >
            <option value="">Any geometry</option>
            <option value="one-cell">One Unicode cell</option>
            <option value="ascii">ASCII fallback available</option>
            <option value="unicode-only">Unicode only</option>
          </Select>
          <Select
            label="Presentation"
            value={state.presentation ?? ""}
            onChange={(event) =>
              setFilter("presentation", event.currentTarget.value)}
          >
            <option value="">Text & emoji</option>
            <option value="text">Text only</option>
            <option value="emoji">Emoji only</option>
          </Select>
          <Select
            label="Preview size"
            value={size}
            onChange={(event) => setSize(event.currentTarget.value)}
          >
            {[16, 24, 32, 56, 80].map((value) => (
              <option key={value} value={value}>{value} px</option>
            ))}
          </Select>
        </div>
        <details className="discern-catalogue-glyphs__extra">
          <summary>Recommendation filters</summary>
          <Select
            label="Recommendation"
            value={state.recommendation ?? ""}
            onChange={(event) =>
              setFilter("recommendation", event.currentTarget.value)}
          >
            <option value="">Any recommendation</option>
            {DISCERN_GLYPH_RECOMMENDATION_STATES.map((value) => (
              <option key={value} value={value}>{glyphHumanize(value)}</option>
            ))}
          </Select>
        </details>
      </section>
      <section aria-labelledby="glyph-results-title">
        <div className="discern-catalogue-results-header">
          <h2 id="glyph-results-title">
            {state.collection === "interface"
              ? "Ready for your interface"
              : state.collection === "reference"
              ? "The Unicode Atlas"
              : "Explore the collection"}
          </h2>
          <p aria-live="polite">
            {matches.length} glyph{matches.length === 1 ? "" : "s"}
          </p>
          {Object.keys(state).length > 1 || state.query !== ""
            ? (
              <Button variant="ghost" onClick={reset}>
                Clear search and filters
              </Button>
            )
            : null}
        </div>
        {matches.length === 0
          ? (
            <div className="discern-catalogue-empty">
              <h3>No glyphs match this combination.</h3>
              <p>
                Try a different word, paste a character, or open the full
                collection.
              </p>
              <Button variant="secondary" onClick={reset}>
                Show all Glyphs
              </Button>
            </div>
          )
          : (
            <div
              className="discern-catalogue-glyph-grid"
              style={{
                "--discern-glyph-preview-size": `${size}px`,
              } as CSSProperties}
            >
              {matches.map((match) => (
                <GlyphCard
                  {...match}
                  currentUrl={locationUrl}
                  key={match.entry.canonical.id}
                />
              ))}
            </div>
          )}
      </section>
      <p className="discern-catalogue-glyphs__footnote">
        Characters are live text in your browser. Their artwork comes from your
        fonts; terminal cells follow Discern’s narrow-A width policy. Open a
        glyph to inspect its presentation, sources, and contextual guidance.
      </p>
    </div>
  );
}
