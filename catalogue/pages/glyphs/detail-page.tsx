import type { CSSProperties } from "react";
import { Button } from "../../../src/components/core/button/button.tsx";
import { Badge } from "../../../src/components/display/badge/badge.tsx";
import {
  type CanonicalGlyphRecord,
  derivedGlyphHazards,
  DISCERN_GLYPH_ACCESSIBILITY_POSTURE,
  type DiscernGlyphAlias,
  GLYPH_ATLAS_RENDERING_POSTURE,
  GLYPH_ATLAS_UNICODE_SOURCES,
  GLYPH_ATLAS_UNICODE_TERMS_URL,
} from "../../../src/glyphs/atlas.ts";
import { publicTokens } from "../../../src/token-inventory.ts";
import type { DesignToken, ThemeToken } from "../../../src/tokens/tokens.ts";
import { catalogueGlyphPath, type GlyphCatalogueEntry } from "../../routes.ts";
import { preserveCatalogueAppearanceHref } from "../../shell/appearance-state.ts";
import { CataloguePageHeader, CopyableCode } from "../shared.tsx";

function humanize(value: string): string {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(
    /^./,
    (letter) => letter.toUpperCase(),
  );
}

export function glyphJavaScriptEscape(
  record: Pick<CanonicalGlyphRecord, "codePoints">,
): string {
  return record.codePoints.map((codePoint) =>
    `\\u{${codePoint.toString(16).toUpperCase()}}`
  ).join("");
}

export interface GlyphBrowserFontRole {
  readonly token: string;
  readonly label: string;
}

/** Derive browser font-stack roles from the public Token inventory. */
export function glyphBrowserFontRoles(
  tokens: readonly (DesignToken | ThemeToken)[] = publicTokens,
): readonly GlyphBrowserFontRole[] {
  return tokens.flatMap((token) => {
    if (
      !("value" in token) || token.category !== "Typography" ||
      !token.name.startsWith("--discern-font-") ||
      !/\b(?:serif|sans-serif|monospace)\b/u.test(token.value)
    ) return [];
    return [{
      token: token.name,
      label: humanize(token.name.slice("--discern-font-".length)),
    }];
  });
}

export function glyphCatalogueNeighbours(
  entries: readonly GlyphCatalogueEntry[],
  canonicalId: string,
): Readonly<{
  previous?: GlyphCatalogueEntry;
  next?: GlyphCatalogueEntry;
}> {
  const index = entries.findIndex(({ canonical }) =>
    canonical.id === canonicalId
  );
  if (index < 0) return {};
  const previous = entries[index - 1];
  const next = entries[index + 1];
  return {
    ...(previous === undefined ? {} : { previous }),
    ...(next === undefined ? {} : { next }),
  };
}

function scalarValueList(
  record: CanonicalGlyphRecord,
  select: (scalar: CanonicalGlyphRecord["scalars"][number]) => string,
): string {
  return [...new Set(record.scalars.map(select))].join(" · ");
}

function emojiProperties(record: CanonicalGlyphRecord): string {
  const values = record.scalars.flatMap(({ emojiProperties }) =>
    emojiProperties
  );
  return [...new Set(values)].join(" · ") || "None in the represented facts";
}

function AliasGuidance({ alias }: { readonly alias: DiscernGlyphAlias }) {
  const terminal = alias.surfaces.terminal;
  return (
    <article
      className="discern-catalogue-glyph-alias"
      data-discern-glyph-alias={alias.name}
    >
      <header>
        <div>
          <code>{alias.name}</code>
          <h3>{alias.discoveryTitle}</h3>
        </div>
        <div className="discern-catalogue-glyph-alias__badges">
          <Badge tone="neutral">{humanize(alias.category)}</Badge>
          <Badge
            tone={alias.recommendation.state === "recommended"
              ? "success"
              : alias.recommendation.state === "brand-reserved"
              ? "warning"
              : "neutral"}
          >
            {humanize(alias.recommendation.state)}
          </Badge>
          <Badge
            tone={alias.publication === "deferred" ? "warning" : "neutral"}
          >
            {humanize(alias.publication)}
          </Badge>
        </div>
      </header>
      <p>{alias.recommendation.rationale}</p>
      <div className="discern-catalogue-glyph-alias__uses">
        <section>
          <h4>Recommended uses</h4>
          <ul>
            {alias.recommendedUses.map((use) => <li key={use}>{use}</li>)}
          </ul>
        </section>
        <section>
          <h4>Discouraged uses</h4>
          <ul>
            {alias.discouragedUses.map((use) => <li key={use}>{use}</li>)}
          </ul>
        </section>
      </div>
      <div className="discern-catalogue-glyph-alias__surfaces">
        <section>
          <h4>Browser · {humanize(alias.surfaces.browser.posture)}</h4>
          <p>{alias.surfaces.browser.guidance}</p>
        </section>
        <section>
          <h4>
            Terminal · {humanize(terminal.posture)} ·{" "}
            {humanize(terminal.geometry)}
          </h4>
          <p>{terminal.guidance}</p>
          {terminal.posture === "supported"
            ? (
              <div className="discern-catalogue-glyph-alias__fallback">
                <strong>ASCII fallback</strong>
                <code>{terminal.asciiFallback.text}</code>
                <span>{humanize(terminal.asciiFallback.fidelity)}</span>
                <p>{terminal.asciiFallback.guidance}</p>
              </div>
            )
            : terminal.posture === "unicode-only"
            ? (
              <div className="discern-catalogue-glyph-alias__fallback">
                <strong>ASCII fallback</strong>
                <p>No ASCII fallback is approved for this alias.</p>
              </div>
            )
            : null}
        </section>
      </div>
    </article>
  );
}

export function GlyphDetailPage(
  {
    entry,
    entries,
    currentUrl,
  }: {
    readonly entry: GlyphCatalogueEntry;
    readonly entries: readonly GlyphCatalogueEntry[];
    readonly currentUrl: URL;
  },
) {
  const { canonical, aliases } = entry;
  const neighbours = glyphCatalogueNeighbours(entries, canonical.id);
  const objectiveHazards = derivedGlyphHazards(canonical);
  const authoredCautions = canonical.atlas.hazards.filter((hazard) =>
    !objectiveHazards.includes(hazard)
  );
  const href = (target: GlyphCatalogueEntry): string =>
    preserveCatalogueAppearanceHref(
      currentUrl,
      catalogueGlyphPath(target.canonical),
    );

  return (
    <div
      className="discern-catalogue-page discern-catalogue-glyph-detail"
      data-discern-glyph-detail={canonical.id}
    >
      <a
        className="discern-catalogue-glyph-detail__back"
        href={preserveCatalogueAppearanceHref(
          currentUrl,
          "/catalogue/glyphs/",
        )}
      >
        ← All Glyphs
      </a>
      <CataloguePageHeader
        index="03"
        eyebrow="Canonical Unicode identity"
        title={canonical.officialLabel}
        description={`${canonical.id} is an exact ${
          humanize(canonical.kind).toLowerCase()
        } identity. Interface meaning remains contextual.`}
      />

      <section
        className="discern-catalogue-glyph-identity"
        aria-labelledby="glyph-identity-title"
      >
        <div
          className="discern-catalogue-glyph-identity__specimen"
          aria-hidden="true"
        >
          {canonical.text}
        </div>
        <div>
          <h2 id="glyph-identity-title">Exact sequence</h2>
          <CopyableCode label="Rendered sequence" value={canonical.text} />
          <CopyableCode label="Code points" value={canonical.id} />
          <CopyableCode
            label="JavaScript / TypeScript"
            value={glyphJavaScriptEscape(canonical)}
          />
        </div>
      </section>

      <section
        className="discern-catalogue-glyph-section"
        aria-labelledby="glyph-facts-title"
      >
        <h2 id="glyph-facts-title">Atlas reference facts</h2>
        <dl className="discern-catalogue-glyph-facts">
          <div>
            <dt>Kind</dt>
            <dd>{humanize(canonical.kind)}</dd>
          </div>
          <div>
            <dt>Official label</dt>
            <dd>{canonical.officialLabel}</dd>
          </div>
          <div>
            <dt>Unicode version</dt>
            <dd>{canonical.provenance.unicodeVersion}</dd>
          </div>
          <div>
            <dt>Unicode age</dt>
            <dd>{scalarValueList(canonical, ({ age }) => age)}</dd>
          </div>
          <div>
            <dt>General categories</dt>
            <dd>
              {scalarValueList(
                canonical,
                ({ generalCategory }) => generalCategory,
              )}
            </dd>
          </div>
          <div>
            <dt>Blocks</dt>
            <dd>{scalarValueList(canonical, ({ block }) => block)}</dd>
          </div>
          <div>
            <dt>East Asian Width</dt>
            <dd>
              {scalarValueList(
                canonical,
                ({ eastAsianWidth }) => eastAsianWidth,
              )}
            </dd>
          </div>
          <div>
            <dt>Emoji properties</dt>
            <dd>{emojiProperties(canonical)}</dd>
          </div>
          <div>
            <dt>Default presentation</dt>
            <dd>{humanize(canonical.presentation.defaultPresentation)}</dd>
          </div>
          <div>
            <dt>Effective presentation</dt>
            <dd>{humanize(canonical.presentation.effectivePresentation)}</dd>
          </div>
          <div>
            <dt>Selected variation</dt>
            <dd>
              {canonical.presentation.selectedVariation === undefined
                ? "None"
                : humanize(canonical.presentation.selectedVariation)}
            </dd>
          </div>
          <div>
            <dt>Sequence type</dt>
            <dd>
              {canonical.presentation.sequenceType === undefined
                ? "Not applicable"
                : humanize(canonical.presentation.sequenceType)}
            </dd>
          </div>
          <div>
            <dt>Grapheme count</dt>
            <dd>{canonical.graphemeCount}</dd>
          </div>
          <div>
            <dt>Discern terminal width</dt>
            <dd>
              {canonical.terminalWidth}{" "}
              cell{canonical.terminalWidth === 1 ? "" : "s"}
            </dd>
          </div>
        </dl>

        <div className="discern-catalogue-glyph-code-points">
          <h3>Ordered code points</h3>
          <div
            className="discern-catalogue-glyph-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Ordered code-point table"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Position</th>
                  <th scope="col">Code point</th>
                  <th scope="col">Unicode name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Block</th>
                  <th scope="col">Age</th>
                  <th scope="col">East Asian Width</th>
                </tr>
              </thead>
              <tbody>
                {canonical.scalars.map((scalar, index) => (
                  <tr key={`${scalar.codePoint}:${index}`}>
                    <td>{index + 1}</td>
                    <td>
                      <code>
                        U+{scalar.codePoint.toString(16).toUpperCase().padStart(
                          4,
                          "0",
                        )}
                      </code>
                    </td>
                    <td>{scalar.name}</td>
                    <td>{scalar.generalCategory}</td>
                    <td>{scalar.block}</td>
                    <td>{scalar.age}</td>
                    <td>{scalar.eastAsianWidth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {objectiveHazards.length === 0 && authoredCautions.length === 0
          ? null
          : (
            <div className="discern-catalogue-glyph-hazards">
              {objectiveHazards.length === 0 ? null : (
                <div>
                  <h3>Measured or presentation hazards</h3>
                  <p>{objectiveHazards.map(humanize).join(" · ")}</p>
                </div>
              )}
              {authoredCautions.length === 0 ? null : (
                <div>
                  <h3>Atlas cautions</h3>
                  <p>{authoredCautions.map(humanize).join(" · ")}</p>
                </div>
              )}
            </div>
          )}
        <p>{canonical.atlas.rationale}</p>
      </section>

      <section
        className="discern-catalogue-glyph-section"
        aria-labelledby="glyph-provenance-title"
      >
        <h2 id="glyph-provenance-title">Unicode provenance</h2>
        <p>
          These are source-cited, authored, bounded records; the Catalogue does
          not claim a mechanically replayed copy of every upstream property.
        </p>
        <ul className="discern-catalogue-glyph-sources">
          {canonical.provenance.sources.map((sourceId) => {
            const source = GLYPH_ATLAS_UNICODE_SOURCES[sourceId];
            return (
              <li key={sourceId}>
                <a href={source.url}>{source.title}</a>{" "}
                <span>{source.version}</span>
              </li>
            );
          })}
          <li>
            <a href={GLYPH_ATLAS_UNICODE_TERMS_URL}>Unicode terms of use</a>
          </li>
        </ul>
      </section>

      <section
        className="discern-catalogue-glyph-section"
        aria-labelledby="glyph-rendering-title"
      >
        <h2 id="glyph-rendering-title">This browser’s current rendering</h2>
        <p>{GLYPH_ATLAS_RENDERING_POSTURE}</p>
        <div className="discern-catalogue-glyph-fonts">
          {glyphBrowserFontRoles().map((role) => (
            <figure key={role.token}>
              <div
                aria-hidden="true"
                style={{ fontFamily: `var(${role.token})` } as CSSProperties}
              >
                {canonical.text}
              </div>
              <figcaption>
                {role.label} · <code>{role.token}</code>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="discern-catalogue-glyph-rendering-note">
          This is a live view of this browser and its available fonts, not a
          promise of cross-platform coverage, artwork, weight, or baseline.
        </p>
      </section>

      <section
        className="discern-catalogue-glyph-section"
        aria-labelledby="discern-glyph-guidance-title"
      >
        <h2 id="discern-glyph-guidance-title">Discern Glyphs guidance</h2>
        <p>{DISCERN_GLYPH_ACCESSIBILITY_POSTURE}</p>
        {aliases.length === 0
          ? <p>No curated Discern alias currently refers to this identity.</p>
          : aliases.map((alias) => (
            <AliasGuidance alias={alias} key={alias.name} />
          ))}
      </section>

      <nav
        className="discern-catalogue-glyph-pagination"
        aria-label="Glyph Atlas order"
      >
        {neighbours.previous === undefined
          ? <span />
          : (
            <Button href={href(neighbours.previous)} variant="secondary">
              ← {neighbours.previous.canonical.officialLabel}
            </Button>
          )}
        {neighbours.next === undefined
          ? <span />
          : (
            <Button href={href(neighbours.next)} variant="secondary">
              {neighbours.next.canonical.officialLabel} →
            </Button>
          )}
      </nav>
    </div>
  );
}
