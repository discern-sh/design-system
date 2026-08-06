import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { ThemeSwitcher } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import type { ThemeSwitcherMode } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import { Kicker } from "../src/components/display/kicker/kicker.tsx";
import { CopyButton } from "../src/components/docs/copy-button/copy-button.tsx";
import { useInitialFragmentTarget } from "../src/components/use-initial-fragment-target.ts";
import { allTokens, discernThemeTokens } from "../src/tokens/tokens.ts";
import {
  type CataloguePurpose,
  cataloguePurposes,
  componentGroups,
} from "../src/types/component-meta.ts";
import { type CompositionRecipe, compositionRecipes } from "./compositions.tsx";
import { packageVersion, registry } from "./generated/registry.ts";
import type { RegistryEntry } from "./generated/registry.ts";

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
        Aa
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

function ComponentPreview({ entry }: { readonly entry: RegistryEntry }) {
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
  return (
    <article
      className="discern-catalogue-component"
      id={`component-${meta.slug}`}
      data-discern-component={meta.slug}
      data-discern-conformance-scenarios={JSON.stringify(conformance)}
    >
      <header>
        <div>
          <h4>{meta.name}</h4>
          <p>{meta.description}</p>
        </div>
        <a
          href={`src/components/${meta.group.toLowerCase()}/${meta.slug}/${meta.slug}.tsx`}
          target="_blank"
        >
          Source ↗
        </a>
      </header>
      <div className="discern-catalogue-component__canvas">
        {states.map(({ name, label, Example }) => {
          const fragmentId = stateFragmentId(meta.slug, name);
          return (
            <section
              className="discern-catalogue-example-state"
              id={fragmentId}
              data-discern-example-state={name}
              key={name}
            >
              <header>
                <h5>{label}</h5>
                <a
                  href={`#${fragmentId}`}
                  aria-label={`Link to ${meta.name}: ${label}`}
                >
                  #
                </a>
              </header>
              <div className="discern-catalogue-example-state__canvas">
                <Example />
              </div>
            </section>
          );
        })}
      </div>
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
  const conformanceMode = parameters.get("conformance") === "1";
  const selectedComponent = parameters.get("component");
  const [theme, setTheme] = useState<ThemeSwitcherMode>(() =>
    catalogueTheme(requestedTheme) ??
      catalogueTheme(localStorage.getItem("discern-styleguide-theme")) ??
      "system"
  );
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState<CataloguePurpose | undefined>(() =>
    cataloguePurpose(requestedPurpose)
  );
  const [accentHue, setAccentHue] = useState(defaultAccentHue);
  const normalizedQuery = query.trim().toLowerCase();

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
        !normalizedQuery ||
        [
          meta.name,
          meta.group,
          meta.description,
          ...(meta.purposes ?? []),
          ...(meta.useWhen ?? []),
          ...(meta.notWhen ?? []),
        ].join(" ").toLowerCase().includes(normalizedQuery)
      )
      .filter(({ meta }) =>
        purpose === undefined || meta.purposes?.includes(purpose)
      )
      .filter(({ meta }) =>
        !conformanceMode || !selectedComponent ||
        meta.slug === selectedComponent
      ), [
    conformanceMode,
    normalizedQuery,
    purpose,
    selectedComponent,
    sortedComponents,
  ]);

  const tokens = useMemo(
    () =>
      allTokens.filter((token) =>
        !normalizedQuery ||
        `${token.name} ${token.category} ${token.description}`.toLowerCase()
          .includes(normalizedQuery)
      ),
    [normalizedQuery],
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
      localStorage.removeItem("discern-styleguide-theme");
    } else {
      localStorage.setItem("discern-styleguide-theme", next);
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

  const showAllForComponentNavigation = (): void => {
    setQuery("");
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
          <ComponentPreview entry={entry} key={entry.meta.slug} />
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
      data-discern-theme-storage-key="discern-styleguide-theme"
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
        <nav className="discern-catalogue-nav" aria-label="Styleguide">
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
          <a href="#compositions">Compositions</a>
          <a href="builder/">Interface builder ↗</a>
          <span className="discern-catalogue-nav__heading">Components</span>
          {sidebarGroupedComponents.map(({ group, entries }) => (
            <div key={group}>
              <a
                href={`#group-${slugify(group)}`}
                onClick={showAllForComponentNavigation}
              >
                {group}
                <small>{entries.length}</small>
              </a>
              {entries.map(({ meta }) => (
                <a
                  key={meta.slug}
                  className="discern-catalogue-nav__child"
                  href={`#component-${meta.slug}`}
                  onClick={showAllForComponentNavigation}
                >
                  {meta.name}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <header className="discern-catalogue-toolbar">
        <label className="discern-catalogue-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search components, guidance, and tokens"
          />
        </label>
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
              Change authored values in{" "}
              <code>src/tokens/tokens.ts</code>. CSS and this inventory are
              generated.
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
                        <small>
                          {"light" in token
                            ? `${token.light} / ${token.dark}`
                            : token.value}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </section>

        <section className="discern-catalogue-section" id="compositions">
          <header className="discern-catalogue-section__header">
            <div>
              <Kicker index="02">— Compositions</Kicker>
              <h2>Components working together.</h2>
            </div>
            <p>
              These styleguide-only recipes join existing components into
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

        <section className="discern-catalogue-section" id="components">
          <header className="discern-catalogue-section__header">
            <div>
              <Kicker index="03">— Components</Kicker>
              <h2>Typed, composable, inspectable.</h2>
            </div>
            <p>
              Each component owns implementation, CSS, metadata, and neutral
              fixtures. New metadata files enter this page automatically.
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
                <ComponentPreview entry={entry} key={entry.meta.slug} />
              ))}
            </section>
          ))}
        </section>

        {!components.length && !tokens.length
          ? (
            <div className="discern-catalogue-empty">
              <h2>No matches.</h2>
              <p>
                Try another purpose, component group, token role, or visual
                property.
              </p>
            </div>
          )
          : null}
      </main>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Styleguide root is missing");
createRoot(root).render(<App />);
