import { useEffect, useMemo, useState } from "react";
import type { TerminalThemeVariant } from "../../../src/cli/theme.ts";
import { OverflowCue } from "../../../src/components/layout/overflow-cue/overflow-cue.tsx";
import type { RegistryEntry } from "../../generated/registry.ts";
import { catalogueRoutePaths } from "../../routes.ts";
import { announceCatalogueLocationChange } from "../../shell/location.ts";
import { preserveCatalogueAppearanceHref } from "../../shell/appearance-state.ts";
import {
  ComponentExampleControl,
  ComponentSpecimen,
  ComponentSurfaceControl,
} from "../components/component-preview.tsx";
import { componentDirectory } from "../components/collections.ts";
import { componentDetailHref } from "../components/state.ts";
import { CataloguePageHeader } from "../shared.tsx";
import type { CatalogueSurface } from "../shared.tsx";
import {
  type CompareScope,
  type CompareState,
  compareStateHref,
  parseCompareState,
  setCompareComponentSurface,
  setCompareCustomComponents,
  setCompareGlobalSurface,
} from "./state.ts";

export { resolveCompareScope } from "./state.ts";

export function ComparisonItem(
  {
    entry,
    surface,
    exampleId,
    terminalTheme,
    overridden,
    onSurfaceChange,
    onExampleChange,
    onReset,
    onRemove,
  }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly exampleId: string;
    readonly terminalTheme: TerminalThemeVariant;
    readonly overridden: boolean;
    readonly onSurfaceChange: (surface: CatalogueSurface) => void;
    readonly onExampleChange: (id: string) => void;
    readonly onReset?: () => void;
    readonly onRemove?: () => void;
  },
) {
  return (
    <article
      className="discern-catalogue-compare-item"
      id={`compare-component-${entry.meta.slug}`}
      data-discern-component={entry.meta.slug}
      data-discern-compare-item={entry.meta.slug}
    >
      <header>
        <div>
          <h3>{entry.meta.name}</h3>
          <p>{entry.meta.description}</p>
        </div>
        <div className="discern-catalogue-compare-item__actions">
          <a
            href={componentDetailHref(entry, {
              surface,
              exampleId,
              view: "single",
            }, { anchor: true })}
          >
            Open full detail
          </a>
          {onRemove === undefined
            ? null
            : <button type="button" onClick={onRemove}>Remove</button>}
        </div>
      </header>
      <div className="discern-catalogue-compare-item__controls">
        <ComponentSurfaceControl
          entry={entry}
          surface={surface}
          onChange={onSurfaceChange}
        />
        <ComponentExampleControl
          entry={entry}
          surface={surface}
          exampleId={exampleId}
          onChange={onExampleChange}
        />
        {overridden && onReset !== undefined
          ? <button type="button" onClick={onReset}>Use global surface</button>
          : null}
      </div>
      <ComponentSpecimen
        entry={entry}
        surface={surface}
        exampleId={exampleId}
        view="single"
        terminalTheme={terminalTheme}
        headingLevel={4}
      />
    </article>
  );
}

function ScopePicker(
  { state, directory, onChange }: {
    readonly state: CompareState;
    readonly directory: ReturnType<typeof componentDirectory>;
    readonly onChange: (scope: CompareScope) => void;
  },
) {
  const value = (() => {
    const scope = state.scope;
    if (scope?.kind === "all") return "all";
    if (scope?.kind === "custom") return "custom";
    if (scope?.kind === "group") {
      return directory.groups.find(({ group }) => group === scope.group)?.id ??
        "";
    }
    if (scope?.kind === "purpose") {
      return directory.purposes.find(({ purpose }) => purpose === scope.purpose)
        ?.id ?? "";
    }
    return "";
  })();
  return (
    <label className="discern-catalogue-compare-scope">
      <span>Comparison scope</span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.value;
          if (next === "all") {
            onChange({
              kind: "all",
              title: "Complete system",
              components: directory.components,
            });
          } else if (next === "custom") {
            onChange({
              kind: "custom",
              title: "Custom comparison",
              components: state.scope?.kind === "custom"
                ? state.scope.components
                : [],
            });
          } else {
            const collection = [...directory.groups, ...directory.purposes]
              .find(({ id }) => id === next.toLowerCase());
            if (collection?.kind === "group") {
              onChange({
                kind: "group",
                group: collection.group,
                title: collection.label,
                components: collection.members,
              });
            } else if (collection?.kind === "purpose") {
              onChange({
                kind: "purpose",
                purpose: collection.purpose,
                title: collection.label,
                components: collection.members,
              });
            }
          }
        }}
      >
        <option value="" disabled>Choose a focused scope</option>
        <optgroup label="Groups">
          {directory.groups.map((collection) => (
            <option value={collection.id} key={collection.id}>
              {collection.label} ({collection.members.length})
            </option>
          ))}
        </optgroup>
        <optgroup label="Purposes">
          {directory.purposes.map((collection) => (
            <option value={collection.id} key={collection.id}>
              {collection.label} ({collection.members.length})
            </option>
          ))}
        </optgroup>
        <option value="custom">Custom selection</option>
        <option value="all">
          Complete system ({directory.components.length})
        </option>
      </select>
    </label>
  );
}

export function ComparePage(
  { sortedComponents, defaultSurface, terminalTheme, onSurfaceChange }: {
    readonly sortedComponents: readonly RegistryEntry[];
    readonly defaultSurface: CatalogueSurface;
    readonly componentSurfaces: Readonly<Record<string, CatalogueSurface>>;
    readonly terminalTheme: TerminalThemeVariant;
    readonly onSurfaceChange: (slug: string, surface: CatalogueSurface) => void;
  },
) {
  const directory = useMemo(() => componentDirectory(sortedComponents), [
    sortedComponents,
  ]);
  const readState = () => {
    const parsed = parseCompareState(
      new URL(globalThis.location.href),
      sortedComponents,
    );
    return parsed.globalSurface === "web" &&
        !new URL(globalThis.location.href).searchParams.has("surface")
      ? { ...parsed, globalSurface: defaultSurface }
      : parsed;
  };
  const [state, setState] = useState(readState);
  useEffect(() => {
    const restore = () => setState(readState());
    globalThis.addEventListener("popstate", restore);
    globalThis.addEventListener("hashchange", restore);
    return () => {
      globalThis.removeEventListener("popstate", restore);
      globalThis.removeEventListener("hashchange", restore);
    };
  }, [defaultSurface, sortedComponents]);

  const navigate = (next: CompareState, replace = false): void => {
    globalThis.history[replace ? "replaceState" : "pushState"](
      null,
      "",
      preserveCatalogueAppearanceHref(
        new URL(globalThis.location.href),
        compareStateHref(next),
      ),
    );
    setState(next);
    announceCatalogueLocationChange();
  };
  const changeScope = (scope: CompareScope) => {
    const { current: _current, ...rest } = state;
    navigate({
      ...rest,
      scope,
      surfaceOverrides: {},
      exampleOverrides: {},
    });
  };

  if (state.scope === undefined) {
    return (
      <div className="discern-catalogue-page discern-catalogue-compare-landing">
        <CataloguePageHeader
          index="06"
          eyebrow="Compare"
          title="Build a deliberate comparison."
          description="Choose one focused collection or return to the Components directory."
        />
        <div className="discern-catalogue-compare-landing__picker">
          <ScopePicker
            state={state}
            directory={directory}
            onChange={changeScope}
          />
          <a href={catalogueRoutePaths.components}>Return to Components</a>
        </div>
        <p className="discern-catalogue-compare-landing__complete">
          Complete system is secondary: {directory.components.length}{" "}
          Component previews.
        </p>
      </div>
    );
  }

  const scope = state.scope;
  const grouped = componentDirectory(scope.components).groups.map((
    collection,
  ) => ({ group: collection.group, entries: collection.members }));
  const custom = scope.kind === "custom";
  const selected = new Set(scope.components.map(({ meta }) => meta.slug));
  const remaining = sortedComponents.filter(({ meta }) =>
    !selected.has(meta.slug)
  );
  const resetOverrides = () => navigate({ ...state, surfaceOverrides: {} });

  return (
    <div className="discern-catalogue-page discern-catalogue-review">
      <CataloguePageHeader
        index="06"
        eyebrow="Compare"
        title={scope.title}
        description={`${scope.components.length} Component${
          scope.components.length === 1 ? "" : "s"
        }, one named specimen each.`}
      />
      <div className="discern-catalogue-review-controls">
        <ScopePicker
          state={state}
          directory={directory}
          onChange={changeScope}
        />
        <fieldset>
          <legend>Global surface</legend>
          <div className="discern-catalogue-review-surfaces">
            <button
              type="button"
              aria-pressed={state.globalSurface === "web"}
              onClick={() => navigate(setCompareGlobalSurface(state, "web"))}
            >
              Set all to Web
            </button>
            <button
              type="button"
              aria-pressed={state.globalSurface === "cli"}
              onClick={() => navigate(setCompareGlobalSurface(state, "cli"))}
            >
              Set all to CLI
            </button>
          </div>
        </fieldset>
        <button
          type="button"
          onClick={resetOverrides}
          disabled={Object.keys(state.surfaceOverrides).length === 0}
        >
          Reset individual overrides
        </button>
        {custom
          ? (
            <label>
              <span>Add a Component</span>
              <select
                value=""
                onChange={(event) => {
                  const slug = event.currentTarget.value;
                  if (slug) {
                    navigate(
                      setCompareCustomComponents(state, [...selected, slug]),
                    );
                  }
                }}
              >
                <option value="">Choose Component</option>
                {remaining.map(({ meta }) => (
                  <option value={meta.slug} key={meta.slug}>{meta.name}</option>
                ))}
              </select>
            </label>
          )
          : null}
      </div>
      {scope.kind === "all"
        ? (
          <p className="discern-catalogue-review__weight">
            Complete system · {scope.components.length} Component previews
          </p>
        )
        : null}
      {scope.components.length === 0
        ? (
          <div className="discern-catalogue-empty">
            <h2>No Components selected</h2>
            <a href={catalogueRoutePaths.components}>Choose Components</a>
          </div>
        )
        : (
          <div className="discern-catalogue-review__workspace">
            <OverflowCue
              axis="both"
              scrollContainer="descendant"
              className="discern-catalogue-review__jump-cue"
            >
              <nav
                className="discern-catalogue-review__jump-list"
                aria-label="Comparison jump list"
                tabIndex={0}
                data-discern-overflow-cue-target=""
              >
                {grouped.map(({ group, entries }) => (
                  <div key={group}>
                    <strong>{group}</strong>
                    {entries.map(({ meta }) => {
                      const next = { ...state, current: meta.slug };
                      return (
                        <a
                          href={compareStateHref(next)}
                          aria-current={state.current === meta.slug
                            ? "location"
                            : undefined}
                          key={meta.slug}
                        >
                          {meta.name}
                        </a>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </OverflowCue>
            <div className="discern-catalogue-review__population">
              {grouped.map(({ group, entries }) => (
                <section
                  className="discern-catalogue-component-group"
                  key={group}
                >
                  <div className="discern-catalogue-subsection__heading">
                    <h2>{group}</h2>
                    <span>{entries.length}</span>
                  </div>
                  {entries.map((entry) => {
                    const itemSurface =
                      state.surfaceOverrides[entry.meta.slug] ??
                        state.globalSurface;
                    const exampleId = state.exampleOverrides[entry.meta.slug] ??
                      entry.canonicalExamples[0]?.id ?? "default";
                    return (
                      <ComparisonItem
                        entry={entry}
                        surface={itemSurface}
                        exampleId={exampleId}
                        terminalTheme={terminalTheme}
                        overridden={entry.meta.slug in state.surfaceOverrides}
                        onSurfaceChange={(surface) => {
                          onSurfaceChange(entry.meta.slug, surface);
                          navigate(
                            setCompareComponentSurface(
                              state,
                              entry.meta.slug,
                              surface,
                            ),
                          );
                        }}
                        onExampleChange={(id) =>
                          navigate({
                            ...state,
                            exampleOverrides: {
                              ...state.exampleOverrides,
                              [entry.meta.slug]: id,
                            },
                          })}
                        onReset={() =>
                          navigate(
                            setCompareComponentSurface(
                              state,
                              entry.meta.slug,
                              state.globalSurface,
                            ),
                          )}
                        {...(custom
                          ? {
                            onRemove: () =>
                              navigate(
                                setCompareCustomComponents(
                                  state,
                                  scope.components.filter(({ meta }) =>
                                    meta.slug !== entry.meta.slug
                                  ).map(({ meta }) => meta.slug),
                                ),
                              ),
                          }
                          : {})}
                        key={entry.meta.slug}
                      />
                    );
                  })}
                </section>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
