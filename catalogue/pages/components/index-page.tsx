import { useEffect, useMemo, useState } from "react";
import {
  cataloguePurposeDetails,
  cataloguePurposes,
  componentBehaviors,
  componentGroups,
} from "../../../src/types/component-meta.ts";
import { SegmentedControl } from "../../../src/components/forms/segmented-control/segmented-control.tsx";
import { componentResultId } from "./return-context.ts";
import { Select } from "../../../src/components/forms/select/select.tsx";
import type { RegistryEntry } from "../../generated/registry.ts";
import {
  catalogueGroupFromSlug,
  catalogueGroupSlug,
  componentSearchRecords,
} from "../../routes.ts";
import { explanatoryMatchReason, searchRecords } from "../../search/mod.ts";
import { announceCatalogueLocationChange } from "../../shell/location.ts";
import { preserveCatalogueAppearanceHref } from "../../shell/appearance-state.ts";
import { CataloguePageHeader, cataloguePurpose } from "../shared.tsx";
import {
  componentDirectory,
  matchesComponentCapabilities,
} from "./collections.ts";
import {
  ComponentCollectionCard,
  ComponentResultCard,
} from "./directory-card.tsx";
import {
  componentExplorerHref,
  type ComponentExplorerState,
  parseComponentExplorerState,
} from "./explorer-state.ts";

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
  const [filtersOpen, setFiltersOpen] = useState(() =>
    state.group !== undefined || state.purpose !== undefined ||
    state.behavior !== undefined
  );

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
  const eligible = directory.components.filter((entry) =>
    matchesComponentCapabilities(entry, state) &&
    (state.group === undefined || entry.meta.group === state.group) &&
    (state.purpose === undefined ||
      entry.meta.purposes?.includes(state.purpose))
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
    state.purpose !== undefined || state.query.trim() !== "" ||
    state.availability !== undefined || state.behavior !== undefined;
  const mixedGroups =
    new Set(matches.map(({ entry }) => entry.meta.group)).size > 1;

  useEffect(() => {
    const hash = globalThis.location.hash.slice(1);
    const entry = matches.find(({ entry }) =>
      componentResultId(entry.meta.slug) === hash
    )?.entry;
    if (entry === undefined) return;
    const result = document.getElementById(componentResultId(entry.meta.slug));
    const link = result?.querySelector<HTMLAnchorElement>(
      ".discern-catalogue-component-card__inspect",
    );
    result?.scrollIntoView({ block: "center" });
    link?.focus({ preventScroll: true });
  }, [state]);

  const browseHref = (showAll: boolean) =>
    preserveCatalogueAppearanceHref(
      new URL(globalThis.location.href),
      componentExplorerHref({ query: "", showAll }),
    );
  const secondaryFiltersActive = state.group !== undefined ||
    state.purpose !== undefined || state.behavior !== undefined;

  return (
    <div
      className="discern-catalogue-page discern-catalogue-discovery"
      id="components"
    >
      <CataloguePageHeader
        index="02"
        eyebrow="Components"
        title="Find a Component."
        description="Browse by sight, search by intent, or filter by capability."
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
              navigate({
                ...state,
                query: event.currentTarget.value,
                showAll: true,
              }, true)}
            placeholder="Name, alias, or purpose"
          />
        </label>
        <SegmentedControl
          label="Component availability"
          className="discern-catalogue-discovery__availability"
          name="discern-discovery-availability"
          value={state.availability ?? "all"}
          items={[
            { value: "all", label: "Any" },
            ...(["web", "cli"] as const).map((surface) => ({
              value: surface,
              label: surface === "web" ? "Web" : "CLI",
            })),
          ]}
          onValueChange={(value) => {
            const { availability: _availability, ...rest } = state;
            navigate({
              ...rest,
              showAll: true,
              ...(value === "web" || value === "cli"
                ? { availability: value }
                : {}),
            });
          }}
        />
        <details
          className="discern-catalogue-discovery__filters"
          open={filtersOpen}
          onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
        >
          <summary>
            More filters{" "}
            <span
              className="discern-catalogue-discovery__filter-status"
              aria-hidden={!secondaryFiltersActive}
              data-discern-active={secondaryFiltersActive}
            >
              (active)
            </span>
          </summary>
          <div className="discern-catalogue-discovery__filter-fields">
            <label>
              <span>Group</span>
              <Select
                value={state.group === undefined
                  ? ""
                  : catalogueGroupSlug(state.group)}
                onChange={(event) => {
                  const group = catalogueGroupFromSlug(
                    event.currentTarget.value,
                  );
                  const { group: _group, ...rest } = state;
                  navigate({
                    ...rest,
                    showAll: true,
                    ...(group === undefined ? {} : { group }),
                  });
                }}
              >
                <option value="">All Groups</option>
                {componentGroups.map((group) => (
                  <option value={catalogueGroupSlug(group)} key={group}>
                    {group}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>Purpose</span>
              <Select
                value={state.purpose ?? ""}
                onChange={(event) => {
                  const purpose = cataloguePurpose(event.currentTarget.value);
                  const { purpose: _purpose, ...rest } = state;
                  navigate({
                    ...rest,
                    showAll: true,
                    ...(purpose === undefined ? {} : { purpose }),
                  });
                }}
              >
                <option value="">All purposes</option>
                {cataloguePurposes.map((purpose) => (
                  <option value={purpose} key={purpose}>
                    {cataloguePurposeDetails[purpose].label}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>Package behaviour</span>
              <Select
                value={state.behavior ?? ""}
                onChange={(event) => {
                  const { behavior: _behavior, ...rest } = state;
                  const behavior = componentBehaviors.find((value) =>
                    value === event.currentTarget.value
                  );
                  navigate({
                    ...rest,
                    showAll: true,
                    ...(behavior === undefined ? {} : { behavior }),
                  });
                }}
              >
                <option value="">Any behaviour</option>
                {componentBehaviors.map((behavior) => (
                  <option key={behavior} value={behavior}>
                    {behavior.replaceAll("-", " ")}{" "}
                    ({directory.components.filter((entry) =>
                      entry.meta.behaviors?.includes(behavior)
                    ).length})
                  </option>
                ))}
              </Select>
            </label>
            <p>
              Declared optional browser behaviours. Native controls and
              interactive examples may work without one.
            </p>
          </div>
        </details>
      </div>

      {resultsVisible
        ? (
          <section aria-labelledby="component-results-title">
            <div className="discern-catalogue-results-header">
              <h2 id="component-results-title">
                {state.group ?? (state.purpose === undefined
                  ? "Component results"
                  : cataloguePurposeDetails[state.purpose].label)}
              </h2>
              <a
                className="discern-catalogue-discovery__browse"
                href={browseHref(false)}
              >
                Browse collections
              </a>
              <p aria-live="polite">
                {matches.length} Component{matches.length === 1 ? "" : "s"}
              </p>
            </div>
            {matches.length === 0
              ? (
                <div className="discern-catalogue-empty">
                  <h3>No matching Components</h3>
                  <p>Try another search or broaden your filters.</p>
                </div>
              )
              : (
                <div className="discern-catalogue-component-index">
                  {matches.map(({ entry, matchReason }) => (
                    <ComponentResultCard
                      entry={entry}
                      discoveryUrl={new URL(globalThis.location.href)}
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
                <a
                  className="discern-catalogue-discovery__browse"
                  href={browseHref(true)}
                >
                  Browse all components
                </a>
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
