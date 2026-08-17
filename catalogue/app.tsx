import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { ThemeSwitcher } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import type { ThemeSwitcherMode } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import { Kicker } from "../src/components/display/kicker/kicker.tsx";
import { CopyButton } from "../src/components/docs/copy-button/copy-button.tsx";
import { Kbd } from "../src/components/docs/kbd/kbd.tsx";
import {
  SearchPalette,
  SearchPaletteResult,
} from "../src/components/docs/search-palette/search-palette.tsx";
import { Tooltip } from "../src/components/feedback/tooltip/tooltip.tsx";
import { useInitialFragmentTarget } from "../src/components/use-initial-fragment-target.ts";
import type { TerminalThemeVariant } from "../src/cli/theme.ts";
import { allTokens, discernThemeTokens } from "../src/tokens/tokens.ts";
import {
  type CataloguePurpose,
  cataloguePurposes,
  type ComponentGroup,
  componentGroups,
} from "../src/types/component-meta.ts";
import { cliCompositionRecipes } from "./cli-compositions.ts";
import { type CompositionRecipe, compositionRecipes } from "./compositions.tsx";
import { CliComponentPreview } from "./cli-preview.tsx";
import { packageVersion, registry } from "./generated/registry.ts";
import type { RegistryEntry } from "./generated/registry.ts";
import {
  canonicalCatalogueLegacyUrl,
  catalogueComponentPath,
  catalogueGroupFromSlug,
  catalogueGroupSlug,
  catalogueRoute,
  catalogueRoutePaths,
} from "./routes.ts";
import type { CatalogueRoute } from "./routes.ts";
import { TerminalFoundationPreview } from "./terminal-foundation-preview.tsx";
import {
  terminalFoundationDestinations,
  terminalFoundationSheets,
} from "./terminal-foundations.ts";
import { TerminalLayoutRecipe } from "./terminal-layout-inspector.tsx";
import { useCatalogueTerminalTheme } from "./terminal-theme.ts";

type CatalogueSurface = "web" | "cli";

interface CatalogueSearchDestination {
  readonly href: string;
  readonly title: string;
  readonly context: string;
  readonly keywords: string;
  readonly revealsComponent?: true;
}

function catalogueSearchRank(
  destination: CatalogueSearchDestination,
  query: string,
): number {
  const title = destination.title.toLowerCase();
  if (title === query) return 0;
  if (title === `${query}s`) return 1;
  if (title.startsWith(query)) return 2;
  if (title.split(/\s+/).some((word) => word.startsWith(query))) return 3;
  if (title.includes(query)) return 4;
  return destination.keywords.toLowerCase().includes(query)
    ? 5
    : Number.POSITIVE_INFINITY;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function catalogueTheme(value: string | null): ThemeSwitcherMode | undefined {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : undefined;
}

function cataloguePurpose(
  value: string | null,
): CataloguePurpose | undefined {
  return cataloguePurposes.find((purpose) => purpose === value);
}

function catalogueSurface(value: string | null): CatalogueSurface {
  return value === "cli" ? "cli" : "web";
}

const purposeDetails = {
  "building-documentation": {
    label: "Building documentation",
    description: "Long-form guidance, reference, and documentation chrome.",
  },
  "displaying-tool-output": {
    label: "Displaying tool output",
    description: "Runs, diagnostics, artifacts, and machine evidence.",
  },
  "procedural-workflow": {
    label: "Procedural workflow",
    description: "Executable steps, choices, recovery, and proof.",
  },
  "marketing-site": {
    label: "Marketing site",
    description: "Product narrative, trust, comparison, and conversion.",
  },
} satisfies Record<
  CataloguePurpose,
  { readonly label: string; readonly description: string }
>;

function stateFragmentId(component: string, state: string): string {
  return `component-${component}--${state}`;
}

function groupComponentEntries(entries: readonly RegistryEntry[]) {
  return componentGroups.map((group) => ({
    group,
    entries: entries.filter(({ meta }) => meta.group === group),
  })).filter(({ entries: groupedEntries }) => groupedEntries.length);
}

const defaultAccentHue = Number(
  discernThemeTokens.find(({ name }) => name === "--discern-accent-hue")
    ?.value ?? "255",
);

function TokenPreview(
  { name, category }: { readonly name: string; readonly category: string },
) {
  if (category === "Color") {
    return (
      <span
        className="discern-catalogue-token__swatch"
        style={{ background: `var(${name})` }}
      />
    );
  }
  if (category === "Typography") {
    return (
      <span
        className="discern-catalogue-token__type"
        style={/^--discern-font-(?:display|body|mono|ui)$/.test(name)
          ? { fontFamily: `var(${name})` }
          : undefined}
      >
        {name === "--discern-font-mono" ? "discern" : "Aa"}
      </span>
    );
  }
  if (category === "Spacing" || category === "Layout") {
    return (
      <span
        className="discern-catalogue-token__space"
        style={{ width: `min(var(${name}), 100%)` }}
      />
    );
  }
  if (category === "Shape") {
    return (
      <span
        className="discern-catalogue-token__shape"
        style={name.includes("radius")
          ? { borderRadius: `var(${name})` }
          : { boxShadow: `var(${name})` }}
      />
    );
  }
  const isDuration = name.includes("duration");
  return (
    <span className="discern-catalogue-token__motion">
      <span
        style={isDuration
          ? { animationDuration: `var(${name})` }
          : { animationTimingFunction: `var(${name})` }}
      />
    </span>
  );
}

function CopyableCode(
  { label, value }: { readonly label: string; readonly value: string },
) {
  return (
    <div className="discern-catalogue-copyable">
      <span>{label}</span>
      <code>{value}</code>
      <CopyButton
        value={value}
        label={`Copy ${label.toLowerCase()}`}
        copiedLabel={`${label} copied`}
      />
    </div>
  );
}

function ComponentPreview(
  { entry, surface, terminalTheme, headingLevel = 4, onSurfaceChange }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly terminalTheme: TerminalThemeVariant;
    readonly headingLevel?: 1 | 3 | 4;
    readonly onSurfaceChange?: (surface: CatalogueSurface) => void;
  },
) {
  const {
    meta,
    states,
    conformance,
    selection,
    propDocumentation,
    variants,
  } = entry;
  const hasGuidance = Boolean(
    meta.useWhen?.length || meta.notWhen?.length || meta.accessibility?.length,
  );
  const cliUnavailableReason = entry.cli.stance === "exempt"
    ? entry.cli.reason
    : undefined;
  const resolvedSurface =
    surface === "cli" && cliUnavailableReason !== undefined ? "web" : surface;
  const sourceType = resolvedSurface === "web"
    ? "React"
    : entry.cli.stance === "rendered"
    ? "CLI"
    : "Metadata";
  const sourceExtension = resolvedSurface === "web"
    ? "tsx"
    : entry.cli.stance === "rendered"
    ? "cli.ts"
    : "meta.ts";
  const ComponentHeading = headingLevel === 1
    ? "h1"
    : headingLevel === 3
    ? "h3"
    : "h4";
  return (
    <article
      className="discern-catalogue-component"
      id={`component-${meta.slug}`}
      data-discern-component={meta.slug}
      data-discern-conformance-scenarios={JSON.stringify(conformance)}
    >
      <header>
        <div className="discern-catalogue-component__identity">
          <ComponentHeading>{meta.name}</ComponentHeading>
          <p>{meta.description}</p>
        </div>
        <div className="discern-catalogue-component__actions">
          {onSurfaceChange === undefined ? null : (
            <div
              className="discern-catalogue-component__surface-picker"
              role="group"
              aria-label={`${meta.name} preview surface`}
            >
              {(["web", "cli"] as const).map((candidate) => {
                if (
                  candidate === "cli" && cliUnavailableReason !== undefined
                ) {
                  return (
                    <Tooltip
                      label={cliUnavailableReason}
                      placement="bottom"
                      className="discern-catalogue-component__surface-unavailable"
                      key={candidate}
                    >
                      <span
                        tabIndex={0}
                        aria-label="CLI preview unavailable"
                      >
                        <button type="button" disabled>CLI</button>
                      </span>
                    </Tooltip>
                  );
                }
                return (
                  <button
                    type="button"
                    aria-pressed={resolvedSurface === candidate}
                    onClick={() => onSurfaceChange(candidate)}
                    key={candidate}
                  >
                    {candidate === "web" ? "Web" : "CLI"}
                  </button>
                );
              })}
            </div>
          )}
          <a
            href={`/catalogue/src/components/${meta.group.toLowerCase()}/${meta.slug}/${meta.slug}.${sourceExtension}`}
            target="_blank"
            aria-label={`${sourceType} source for ${meta.name}`}
          >
            Source ↗
          </a>
        </div>
      </header>
      {resolvedSurface === "cli"
        ? <CliComponentPreview entry={entry} theme={terminalTheme} />
        : (
          <div className="discern-catalogue-component__canvas">
            {states.map(({ name, label, Example }) => {
              const fragmentId = stateFragmentId(meta.slug, name);
              const showStateHeader = onSurfaceChange === undefined ||
                states.length !== 1 || name !== "default";
              return (
                <section
                  className="discern-catalogue-example-state"
                  id={fragmentId}
                  data-discern-example-state={name}
                  key={name}
                >
                  {showStateHeader
                    ? (
                      <header>
                        <h5>{label}</h5>
                        <a
                          href={`#${fragmentId}`}
                          aria-label={`Link to ${meta.name}: ${label}`}
                        >
                          #
                        </a>
                      </header>
                    )
                    : null}
                  <div className="discern-catalogue-example-state__canvas">
                    <Example />
                  </div>
                </section>
              );
            })}
          </div>
        )}
      {hasGuidance
        ? (
          <details className="discern-catalogue-guidance">
            <summary>Best practices</summary>
            <div>
              {meta.useWhen?.length
                ? (
                  <div>
                    <strong>Use when</strong>
                    <ul>
                      {meta.useWhen.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  </div>
                )
                : null}
              {meta.notWhen?.length
                ? (
                  <div>
                    <strong>Not when</strong>
                    <ul>
                      {meta.notWhen.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  </div>
                )
                : null}
              {meta.accessibility?.length
                ? (
                  <div>
                    <strong>Author responsibilities</strong>
                    <ul>
                      {meta.accessibility.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )
                : null}
            </div>
          </details>
        )
        : null}
      <details className="discern-catalogue-instrument">
        <summary>Selection and React import</summary>
        <div>
          <CopyableCode
            label="Component selection"
            value={selection.component}
          />
          <CopyableCode label="Group selection" value={selection.group} />
          <CopyableCode label="React import" value={selection.reactImport} />
        </div>
      </details>
      <details className="discern-catalogue-api">
        <summary>Props and variants</summary>
        <div>
          <h5>{propDocumentation.typeName}</h5>
          {propDocumentation.status === "available"
            ? (
              <>
                {propDocumentation.inheritedTypes.length
                  ? (
                    <p>
                      Also accepts{" "}
                      <code>{propDocumentation.inheritedTypes.join(", ")}
                      </code>.
                    </p>
                  )
                  : null}
                {propDocumentation.props.length
                  ? (
                    <div className="discern-catalogue-api__table">
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">Prop</th>
                            <th scope="col">Type</th>
                            <th scope="col">Requirement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {propDocumentation.props.map((prop) => (
                            <tr key={prop.name}>
                              <th scope="row">
                                <code>{prop.name}</code>
                                {prop.description
                                  ? <small>{prop.description}</small>
                                  : null}
                              </th>
                              <td>
                                <code>{prop.type}</code>
                              </td>
                              <td>{prop.required ? "Required" : "Optional"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                  : <p>No component-specific props.</p>}
              </>
            )
            : <p>{propDocumentation.reason}</p>}
          {variants.length
            ? (
              <div className="discern-catalogue-variants">
                {variants.map((variant) => (
                  <div key={variant.typeName}>
                    <strong>{variant.typeName}</strong>
                    <span>
                      {variant.values.map((value) => (
                        <code key={value}>{value}</code>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )
            : null}
        </div>
      </details>
    </article>
  );
}

function JourneyPreview({ recipe }: { readonly recipe: CompositionRecipe }) {
  const { id, title, description, journey, Example } = recipe;
  if (journey === undefined) return null;
  const titleId = `journey-${id}-title`;
  return (
    <section
      className="discern-catalogue-journey"
      data-discern-journey={id}
      data-discern-journey-stages={JSON.stringify(journey.stages)}
      aria-labelledby={titleId}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="discern-catalogue-journey__canvas">
        <Example />
      </div>
    </section>
  );
}

function catalogueHref(
  path: string,
  parameters: Readonly<Record<string, string | undefined>> = {},
): string {
  const url = new URL(path, "https://catalogue.invalid");
  for (const [name, value] of Object.entries(parameters)) {
    if (value === undefined) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  }
  return url.pathname + url.search + url.hash;
}

function componentGroupHref(group: ComponentGroup): string {
  return catalogueHref(catalogueRoutePaths.components, {
    group: catalogueGroupSlug(group),
  });
}

function componentPurposeHref(purpose: CataloguePurpose): string {
  return catalogueHref(catalogueRoutePaths.components, { purpose });
}

function reviewHref(
  {
    group,
    purpose,
    all,
    surface,
  }: {
    readonly group?: ComponentGroup | undefined;
    readonly purpose?: CataloguePurpose | undefined;
    readonly all?: boolean;
    readonly surface?: CatalogueSurface;
  },
): string {
  return catalogueHref(catalogueRoutePaths.review, {
    group: group === undefined ? undefined : catalogueGroupSlug(group),
    purpose,
    scope: all ? "all" : undefined,
    surface: surface === "cli" ? "cli" : undefined,
  });
}

function CataloguePageHeader(
  {
    index,
    eyebrow,
    title,
    description,
  }: {
    readonly index: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
  },
) {
  return (
    <header className="discern-catalogue-page__header">
      <Kicker index={index}>— {eyebrow}</Kicker>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

function CatalogueRouteCard(
  {
    href,
    eyebrow,
    title,
    description,
    count,
  }: {
    readonly href: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly count?: number | string;
  },
) {
  return (
    <a className="discern-catalogue-route-card" href={href}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {count === undefined ? null : <small>{count}</small>}
    </a>
  );
}

function OverviewPage() {
  return (
    <div className="discern-catalogue-page discern-catalogue-overview">
      <section className="discern-catalogue-hero">
        <span className="discern-kicker">
          <span className="discern-catalogue-live-dot" />
          <span className="discern-kicker__text">Generated reference</span>
        </span>
        <h1>
          Discern, built as a <em>system</em>.
        </h1>
        <p>
          Find the right primitive, inspect one complete contract, or open an
          explicit review sheet when the whole system needs comparison.
        </p>
        <div className="discern-catalogue-stats">
          <span>{allTokens.length} tokens</span>
          <span>{registry.length} components</span>
          <span>{componentGroups.length} groups</span>
        </div>
      </section>
      <section aria-labelledby="catalogue-explore-title">
        <div className="discern-catalogue-section__header">
          <div>
            <Kicker index="01">— Explore</Kicker>
            <h2 id="catalogue-explore-title">Choose the surface you need.</h2>
          </div>
          <p>
            Each route mounts only its own inventory. Complete comparison sheets
            live in Review rather than slowing every visit.
          </p>
        </div>
        <div className="discern-catalogue-route-grid">
          <CatalogueRouteCard
            href={catalogueRoutePaths.components}
            eyebrow="Browse"
            title="Components"
            description="Search by name, Group, or purpose, then inspect one complete Component contract."
            count={registry.length}
          />
          <CatalogueRouteCard
            href={catalogueRoutePaths.foundations}
            eyebrow="Reference"
            title="Foundations"
            description="Review public Tokens and the terminal foundation sheets derived from shared authorities."
            count={allTokens.length}
          />
          <CatalogueRouteCard
            href={catalogueRoutePaths.compositions}
            eyebrow="Patterns"
            title="Compositions"
            description="See source-backed browser recipes that join Components into reusable journeys."
            count={compositionRecipes.length}
          />
          <CatalogueRouteCard
            href={catalogueRoutePaths.terminal}
            eyebrow="Terminal"
            title="Terminal layouts"
            description="Inspect complete CLI frames at explicit terminal widths, with geometry and overflow evidence."
            count={cliCompositionRecipes.length}
          />
          <CatalogueRouteCard
            href={catalogueRoutePaths.review}
            eyebrow="Compare"
            title="Review mode"
            description="Choose a Group, purpose collection, or the complete system before mounting comparison sheets."
            count="Explicit scope"
          />
        </div>
      </section>
    </div>
  );
}

function FoundationsPage(
  {
    tokens,
    tokenCategories,
    terminalTheme,
  }: {
    readonly tokens: typeof allTokens;
    readonly tokenCategories: readonly string[];
    readonly terminalTheme: TerminalThemeVariant;
  },
) {
  return (
    <div className="discern-catalogue-page" id="foundations">
      <CataloguePageHeader
        index="01"
        eyebrow="Foundations"
        title="One value, every surface."
        description="Token and terminal-foundation inventories are each authored once and projected into every applicable review surface."
      />
      {tokenCategories.map((category) => {
        const categoryTokens = tokens.filter((token) =>
          token.category === category
        );
        return (
          <section
            className="discern-catalogue-subsection"
            id={"tokens-" + slugify(category)}
            key={category}
          >
            <div className="discern-catalogue-subsection__heading">
              <h2>{category}</h2>
              <span>{categoryTokens.length}</span>
            </div>
            <div className="discern-catalogue-token-grid">
              {categoryTokens.map((token) => (
                <article
                  className="discern-catalogue-token"
                  key={token.name}
                >
                  <TokenPreview
                    name={token.name}
                    category={token.category}
                  />
                  <div>
                    <code>{token.name}</code>
                    <p>{token.description}</p>
                    <code className="discern-catalogue-token__value">
                      {"light" in token
                        ? token.light + " / " + token.dark
                        : token.value}
                    </code>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
      {terminalFoundationSheets.map((sheet) => (
        <TerminalFoundationPreview
          sheet={sheet}
          theme={terminalTheme}
          key={sheet.id}
        />
      ))}
    </div>
  );
}

function CompositionsPage() {
  return (
    <div className="discern-catalogue-page" id="compositions">
      <CataloguePageHeader
        index="02"
        eyebrow="Compositions"
        title="Components working together."
        description="Catalogue-only recipes join existing Components into repeatable documentation and tool-output patterns."
      />
      <div className="discern-catalogue-recipes">
        {compositionRecipes.map((
          { id, title, description, journey, Example, source },
        ) => (
          <section
            className="discern-catalogue-recipe"
            id={"recipe-" + id}
            data-discern-journey={journey === undefined ? undefined : id}
            data-discern-journey-stages={journey === undefined
              ? undefined
              : JSON.stringify(journey.stages)}
            key={id}
          >
            <header>
              <h2>{title}</h2>
              <p>{description}</p>
            </header>
            <div className="discern-catalogue-recipe__preview">
              <Example />
            </div>
            <details className="discern-catalogue-recipe__source">
              <summary>Copy recipe source</summary>
              <CopyableCode label="Recipe source" value={source} />
            </details>
          </section>
        ))}
      </div>
    </div>
  );
}

function TerminalPage(
  { terminalTheme }: { readonly terminalTheme: TerminalThemeVariant },
) {
  return (
    <div className="discern-catalogue-page" id="terminal-layouts">
      <CataloguePageHeader
        index="03"
        eyebrow="Terminal layouts"
        title="See the frame, not just the text."
        description="Complete CLI compositions render through explicit terminal geometry, with rulers, a viewport fold, overflow facts, and advisory review cues."
      />
      <h2 className="discern-visually-hidden">Terminal layout recipes</h2>
      <div className="discern-catalogue-terminal-layouts">
        {cliCompositionRecipes.map((recipe) => (
          <TerminalLayoutRecipe
            recipe={recipe}
            theme={terminalTheme}
            key={recipe.id}
          />
        ))}
      </div>
    </div>
  );
}

function ComponentIndexPage(
  { sortedComponents }: { readonly sortedComponents: readonly RegistryEntry[] },
) {
  const initialParameters = useMemo(
    () => new URLSearchParams(globalThis.location.search),
    [],
  );
  const initialGroup = catalogueGroupFromSlug(
    initialParameters.get("group"),
  );
  const initialPurpose = cataloguePurpose(initialParameters.get("purpose"));
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ComponentGroup | undefined>(initialGroup);
  const [purpose, setPurpose] = useState<CataloguePurpose | undefined>(
    initialPurpose,
  );
  const [showAll, setShowAll] = useState(
    initialParameters.get("all") === "1" ||
      initialGroup !== undefined ||
      initialPurpose !== undefined,
  );

  const syncFilters = (
    nextGroup: ComponentGroup | undefined,
    nextPurpose: CataloguePurpose | undefined,
    nextShowAll: boolean,
  ): void => {
    const url = new URL(globalThis.location.href);
    url.pathname = catalogueRoutePaths.components;
    url.hash = "";
    if (nextGroup === undefined) url.searchParams.delete("group");
    else url.searchParams.set("group", catalogueGroupSlug(nextGroup));
    if (nextPurpose === undefined) url.searchParams.delete("purpose");
    else url.searchParams.set("purpose", nextPurpose);
    if (nextShowAll && nextGroup === undefined && nextPurpose === undefined) {
      url.searchParams.set("all", "1");
    } else {
      url.searchParams.delete("all");
    }
    globalThis.history.replaceState(null, "", url);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredComponents = sortedComponents.filter(({ meta }) => {
    if (group !== undefined && meta.group !== group) return false;
    if (purpose !== undefined && !meta.purposes?.includes(purpose)) {
      return false;
    }
    if (normalizedQuery === "") return true;
    return [
      meta.name,
      meta.group,
      meta.description,
      ...(meta.purposes ?? []),
      ...(meta.useWhen ?? []),
      ...(meta.notWhen ?? []),
    ].join(" ").toLowerCase().includes(normalizedQuery);
  });
  const resultsVisible = showAll || group !== undefined ||
    purpose !== undefined || normalizedQuery !== "";

  const clearFilters = (): void => {
    setQuery("");
    setGroup(undefined);
    setPurpose(undefined);
    setShowAll(false);
    syncFilters(undefined, undefined, false);
  };

  return (
    <div className="discern-catalogue-page" id="components">
      <CataloguePageHeader
        index="04"
        eyebrow="Components"
        title="Find one Component, then inspect it fully."
        description="Browse generated Groups and task-oriented collections without mounting every specimen, API table, and disclosure at once."
      />
      <div className="discern-catalogue-explorer-controls">
        <label>
          <span>Search Components</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Name, description, or guidance"
          />
        </label>
        <label>
          <span>Group</span>
          <select
            value={group === undefined ? "" : catalogueGroupSlug(group)}
            onChange={(event) => {
              const next = catalogueGroupFromSlug(event.currentTarget.value);
              setGroup(next);
              setShowAll(true);
              syncFilters(next, purpose, true);
            }}
          >
            <option value="">All Groups</option>
            {componentGroups.map((candidate) => (
              <option
                value={catalogueGroupSlug(candidate)}
                key={candidate}
              >
                {candidate}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Purpose</span>
          <select
            value={purpose ?? ""}
            onChange={(event) => {
              const next = cataloguePurpose(event.currentTarget.value);
              setPurpose(next);
              setShowAll(true);
              syncFilters(group, next, true);
            }}
          >
            <option value="">All purposes</option>
            {cataloguePurposes.map((candidate) => (
              <option value={candidate} key={candidate}>
                {purposeDetails[candidate].label}
              </option>
            ))}
          </select>
        </label>
        {resultsVisible
          ? (
            <button type="button" onClick={clearFilters}>
              Reset
            </button>
          )
          : (
            <button
              type="button"
              onClick={() => {
                setShowAll(true);
                syncFilters(undefined, undefined, true);
              }}
            >
              Show all {sortedComponents.length}
            </button>
          )}
      </div>

      {resultsVisible
        ? (
          <section aria-labelledby="component-results-title">
            <div className="discern-catalogue-results-header">
              <h2 id="component-results-title">
                {group ?? (purpose === undefined
                  ? "Component results"
                  : purposeDetails[purpose].label)}
              </h2>
              <p aria-live="polite">
                {filteredComponents.length}{" "}
                Component{filteredComponents.length === 1 ? "" : "s"}
              </p>
            </div>
            {filteredComponents.length === 0
              ? (
                <div className="discern-catalogue-empty">
                  <h3>No Components match these filters.</h3>
                  <p>Reset the collection or try a broader search term.</p>
                </div>
              )
              : (
                <div className="discern-catalogue-component-index">
                  {filteredComponents.map(({ meta, cli }) => (
                    <a
                      className="discern-catalogue-component-link"
                      href={catalogueComponentPath(meta.slug)}
                      key={meta.slug}
                    >
                      <span>{meta.group}</span>
                      <h3>{meta.name}</h3>
                      <p>{meta.description}</p>
                      <small>
                        {cli.stance === "rendered" ? "Web + CLI" : "Web"}
                      </small>
                    </a>
                  ))}
                </div>
              )}
          </section>
        )
        : (
          <>
            <section aria-labelledby="component-groups-title">
              <div className="discern-catalogue-results-header">
                <h2 id="component-groups-title">Browse by Group</h2>
                <p>{componentGroups.length} generated Groups</p>
              </div>
              <div className="discern-catalogue-route-grid">
                {groupComponentEntries(sortedComponents).map((
                  { group: candidate, entries },
                ) => (
                  <CatalogueRouteCard
                    href={componentGroupHref(candidate)}
                    eyebrow="Group"
                    title={candidate}
                    description={entries.slice(0, 4).map(({ meta }) =>
                      meta.name
                    ).join(", ")}
                    count={entries.length}
                    key={candidate}
                  />
                ))}
              </div>
            </section>
            <section
              className="discern-catalogue-collections"
              aria-labelledby="component-purposes-title"
            >
              <div className="discern-catalogue-results-header">
                <h2 id="component-purposes-title">Browse by purpose</h2>
                <p>Task-oriented collections</p>
              </div>
              <div className="discern-catalogue-route-grid">
                {cataloguePurposes.map((candidate) => (
                  <CatalogueRouteCard
                    href={componentPurposeHref(candidate)}
                    eyebrow="Purpose"
                    title={purposeDetails[candidate].label}
                    description={purposeDetails[candidate].description}
                    count={sortedComponents.filter(({ meta }) =>
                      meta.purposes?.includes(candidate)
                    ).length}
                    key={candidate}
                  />
                ))}
              </div>
            </section>
          </>
        )}
    </div>
  );
}

function ComponentDetailPage(
  {
    entry,
    surface,
    terminalTheme,
    onSurfaceChange,
  }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly terminalTheme: TerminalThemeVariant;
    readonly onSurfaceChange: (surface: CatalogueSurface) => void;
  },
) {
  return (
    <div className="discern-catalogue-page discern-catalogue-detail">
      <nav className="discern-catalogue-breadcrumb" aria-label="Breadcrumb">
        <a href={catalogueRoutePaths.components}>Components</a>
        <span aria-hidden="true">/</span>
        <a href={componentGroupHref(entry.meta.group)}>{entry.meta.group}</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{entry.meta.name}</span>
      </nav>
      <ComponentPreview
        entry={entry}
        surface={surface}
        terminalTheme={terminalTheme}
        headingLevel={1}
        onSurfaceChange={onSurfaceChange}
      />
      <nav
        className="discern-catalogue-detail__continuation"
        aria-label="Component continuation"
      >
        <a href={componentGroupHref(entry.meta.group)}>
          Browse {entry.meta.group}
        </a>
        <a href={reviewHref({ group: entry.meta.group })}>
          Review the whole Group
        </a>
      </nav>
    </div>
  );
}

function ReviewLanding(
  { sortedComponents }: { readonly sortedComponents: readonly RegistryEntry[] },
) {
  return (
    <div className="discern-catalogue-page">
      <CataloguePageHeader
        index="05"
        eyebrow="Review"
        title="Choose what to compare."
        description="Review mode deliberately mounts complete Component specimens. Start with a bounded Group or purpose collection; open the full system only when the task genuinely needs it."
      />
      <section aria-labelledby="review-groups-title">
        <div className="discern-catalogue-results-header">
          <h2 id="review-groups-title">Review a Group</h2>
          <p>Bounded comparison sheets</p>
        </div>
        <div className="discern-catalogue-route-grid">
          {groupComponentEntries(sortedComponents).map((
            { group, entries },
          ) => (
            <CatalogueRouteCard
              href={reviewHref({ group })}
              eyebrow="Review Group"
              title={group}
              description={"Mount " + entries.length +
                " complete specimens with their Web and CLI controls."}
              count={entries.length}
              key={group}
            />
          ))}
        </div>
      </section>
      <section
        className="discern-catalogue-collections"
        aria-labelledby="review-purposes-title"
      >
        <div className="discern-catalogue-results-header">
          <h2 id="review-purposes-title">Review by purpose</h2>
          <p>Cross-Group collections</p>
        </div>
        <div className="discern-catalogue-route-grid">
          {cataloguePurposes.map((purpose) => {
            const count = sortedComponents.filter(({ meta }) =>
              meta.purposes?.includes(purpose)
            ).length;
            return (
              <CatalogueRouteCard
                href={reviewHref({ purpose })}
                eyebrow="Review purpose"
                title={purposeDetails[purpose].label}
                description={purposeDetails[purpose].description}
                count={count}
                key={purpose}
              />
            );
          })}
          <CatalogueRouteCard
            href={reviewHref({ all: true })}
            eyebrow="Exhaustive"
            title="Complete system"
            description="Mount every generated Component specimen. This is intentionally the heaviest human review surface."
            count={sortedComponents.length}
          />
        </div>
      </section>
    </div>
  );
}

function ReviewPage(
  {
    sortedComponents,
    defaultSurface,
    componentSurfaces,
    terminalTheme,
    onSurfaceChange,
  }: {
    readonly sortedComponents: readonly RegistryEntry[];
    readonly defaultSurface: CatalogueSurface;
    readonly componentSurfaces: Readonly<Record<string, CatalogueSurface>>;
    readonly terminalTheme: TerminalThemeVariant;
    readonly onSurfaceChange: (
      slug: string,
      surface: CatalogueSurface,
    ) => void;
  },
) {
  const parameters = new URLSearchParams(globalThis.location.search);
  const group = catalogueGroupFromSlug(parameters.get("group"));
  const purpose = cataloguePurpose(parameters.get("purpose"));
  const all = parameters.get("scope") === "all";
  if (!all && group === undefined && purpose === undefined) {
    return <ReviewLanding sortedComponents={sortedComponents} />;
  }

  const components = sortedComponents.filter(({ meta }) =>
    (group === undefined || meta.group === group) &&
    (purpose === undefined || meta.purposes?.includes(purpose))
  );
  const groupedComponents = groupComponentEntries(components);
  const scopeValue = all
    ? "all"
    : group !== undefined
    ? "group:" + catalogueGroupSlug(group)
    : "purpose:" + purpose;
  const scopeTitle = all
    ? "Complete system"
    : group ?? purposeDetails[purpose as CataloguePurpose].label;

  const changeScope = (value: string): void => {
    if (value === "all") {
      globalThis.location.assign(
        reviewHref({ all: true, surface: defaultSurface }),
      );
      return;
    }
    const [kind, selection] = value.split(":", 2);
    if (kind === "group") {
      const nextGroup = catalogueGroupFromSlug(selection ?? null);
      if (nextGroup !== undefined) {
        globalThis.location.assign(
          reviewHref({ group: nextGroup, surface: defaultSurface }),
        );
      }
      return;
    }
    const nextPurpose = cataloguePurpose(selection ?? null);
    if (nextPurpose !== undefined) {
      globalThis.location.assign(
        reviewHref({ purpose: nextPurpose, surface: defaultSurface }),
      );
    }
  };

  return (
    <div className="discern-catalogue-page discern-catalogue-review">
      <CataloguePageHeader
        index="05"
        eyebrow="Review"
        title={scopeTitle}
        description={"This explicit review sheet mounts " + components.length +
          " complete Component contract" +
          (components.length === 1 ? "." : "s.")}
      />
      <div className="discern-catalogue-review-controls">
        <label>
          <span>Review scope</span>
          <select
            value={scopeValue}
            onChange={(event) => changeScope(event.currentTarget.value)}
          >
            <option value="all">
              Complete system ({sortedComponents.length})
            </option>
            <optgroup label="Groups">
              {componentGroups.map((candidate) => (
                <option
                  value={"group:" + catalogueGroupSlug(candidate)}
                  key={candidate}
                >
                  {candidate} ({sortedComponents.filter(({ meta }) =>
                    meta.group === candidate
                  ).length})
                </option>
              ))}
            </optgroup>
            <optgroup label="Purposes">
              {cataloguePurposes.map((candidate) => (
                <option value={"purpose:" + candidate} key={candidate}>
                  {purposeDetails[candidate].label}{" "}
                  ({sortedComponents.filter(({ meta }) =>
                    meta.purposes?.includes(candidate)
                  ).length})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <div>
          <span>Initial surface</span>
          <div className="discern-catalogue-review-surfaces">
            <a
              href={reviewHref({ group, purpose, all, surface: "web" })}
              aria-current={defaultSurface === "web" ? "page" : undefined}
            >
              Web
            </a>
            <a
              href={reviewHref({ group, purpose, all, surface: "cli" })}
              aria-current={defaultSurface === "cli" ? "page" : undefined}
            >
              CLI
            </a>
          </div>
        </div>
        <a
          className="discern-catalogue-review-controls__exit"
          href={catalogueRoutePaths.review}
        >
          Change scope
        </a>
      </div>
      {groupedComponents.map(({ group: candidate, entries }) => (
        <section
          className="discern-catalogue-component-group"
          id={"group-" + catalogueGroupSlug(candidate)}
          key={candidate}
        >
          <div className="discern-catalogue-subsection__heading">
            <h2>{candidate}</h2>
            <span>{entries.length}</span>
          </div>
          {entries.map((entry) => (
            <ComponentPreview
              entry={entry}
              surface={componentSurfaces[entry.meta.slug] ?? defaultSurface}
              terminalTheme={terminalTheme}
              headingLevel={3}
              onSurfaceChange={(next) => onSurfaceChange(entry.meta.slug, next)}
              key={entry.meta.slug}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="discern-catalogue-page">
      <CataloguePageHeader
        index="404"
        eyebrow="Not found"
        title="That Catalogue destination does not exist."
        description="Use the Component explorer or global search to find the generated destination you need."
      />
      <a className="discern-button" href={catalogueRoutePaths.components}>
        Browse Components
      </a>
    </div>
  );
}

function CatalogueSidebar(
  {
    route,
    sortedComponents,
    tokenCategories,
    onNavigate,
  }: {
    readonly route: CatalogueRoute;
    readonly sortedComponents: readonly RegistryEntry[];
    readonly tokenCategories: readonly string[];
    readonly onNavigate: () => void;
  },
) {
  const componentEntry = route.kind === "component"
    ? sortedComponents.find(({ meta }) => meta.slug === route.slug)
    : undefined;
  const groupEntries = componentEntry === undefined
    ? []
    : sortedComponents.filter(({ meta }) =>
      meta.group === componentEntry.meta.group
    );
  const topRoutes = [
    { kind: "overview", label: "Overview", href: catalogueRoutePaths.overview },
    {
      kind: "foundations",
      label: "Foundations",
      href: catalogueRoutePaths.foundations,
    },
    {
      kind: "components",
      label: "Components",
      href: catalogueRoutePaths.components,
    },
    {
      kind: "compositions",
      label: "Compositions",
      href: catalogueRoutePaths.compositions,
    },
    {
      kind: "terminal",
      label: "Terminal",
      href: catalogueRoutePaths.terminal,
    },
    { kind: "review", label: "Review", href: catalogueRoutePaths.review },
  ] as const;

  return (
    <>
      <div className="discern-catalogue-sidebar__header">
        <a
          className="discern-catalogue-brand"
          href={catalogueRoutePaths.overview}
          onClick={onNavigate}
        >
          <span className="discern-catalogue-brand__mark" aria-hidden="true">
            ◮
          </span>
          <span>
            <strong>discern</strong>
            <small>Design system</small>
          </span>
        </a>
        <button
          className="discern-catalogue-sidebar__close"
          type="button"
          aria-label="Close Catalogue navigation"
          onClick={onNavigate}
        >
          ×
        </button>
      </div>
      <nav className="discern-catalogue-nav" aria-label="Catalogue">
        {topRoutes.map((item) => {
          const active = item.kind === "components"
            ? route.kind === "components" || route.kind === "component"
            : route.kind === item.kind;
          return (
            <a
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              key={item.kind}
            >
              {item.label}
            </a>
          );
        })}

        {route.kind === "foundations"
          ? (
            <>
              <span className="discern-catalogue-nav__heading">
                On this page
              </span>
              {tokenCategories.map((category) => (
                <a
                  className="discern-catalogue-nav__child"
                  href={"#tokens-" + slugify(category)}
                  onClick={onNavigate}
                  key={category}
                >
                  {category}
                </a>
              ))}
              {terminalFoundationSheets.map((sheet) => (
                <a
                  className="discern-catalogue-nav__child"
                  href={"#terminal-foundation-" + sheet.id}
                  onClick={onNavigate}
                  key={sheet.id}
                >
                  {sheet.title}
                </a>
              ))}
            </>
          )
          : null}

        {route.kind === "components"
          ? (
            <>
              <span className="discern-catalogue-nav__heading">Groups</span>
              {groupComponentEntries(sortedComponents).map((
                { group, entries },
              ) => (
                <a
                  className="discern-catalogue-nav__child"
                  href={componentGroupHref(group)}
                  onClick={onNavigate}
                  key={group}
                >
                  {group}
                  <small>{entries.length}</small>
                </a>
              ))}
              <span className="discern-catalogue-nav__heading">Purposes</span>
              {cataloguePurposes.map((purpose) => (
                <a
                  className="discern-catalogue-nav__child"
                  href={componentPurposeHref(purpose)}
                  onClick={onNavigate}
                  key={purpose}
                >
                  {purposeDetails[purpose].label}
                </a>
              ))}
            </>
          )
          : null}

        {componentEntry === undefined ? null : (
          <>
            <span className="discern-catalogue-nav__heading">
              {componentEntry.meta.group}
            </span>
            {groupEntries.map(({ meta }) => (
              <a
                className="discern-catalogue-nav__child"
                href={catalogueComponentPath(meta.slug)}
                aria-current={meta.slug === componentEntry.meta.slug
                  ? "page"
                  : undefined}
                onClick={onNavigate}
                key={meta.slug}
              >
                {meta.name}
              </a>
            ))}
          </>
        )}

        {route.kind === "compositions"
          ? (
            <>
              <span className="discern-catalogue-nav__heading">
                Recipes
              </span>
              {compositionRecipes.map((recipe) => (
                <a
                  className="discern-catalogue-nav__child"
                  href={"#recipe-" + recipe.id}
                  onClick={onNavigate}
                  key={recipe.id}
                >
                  {recipe.title}
                </a>
              ))}
            </>
          )
          : null}

        {route.kind === "terminal"
          ? (
            <>
              <span className="discern-catalogue-nav__heading">
                Layouts
              </span>
              {cliCompositionRecipes.map((recipe) => (
                <a
                  className="discern-catalogue-nav__child"
                  href={"#terminal-layout-" + recipe.id}
                  onClick={onNavigate}
                  key={recipe.id}
                >
                  {recipe.title}
                </a>
              ))}
            </>
          )
          : null}

        {route.kind === "review"
          ? (
            <>
              <span className="discern-catalogue-nav__heading">
                Review Groups
              </span>
              {groupComponentEntries(sortedComponents).map((
                { group, entries },
              ) => (
                <a
                  className="discern-catalogue-nav__child"
                  href={reviewHref({ group })}
                  onClick={onNavigate}
                  key={group}
                >
                  {group}
                  <small>{entries.length}</small>
                </a>
              ))}
              <a
                className="discern-catalogue-nav__child"
                href={reviewHref({ all: true })}
                onClick={onNavigate}
              >
                Complete system
                <small>{sortedComponents.length}</small>
              </a>
            </>
          )
          : null}
      </nav>
    </>
  );
}

function App() {
  useInitialFragmentTarget();
  const currentUrl = useMemo(
    () => new URL(globalThis.location.href),
    [],
  );
  const parameters = currentUrl.searchParams;
  const route = catalogueRoute(currentUrl);
  const requestedTheme = parameters.get("theme");
  const requestedSurface = parameters.get("surface");
  const conformanceMode = parameters.get("conformance") === "1";
  const selectedComponent = parameters.get("component");
  const [theme, setTheme] = useState<ThemeSwitcherMode>(() =>
    catalogueTheme(requestedTheme) ??
      catalogueTheme(localStorage.getItem("discern-catalogue-theme")) ??
      "system"
  );
  const terminalTheme = useCatalogueTerminalTheme(theme);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const defaultSurface = catalogueSurface(requestedSurface);
  const [componentSurfaces, setComponentSurfaces] = useState<
    Readonly<Record<string, CatalogueSurface>>
  >({});
  const [accentHue, setAccentHue] = useState(defaultAccentHue);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  useEffect(() => {
    const openSearch = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) return;
      event.preventDefault();
      setSearchOpen(true);
    };
    document.addEventListener("keydown", openSearch);
    return () => document.removeEventListener("keydown", openSearch);
  }, []);

  const sortedComponents = useMemo(() =>
    registry
      .slice()
      .sort((a, b) =>
        componentGroups.indexOf(a.meta.group) -
          componentGroups.indexOf(b.meta.group) ||
        a.meta.order - b.meta.order
      ), []);
  const conformanceComponents = useMemo(
    () =>
      sortedComponents.filter(({ meta }) =>
        !selectedComponent || meta.slug === selectedComponent
      ),
    [selectedComponent, sortedComponents],
  );
  const tokenCategories = [
    ...new Set(allTokens.map((token) => token.category)),
  ];

  const searchDestinations = useMemo<CatalogueSearchDestination[]>(() => [
    {
      href: catalogueRoutePaths.components,
      title: "Components",
      context: "Catalogue route",
      keywords: "browse search Groups purposes",
    },
    {
      href: catalogueRoutePaths.foundations,
      title: "Foundations",
      context: "Catalogue route",
      keywords: "Tokens terminal motifs narration",
    },
    {
      href: catalogueRoutePaths.compositions,
      title: "Compositions",
      context: "Catalogue route",
      keywords: "recipes journeys browser",
    },
    {
      href: catalogueRoutePaths.terminal,
      title: "Terminal layouts",
      context: "Catalogue route",
      keywords: "CLI frames geometry",
    },
    {
      href: catalogueRoutePaths.review,
      title: "Review mode",
      context: "Catalogue route",
      keywords: "compare Group purpose complete inventory",
    },
    ...sortedComponents.map(({ meta }) => ({
      href: catalogueComponentPath(meta.slug),
      title: meta.name,
      context: "Component · " + meta.group,
      keywords: [
        meta.name,
        meta.group,
        meta.description,
        ...(meta.purposes ?? []),
        ...(meta.useWhen ?? []),
        ...(meta.notWhen ?? []),
      ].join(" "),
    })),
    ...allTokens.map((token) => ({
      href: catalogueRoutePaths.foundations +
        "#tokens-" + slugify(token.category),
      title: token.name,
      context: "Token · " + token.category,
      keywords: token.name + " " + token.category + " " + token.description,
    })),
    ...terminalFoundationDestinations().map((destination) => ({
      ...destination,
      href: catalogueRoutePaths.foundations + destination.href,
    })),
    ...compositionRecipes.map((recipe) => ({
      href: catalogueRoutePaths.compositions + "#recipe-" + recipe.id,
      title: recipe.title,
      context: "Composition",
      keywords: recipe.title + " " + recipe.description,
    })),
    ...cliCompositionRecipes.map((recipe) => ({
      href: catalogueRoutePaths.terminal + "#terminal-layout-" + recipe.id,
      title: recipe.title,
      context: "Terminal composition",
      keywords: recipe.title + " " + recipe.description + " " +
        recipe.components.join(" ") + " terminal layout CLI",
    })),
  ], [sortedComponents]);
  const searchResults = useMemo(
    () =>
      normalizedSearchQuery === "" ? [] : searchDestinations
        .map((destination) => ({
          destination,
          rank: catalogueSearchRank(destination, normalizedSearchQuery),
        }))
        .filter(({ rank }) => Number.isFinite(rank))
        .sort((left, right) =>
          left.rank - right.rank ||
          left.destination.title.localeCompare(right.destination.title)
        )
        .slice(0, 30)
        .map(({ destination }) => destination),
    [normalizedSearchQuery, searchDestinations],
  );

  const changeTheme = (next: ThemeSwitcherMode) => {
    setTheme(next);
    if (next === "system") {
      localStorage.removeItem("discern-catalogue-theme");
    } else {
      localStorage.setItem("discern-catalogue-theme", next);
    }
  };

  const changeComponentSurface = (
    slug: string,
    next: CatalogueSurface,
  ): void => {
    setComponentSurfaces((current) => ({ ...current, [slug]: next }));
  };

  const closeSearch = (): void => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  if (conformanceMode) {
    return (
      <main
        className="discern-catalogue-conformance"
        data-discern-root
        data-discern-theme={theme}
        data-discern-conformance-ready="true"
      >
        <h1 className="discern-visually-hidden">
          Discern component conformance sheet
        </h1>
        <p className="discern-catalogue-conformance__identity">
          @discern-sh/design-system v{packageVersion}
        </p>
        {selectedComponent === null
          ? compositionRecipes.map((recipe) => (
            <JourneyPreview recipe={recipe} key={recipe.id} />
          ))
          : null}
        {conformanceComponents.map((entry) => (
          <ComponentPreview
            entry={entry}
            surface="web"
            terminalTheme={terminalTheme}
            key={entry.meta.slug}
          />
        ))}
      </main>
    );
  }

  const page = (() => {
    switch (route.kind) {
      case "overview":
        return <OverviewPage />;
      case "foundations":
        return (
          <FoundationsPage
            tokens={allTokens}
            tokenCategories={tokenCategories}
            terminalTheme={terminalTheme}
          />
        );
      case "components":
        return <ComponentIndexPage sortedComponents={sortedComponents} />;
      case "component": {
        const entry = sortedComponents.find(({ meta }) =>
          meta.slug === route.slug
        );
        return entry === undefined ? <NotFoundPage /> : (
          <ComponentDetailPage
            entry={entry}
            surface={componentSurfaces[entry.meta.slug] ?? defaultSurface}
            terminalTheme={terminalTheme}
            onSurfaceChange={(next) =>
              changeComponentSurface(entry.meta.slug, next)}
          />
        );
      }
      case "compositions":
        return <CompositionsPage />;
      case "terminal":
        return <TerminalPage terminalTheme={terminalTheme} />;
      case "review":
        return (
          <ReviewPage
            sortedComponents={sortedComponents}
            defaultSurface={defaultSurface}
            componentSurfaces={componentSurfaces}
            terminalTheme={terminalTheme}
            onSurfaceChange={changeComponentSurface}
          />
        );
      case "not-found":
        return <NotFoundPage />;
    }
  })();

  return (
    <div
      className="discern-catalogue-shell"
      data-discern-root
      data-discern-theme={theme}
      data-discern-theme-consumer=""
      data-discern-theme-control=".discern-catalogue-toolbar .discern-theme-switcher"
      data-discern-theme-storage-key="discern-catalogue-theme"
      style={{ "--discern-accent-hue": accentHue } as CSSProperties}
    >
      <aside
        className="discern-catalogue-sidebar"
        data-discern-open={mobileNavOpen ? "true" : undefined}
      >
        <CatalogueSidebar
          route={route}
          sortedComponents={sortedComponents}
          tokenCategories={tokenCategories}
          onNavigate={() => setMobileNavOpen(false)}
        />
      </aside>
      {mobileNavOpen
        ? (
          <button
            className="discern-catalogue-nav-backdrop"
            type="button"
            aria-label="Close Catalogue navigation"
            onClick={() => setMobileNavOpen(false)}
          />
        )
        : null}

      <header className="discern-catalogue-toolbar">
        <button
          className="discern-catalogue-menu"
          type="button"
          aria-label="Open Catalogue navigation"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen(true)}
        >
          ☰
        </button>
        <button
          className="discern-catalogue-search"
          type="button"
          aria-haspopup="dialog"
          onClick={() => setSearchOpen(true)}
        >
          <span aria-hidden="true">⌕</span>
          <span>Search the Catalogue</span>
          <Kbd>/</Kbd>
        </button>
        <span className="discern-catalogue-version">
          <span>@discern-sh/design-system</span> v{packageVersion}
        </span>
        <ThemeSwitcher
          className="discern-catalogue-theme"
          mode={theme}
          onModeChange={changeTheme}
          label="Catalogue colour theme"
        />
        <label className="discern-catalogue-accent">
          <span
            className="discern-catalogue-accent__swatch"
            aria-hidden="true"
          />
          <span className="discern-catalogue-accent__label">Accent</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={accentHue}
            onInput={(event) => setAccentHue(event.currentTarget.valueAsNumber)}
            aria-label="Accent hue"
          />
          <output>{accentHue}°</output>
        </label>
      </header>

      <SearchPalette
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) setSearchQuery("");
        }}
        value={searchQuery}
        onValueChange={setSearchQuery}
        label="Search the Catalogue"
        placeholder="Search components, foundations, tokens, and compositions"
        icon={<span>⌕</span>}
        hint={
          <span>
            <Kbd>Esc</Kbd> close
          </span>
        }
      >
        {normalizedSearchQuery === ""
          ? (
            <p className="discern-search-palette__empty">
              Search by Component name, purpose, guidance, foundation, Token, or
              Composition.
            </p>
          )
          : searchResults.length === 0
          ? (
            <p className="discern-search-palette__empty">
              No matches for “{searchQuery}”.
            </p>
          )
          : (
            <ul className="discern-search-palette__list">
              {searchResults.map((destination) => (
                <li key={destination.href + ":" + destination.title}>
                  <SearchPaletteResult
                    href={destination.href}
                    title={destination.title}
                    context={destination.context}
                    onClick={closeSearch}
                  />
                </li>
              ))}
            </ul>
          )}
      </SearchPalette>

      <main className="discern-catalogue-main">{page}</main>
    </div>
  );
}

const requestedCatalogueUrl = new URL(globalThis.location.href);
const canonicalCatalogueUrl = canonicalCatalogueLegacyUrl(
  requestedCatalogueUrl,
);
if (canonicalCatalogueUrl.href !== requestedCatalogueUrl.href) {
  globalThis.history.replaceState(null, "", canonicalCatalogueUrl);
}

const root = document.getElementById("root");
if (!root) throw new Error("Catalogue root is missing");
createRoot(root).render(<App />);
