import { useEffect, useMemo, useState } from "react";
import {
  cataloguePurposes,
  componentGroups,
} from "../../../src/types/component-meta.ts";
import type { RegistryEntry } from "../../generated/registry.ts";
import {
  catalogueGroupFromSlug,
  catalogueGroupSlug,
  componentSearchRecords,
} from "../../routes.ts";
import { explanatoryMatchReason, searchRecords } from "../../search/mod.ts";
import { announceCatalogueLocationChange } from "../../shell/location.ts";
import { preserveCatalogueAppearanceHref } from "../../shell/appearance-state.ts";
import {
  CataloguePageHeader,
  cataloguePurpose,
  purposeDetails,
} from "../shared.tsx";
import { componentDirectory } from "./collections.ts";
import {
  ComponentCollectionCard,
  ComponentResultCard,
} from "./directory-card.tsx";
import {
  componentExplorerHref,
  type ComponentExplorerState,
  parseComponentExplorerState,
} from "./state.ts";

interface ComponentMatch {
  readonly entry: RegistryEntry;
  readonly matchReason?: Readonly<{ label: string; value: string }>;
}

function currentExplorerState(): ComponentExplorerState {
  return parseComponentExplorerState(new URL(globalThis.location.href));
}

export function ComponentIndexPage(
  { sortedComponents }: { readonly sortedComponents: readonly RegistryEntry[] },
) {
  const directory = useMemo(() => componentDirectory(sortedComponents), [
    sortedComponents,
  ]);
  const [state, setState] = useState(currentExplorerState);

  useEffect(() => {
    const restore = () => setState(currentExplorerState());
    globalThis.addEventListener("popstate", restore);
    return () => globalThis.removeEventListener("popstate", restore);
  }, []);

  const navigate = (next: ComponentExplorerState, replace = false): void => {
    const href = preserveCatalogueAppearanceHref(
      new URL(globalThis.location.href),
      componentExplorerHref(next),
    );
    globalThis.history[replace ? "replaceState" : "pushState"](null, "", href);
    setState(next);
    announceCatalogueLocationChange();
  };
  const eligible = directory.components.filter(({ meta }) =>
    (state.group === undefined || meta.group === state.group) &&
    (state.purpose === undefined || meta.purposes?.includes(state.purpose))
  );
  const matches: readonly ComponentMatch[] = state.query.trim() === ""
    ? eligible.map((entry) => ({ entry }))
    : searchRecords(componentSearchRecords(eligible), state.query).flatMap(
      (result) => {
        const entry = result.record.payload;
        if (entry === undefined) return [];
        const reason = explanatoryMatchReason(result);
        return [{
          entry,
          ...(reason === undefined
            ? {}
            : { matchReason: { label: reason.label, value: reason.value } }),
        }];
      },
    );
  const resultsVisible = state.showAll || state.group !== undefined ||
    state.purpose !== undefined || state.query.trim() !== "";
  const mixedGroups =
    new Set(matches.map(({ entry }) => entry.meta.group)).size > 1;
  const reset = () => navigate({ query: "", showAll: false });

  return (
    <div className="discern-catalogue-page" id="components">
      <CataloguePageHeader
        index="02"
        eyebrow="Components"
        title="Find a Component by sight or intent."
        description="Recognise a collection, search the shared vocabulary, or open the complete directory."
      />
      <div
        className="discern-catalogue-explorer-controls"
        aria-label="Component directory controls"
      >
        <label>
          <span>Search Components</span>
          <input
            type="search"
            value={state.query}
            onChange={(event) =>
              navigate({ ...state, query: event.currentTarget.value }, true)}
            placeholder="Name, alias, or purpose"
          />
        </label>
        <label>
          <span>Group</span>
          <select
            value={state.group === undefined
              ? ""
              : catalogueGroupSlug(state.group)}
            onChange={(event) => {
              const group = catalogueGroupFromSlug(
                event.currentTarget.value,
              );
              navigate({
                query: state.query,
                showAll: true,
                ...(group === undefined ? {} : { group }),
                ...(state.purpose === undefined
                  ? {}
                  : { purpose: state.purpose }),
              });
            }}
          >
            <option value="">All Groups</option>
            {componentGroups.map((group) => (
              <option value={catalogueGroupSlug(group)} key={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Purpose</span>
          <select
            value={state.purpose ?? ""}
            onChange={(event) => {
              const purpose = cataloguePurpose(event.currentTarget.value);
              navigate({
                query: state.query,
                showAll: true,
                ...(state.group === undefined ? {} : { group: state.group }),
                ...(purpose === undefined ? {} : { purpose }),
              });
            }}
          >
            <option value="">All purposes</option>
            {cataloguePurposes.map((purpose) => (
              <option value={purpose} key={purpose}>
                {purposeDetails[purpose].label}
              </option>
            ))}
          </select>
        </label>
        {resultsVisible
          ? <button type="button" onClick={reset}>Reset directory</button>
          : (
            <button
              type="button"
              onClick={() => navigate({ ...state, showAll: true })}
            >
              All Components ({directory.components.length})
            </button>
          )}
      </div>

      {resultsVisible
        ? (
          <section aria-labelledby="component-results-title">
            <div className="discern-catalogue-results-header">
              <h2 id="component-results-title">
                {state.group ?? (state.purpose === undefined
                  ? "Component results"
                  : purposeDetails[state.purpose].label)}
              </h2>
              <p aria-live="polite">
                {matches.length} Component{matches.length === 1 ? "" : "s"}
              </p>
            </div>
            {matches.length === 0
              ? (
                <div className="discern-catalogue-empty">
                  <h3>No matching Components</h3>
                  <button type="button" onClick={reset}>
                    Return to collections
                  </button>
                </div>
              )
              : (
                <div className="discern-catalogue-component-index">
                  {matches.map(({ entry, matchReason }) => (
                    <ComponentResultCard
                      entry={entry}
                      showGroup={mixedGroups}
                      {...(matchReason === undefined ? {} : { matchReason })}
                      key={entry.meta.slug}
                    />
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
                <p>{directory.groups.length} Groups</p>
              </div>
              <div className="discern-catalogue-collection-grid">
                {directory.groups.map((collection) => (
                  <ComponentCollectionCard
                    collection={collection}
                    key={collection.id}
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
                <p>{directory.purposes.length} task collections</p>
              </div>
              <div className="discern-catalogue-collection-grid">
                {directory.purposes.map((collection) => (
                  <ComponentCollectionCard
                    collection={collection}
                    key={collection.id}
                  />
                ))}
              </div>
            </section>
          </>
        )}
    </div>
  );
}
