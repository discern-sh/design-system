import {
  type CataloguePurpose,
  cataloguePurposes,
  type ComponentGroup,
  componentGroups,
} from "../../../src/types/component-meta.ts";
import type { TerminalThemeVariant } from "../../../src/cli/theme.ts";
import type { RegistryEntry } from "../../generated/registry.ts";
import {
  catalogueGroupFromSlug,
  catalogueGroupSlug,
  catalogueRoutePaths,
} from "../../routes.ts";
import { ComponentPreview } from "../components/component-preview.tsx";
import {
  CataloguePageHeader,
  cataloguePurpose,
  CatalogueRouteCard,
  compareHref,
  groupComponentEntries,
  purposeDetails,
} from "../shared.tsx";
import type { CatalogueSurface } from "../shared.tsx";

export type CompareScope =
  | {
    readonly kind: "all";
    readonly title: "Complete system";
    readonly components: readonly RegistryEntry[];
  }
  | {
    readonly kind: "group";
    readonly group: ComponentGroup;
    readonly title: ComponentGroup;
    readonly components: readonly RegistryEntry[];
  }
  | {
    readonly kind: "purpose";
    readonly purpose: CataloguePurpose;
    readonly title: string;
    readonly components: readonly RegistryEntry[];
  };

/** Deliberate Compare scope guard, independent of the rendering layer. */
export function resolveCompareScope(
  parameters: URLSearchParams,
  entries: readonly RegistryEntry[],
): CompareScope | undefined {
  if (parameters.get("scope") === "all") {
    return { kind: "all", title: "Complete system", components: entries };
  }
  const group = catalogueGroupFromSlug(parameters.get("group"));
  if (group !== undefined) {
    return {
      kind: "group",
      group,
      title: group,
      components: entries.filter(({ meta }) => meta.group === group),
    };
  }
  const purpose = cataloguePurpose(parameters.get("purpose"));
  if (purpose !== undefined) {
    return {
      kind: "purpose",
      purpose,
      title: purposeDetails[purpose].label,
      components: entries.filter(({ meta }) =>
        meta.purposes?.includes(purpose)
      ),
    };
  }
  return undefined;
}

function CompareLanding(
  { sortedComponents }: { readonly sortedComponents: readonly RegistryEntry[] },
) {
  return (
    <div className="discern-catalogue-page">
      <CataloguePageHeader
        index="06"
        eyebrow="Compare"
        title="Choose what to compare."
        description="Start with a Group or purpose; choose the complete system only when you need it."
      />
      <section aria-labelledby="compare-groups-title">
        <div className="discern-catalogue-results-header">
          <h2 id="compare-groups-title">Compare a Group</h2>
          <p>Focused sets</p>
        </div>
        <div className="discern-catalogue-route-grid">
          {groupComponentEntries(sortedComponents).map(({ group, entries }) => (
            <CatalogueRouteCard
              href={compareHref({ group })}
              title={group}
              description={`Compare ${entries.length} Components side by side.`}
              count={entries.length}
              key={group}
            />
          ))}
        </div>
      </section>
      <section
        className="discern-catalogue-collections"
        aria-labelledby="compare-purposes-title"
      >
        <div className="discern-catalogue-results-header">
          <h2 id="compare-purposes-title">Compare by purpose</h2>
          <p>Cross-Group collections</p>
        </div>
        <div className="discern-catalogue-route-grid">
          {cataloguePurposes.map((purpose) => {
            const count = sortedComponents.filter(({ meta }) =>
              meta.purposes?.includes(purpose)
            ).length;
            return (
              <CatalogueRouteCard
                href={compareHref({ purpose })}
                title={purposeDetails[purpose].label}
                description={purposeDetails[purpose].description}
                count={count}
                key={purpose}
              />
            );
          })}
          <CatalogueRouteCard
            href={compareHref({ all: true })}
            eyebrow="Exhaustive"
            title="Complete system"
            description="Compare every Component only when a whole-system view is necessary."
            count={sortedComponents.length}
          />
        </div>
      </section>
    </div>
  );
}

export function ComparePage(
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
  const scope = resolveCompareScope(
    new URLSearchParams(globalThis.location.search),
    sortedComponents,
  );
  if (scope === undefined) {
    return <CompareLanding sortedComponents={sortedComponents} />;
  }

  const groupedComponents = groupComponentEntries(scope.components);
  const scopeValue = scope.kind === "all"
    ? "all"
    : scope.kind === "group"
    ? `group:${catalogueGroupSlug(scope.group)}`
    : `purpose:${scope.purpose}`;
  const group = scope.kind === "group" ? scope.group : undefined;
  const purpose = scope.kind === "purpose" ? scope.purpose : undefined;
  const all = scope.kind === "all";

  const changeScope = (value: string): void => {
    if (value === "all") {
      globalThis.location.assign(
        compareHref({ all: true, surface: defaultSurface }),
      );
      return;
    }
    const [kind, selection] = value.split(":", 2);
    if (kind === "group") {
      const nextGroup = catalogueGroupFromSlug(selection ?? null);
      if (nextGroup !== undefined) {
        globalThis.location.assign(compareHref({
          group: nextGroup,
          surface: defaultSurface,
        }));
      }
      return;
    }
    const nextPurpose = cataloguePurpose(selection ?? null);
    if (nextPurpose !== undefined) {
      globalThis.location.assign(compareHref({
        purpose: nextPurpose,
        surface: defaultSurface,
      }));
    }
  };

  return (
    <div className="discern-catalogue-page discern-catalogue-review">
      <CataloguePageHeader
        index="06"
        eyebrow="Compare"
        title={scope.title}
        description={`Comparing ${scope.components.length} Component${
          scope.components.length === 1 ? "" : "s"
        }.`}
      />
      <div className="discern-catalogue-review-controls">
        <label>
          <span>Comparison scope</span>
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
                  value={`group:${catalogueGroupSlug(candidate)}`}
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
                <option value={`purpose:${candidate}`} key={candidate}>
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
              href={compareHref({ group, purpose, all, surface: "web" })}
              aria-current={defaultSurface === "web" ? "page" : undefined}
            >
              Web
            </a>
            <a
              href={compareHref({ group, purpose, all, surface: "cli" })}
              aria-current={defaultSurface === "cli" ? "page" : undefined}
            >
              CLI
            </a>
          </div>
        </div>
        <a
          className="discern-catalogue-review-controls__exit"
          href={catalogueRoutePaths.compare}
        >
          Change scope
        </a>
      </div>
      {groupedComponents.map(({ group: candidate, entries }) => (
        <section
          className="discern-catalogue-component-group"
          id={`group-${catalogueGroupSlug(candidate)}`}
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
