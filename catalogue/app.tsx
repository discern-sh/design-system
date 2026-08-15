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
  componentGroups,
} from "../src/types/component-meta.ts";
import { cliCompositionRecipes } from "./cli-compositions.ts";
import { type CompositionRecipe, compositionRecipes } from "./compositions.tsx";
import { CliComponentPreview } from "./cli-preview.tsx";
import { packageVersion, registry } from "./generated/registry.ts";
import type { RegistryEntry } from "./generated/registry.ts";
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
  { entry, surface, terminalTheme, onSurfaceChange }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly terminalTheme: TerminalThemeVariant;
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
  return (
    <article
      className="discern-catalogue-component"
      id={`component-${meta.slug}`}
      data-discern-component={meta.slug}
      data-discern-conformance-scenarios={JSON.stringify(conformance)}
    >
      <header>
        <div className="discern-catalogue-component__identity">
          <h4>{meta.name}</h4>
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
            href={`src/components/${meta.group.toLowerCase()}/${meta.slug}/${meta.slug}.${sourceExtension}`}
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

function App() {
  useInitialFragmentTarget();
  const parameters = useMemo(
    () => new URLSearchParams(globalThis.location.search),
    [],
  );
  const requestedTheme = parameters.get("theme");
  const requestedPurpose = parameters.get("purpose");
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
  const [purpose, setPurpose] = useState<CataloguePurpose | undefined>(() =>
    cataloguePurpose(requestedPurpose)
  );
  const defaultSurface = catalogueSurface(requestedSurface);
  const [componentSurfaces, setComponentSurfaces] = useState<
    Readonly<Record<string, CatalogueSurface>>
  >({});
  const [accentHue, setAccentHue] = useState(defaultAccentHue);
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
  const components = useMemo(() =>
    sortedComponents
      .filter(({ meta }) =>
        purpose === undefined || meta.purposes?.includes(purpose)
      )
      .filter(({ meta }) =>
        !conformanceMode || !selectedComponent ||
        meta.slug === selectedComponent
      ), [
    conformanceMode,
    purpose,
    selectedComponent,
    sortedComponents,
  ]);

  const tokens = allTokens;

  const searchDestinations = useMemo<CatalogueSearchDestination[]>(() => [
    ...sortedComponents.map(({ meta }) => ({
      href: `#component-${meta.slug}`,
      title: meta.name,
      context: `Component · ${meta.group}`,
      keywords: [
        meta.name,
        meta.group,
        meta.description,
        ...(meta.purposes ?? []),
        ...(meta.useWhen ?? []),
        ...(meta.notWhen ?? []),
      ].join(" "),
      revealsComponent: true as const,
    })),
    ...allTokens.map((token) => ({
      href: `#tokens-${slugify(token.category)}`,
      title: token.name,
      context: `Token · ${token.category}`,
      keywords: `${token.name} ${token.category} ${token.description}`,
    })),
    ...terminalFoundationDestinations(),
    ...compositionRecipes.map((recipe) => ({
      href: `#recipe-${recipe.id}`,
      title: recipe.title,
      context: "Composition",
      keywords: `${recipe.title} ${recipe.description}`,
    })),
    ...cliCompositionRecipes.map((recipe) => ({
      href: `#terminal-layout-${recipe.id}`,
      title: recipe.title,
      context: "Terminal composition",
      keywords: `${recipe.title} ${recipe.description} ${
        recipe.components.join(" ")
      } terminal layout CLI`,
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

  const groupedComponents = groupComponentEntries(components);
  const sidebarGroupedComponents = groupComponentEntries(sortedComponents);
  const purposeCounts = Object.fromEntries(
    cataloguePurposes.map((candidate) => [
      candidate,
      registry.filter(({ meta }) => meta.purposes?.includes(candidate)).length,
    ]),
  ) as Record<CataloguePurpose, number>;
  const tokenCategories = [...new Set(tokens.map((token) => token.category))];

  const changeTheme = (next: ThemeSwitcherMode) => {
    setTheme(next);
    if (next === "system") {
      localStorage.removeItem("discern-catalogue-theme");
    } else {
      localStorage.setItem("discern-catalogue-theme", next);
    }
  };

  const changePurpose = (next: CataloguePurpose | undefined): void => {
    setPurpose(next);
    const url = new URL(globalThis.location.href);
    if (next === undefined) url.searchParams.delete("purpose");
    else url.searchParams.set("purpose", next);
    url.hash = "components";
    globalThis.history.replaceState(null, "", url);
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

  const prepareComponentNavigation = (): void => {
    closeSearch();
    if (purpose === undefined) return;
    setPurpose(undefined);
    const url = new URL(globalThis.location.href);
    url.searchParams.delete("purpose");
    globalThis.history.replaceState(null, "", url);
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
        {components.map((entry) => (
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
      <aside className="discern-catalogue-sidebar">
        <a className="discern-catalogue-brand" href="#top">
          <span className="discern-catalogue-brand__mark" aria-hidden="true">
            ◮
          </span>
          <span>
            <strong>discern</strong>
            <small>Design system</small>
          </span>
        </a>
        <nav className="discern-catalogue-nav" aria-label="Catalogue">
          <a href="#foundations">Foundations</a>
          {tokenCategories.map((category) => (
            <a
              key={category}
              className="discern-catalogue-nav__child"
              href={`#tokens-${slugify(category)}`}
            >
              {category}
            </a>
          ))}
          {terminalFoundationSheets.map((sheet) => (
            <a
              key={sheet.id}
              className="discern-catalogue-nav__child"
              href={`#terminal-foundation-${sheet.id}`}
            >
              {sheet.title}
            </a>
          ))}
          <a href="#compositions">Compositions</a>
          <a href="#terminal-layouts">Terminal layouts</a>
          <span className="discern-catalogue-nav__heading">Components</span>
          {sidebarGroupedComponents.map(({ group, entries }) => (
            <div key={group}>
              <a
                href={`#group-${slugify(group)}`}
                onClick={prepareComponentNavigation}
              >
                {group}
                <small>{entries.length}</small>
              </a>
              {entries.map(({ meta }) => (
                <a
                  key={meta.slug}
                  className="discern-catalogue-nav__child"
                  href={`#component-${meta.slug}`}
                  onClick={prepareComponentNavigation}
                >
                  {meta.name}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <header className="discern-catalogue-toolbar">
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
                <li key={`${destination.href}:${destination.title}`}>
                  <SearchPaletteResult
                    href={destination.href}
                    title={destination.title}
                    context={destination.context}
                    onClick={destination.revealsComponent
                      ? prepareComponentNavigation
                      : closeSearch}
                  />
                </li>
              ))}
            </ul>
          )}
      </SearchPalette>

      <main className="discern-catalogue-main" id="top">
        <section className="discern-catalogue-hero">
          <span className="discern-kicker">
            <span className="discern-catalogue-live-dot" />
            <span className="discern-kicker__text">Generated reference</span>
          </span>
          <h1>
            Discern, built as a <em>system</em>.
          </h1>
          <p>
            Typed tokens, framework-neutral CSS, accessible React adapters, and
            automatically enrolled component examples.
          </p>
          <div className="discern-catalogue-stats">
            <span>{allTokens.length} tokens</span>
            <span>{registry.length} components</span>
            <span>0 remote runtime assets</span>
          </div>
        </section>

        <section className="discern-catalogue-section" id="foundations">
          <header className="discern-catalogue-section__header">
            <div>
              <Kicker index="01">— Foundations</Kicker>
              <h2>One value, every surface.</h2>
            </div>
            <p>
              Token and terminal-foundation inventories are each authored once
              and projected into every applicable review surface.
            </p>
          </header>
          {tokenCategories.map((category) => {
            const categoryTokens = tokens.filter((token) =>
              token.category === category
            );
            return (
              <section
                className="discern-catalogue-subsection"
                id={`tokens-${slugify(category)}`}
                key={category}
              >
                <div className="discern-catalogue-subsection__heading">
                  <h3>{category}</h3>
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
                            ? `${token.light} / ${token.dark}`
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
        </section>

        <section className="discern-catalogue-section" id="compositions">
          <header className="discern-catalogue-section__header">
            <div>
              <Kicker index="02">— Compositions</Kicker>
              <h2>Components working together.</h2>
            </div>
            <p>
              These Catalogue-only recipes join existing components into
              repeatable documentation and tool-output patterns.
            </p>
          </header>
          <div className="discern-catalogue-recipes">
            {compositionRecipes.map((
              { id, title, description, journey, Example, source },
            ) => (
              <section
                className="discern-catalogue-recipe"
                id={`recipe-${id}`}
                data-discern-journey={journey === undefined ? undefined : id}
                data-discern-journey-stages={journey === undefined
                  ? undefined
                  : JSON.stringify(journey.stages)}
                key={id}
              >
                <header>
                  <h3>{title}</h3>
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
        </section>

        <section className="discern-catalogue-section" id="terminal-layouts">
          <header className="discern-catalogue-section__header">
            <div>
              <Kicker index="03">— Terminal layouts</Kicker>
              <h2>See the frame, not just the text.</h2>
            </div>
            <p>
              Complete CLI compositions rendered through explicit terminal
              geometry, with row and column rulers, a viewport fold, overflow
              facts, and advisory review cues.
            </p>
          </header>
          <div className="discern-catalogue-terminal-layouts">
            {cliCompositionRecipes.map((recipe) => (
              <TerminalLayoutRecipe
                recipe={recipe}
                theme={terminalTheme}
                key={recipe.id}
              />
            ))}
          </div>
        </section>

        <section className="discern-catalogue-section" id="components">
          <header className="discern-catalogue-section__header">
            <div>
              <Kicker index="04">— Components</Kicker>
              <h2>Typed, composable, inspectable.</h2>
            </div>
            <p>
              One generated inventory pairs each web example with its real CLI
              renderer or recorded exemption. New metadata enters both views
              automatically.
            </p>
          </header>
          <label className="discern-catalogue-purpose-picker">
            <span>Filter components by purpose</span>
            <select
              value={purpose ?? ""}
              onChange={(event) =>
                changePurpose(cataloguePurpose(event.currentTarget.value))}
            >
              <option value="">All components</option>
              {cataloguePurposes.map((candidate) => (
                <option value={candidate} key={candidate}>
                  {purposeDetails[candidate].label} ({purposeCounts[candidate]})
                </option>
              ))}
            </select>
          </label>
          {purpose !== undefined
            ? (
              <div
                className="discern-catalogue-purpose-context"
                data-discern-active-purpose={purpose}
              >
                <div>
                  <strong>{purposeDetails[purpose].label}</strong>
                  <span>
                    {components.length} of {registry.length} components.{" "}
                    {purposeDetails[purpose].description}
                  </span>
                </div>
                <button type="button" onClick={() => changePurpose(undefined)}>
                  Show all
                </button>
              </div>
            )
            : null}
          {groupedComponents.map(({ group, entries }) => (
            <section
              className="discern-catalogue-component-group"
              id={`group-${slugify(group)}`}
              key={group}
            >
              <div className="discern-catalogue-subsection__heading">
                <h3>{group}</h3>
                <span>{entries.length}</span>
              </div>
              {entries.map((entry) => (
                <ComponentPreview
                  entry={entry}
                  surface={componentSurfaces[entry.meta.slug] ?? defaultSurface}
                  terminalTheme={terminalTheme}
                  onSurfaceChange={(next) =>
                    changeComponentSurface(entry.meta.slug, next)}
                  key={entry.meta.slug}
                />
              ))}
            </section>
          ))}
        </section>
      </main>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Catalogue root is missing");
createRoot(root).render(<App />);
