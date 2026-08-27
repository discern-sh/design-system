import { useMemo, useState } from "react";
import { Select } from "../../../src/components/forms/select/select.tsx";
import {
  type CataloguePurpose,
  cataloguePurposes,
  type ComponentGroup,
  componentGroups,
} from "../../../src/types/component-meta.ts";
import type { RegistryEntry } from "../../generated/registry.ts";
import {
  catalogueComponentPath,
  catalogueGroupFromSlug,
  catalogueGroupSlug,
  catalogueRoutePaths,
  componentSearchRecords,
} from "../../routes.ts";
import { searchRecords } from "../../search/mod.ts";
import { announceCatalogueLocationChange } from "../../shell/location.ts";
import {
  CataloguePageHeader,
  cataloguePurpose,
  CatalogueRouteCard,
  componentGroupHref,
  componentPurposeHref,
  groupComponentEntries,
  purposeDetails,
} from "../shared.tsx";

export function ComponentIndexPage(
  { sortedComponents }: { readonly sortedComponents: readonly RegistryEntry[] },
) {
  const initialParameters = useMemo(
    () => new URLSearchParams(globalThis.location.search),
    [],
  );
  const initialGroup = catalogueGroupFromSlug(initialParameters.get("group"));
  const initialPurpose = cataloguePurpose(initialParameters.get("purpose"));
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ComponentGroup | undefined>(initialGroup);
  const [purpose, setPurpose] = useState<CataloguePurpose | undefined>(
    initialPurpose,
  );
  const [showAll, setShowAll] = useState(
    initialParameters.get("all") === "1" ||
      initialGroup !== undefined || initialPurpose !== undefined,
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
    announceCatalogueLocationChange();
  };

  const eligibleComponents = sortedComponents.filter(({ meta }) =>
    (group === undefined || meta.group === group) &&
    (purpose === undefined || meta.purposes?.includes(purpose))
  );
  const filteredComponents = query.trim() === ""
    ? eligibleComponents
    : searchRecords(componentSearchRecords(eligibleComponents), query).flatMap(
      ({ record }) => record.payload === undefined ? [] : [record.payload],
    );
  const showComponentGroupLabels = new Set(
    filteredComponents.map(({ meta }) => meta.group),
  ).size > 1;
  const resultsVisible = showAll || group !== undefined ||
    purpose !== undefined || query.trim() !== "";

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
        index="02"
        eyebrow="Components"
        title="Find one Component, then inspect it fully."
        description="Browse by Group or purpose, or search by the words you have."
      />
      <div className="discern-catalogue-explorer-controls">
        <label>
          <span>Search Components</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Name, purpose, or guidance"
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
              <option value={catalogueGroupSlug(candidate)} key={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Purpose</span>
          <Select
            value={purpose ?? ""}
            onChange={(event) => {
              const next = cataloguePurpose(event.currentTarget.value);
              setPurpose(next);
              setShowAll(true);
              syncFilters(group, next, true);
            }}
            options={[
              { value: "", label: "All purposes" },
              ...cataloguePurposes.map((candidate) => ({
                value: candidate,
                label: purposeDetails[candidate].label,
              })),
            ]}
          />
        </label>
        {resultsVisible
          ? <button type="button" onClick={clearFilters}>Reset</button>
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
                  <h3>No Components match.</h3>
                  <button type="button" onClick={clearFilters}>
                    Clear filters
                  </button>
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
                      {showComponentGroupLabels
                        ? <span>{meta.group}</span>
                        : null}
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
                <p>{componentGroups.length} Groups</p>
              </div>
              <div className="discern-catalogue-route-grid">
                {groupComponentEntries(sortedComponents).map((
                  { group: candidate, entries },
                ) => (
                  <CatalogueRouteCard
                    href={componentGroupHref(candidate)}
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
