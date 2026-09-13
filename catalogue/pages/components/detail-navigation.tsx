import { preserveCatalogueAppearanceHref } from "../../shell/appearance-state.ts";
import {
  componentReturnHref,
  preserveComponentReturnHref,
} from "./return-context.ts";
import { registry, type RegistryEntry } from "../../generated/registry.ts";
import { catalogueRoutePaths } from "../../routes.ts";
import { catalogueHref, componentGroupHref } from "../shared.tsx";
import {
  componentDetailHref,
  type ComponentDetailState,
} from "./detail-state.ts";

/** Discovery-owned return links, independent of the detail specimen. */
export function ComponentDetailBreadcrumb(
  { entry }: { readonly entry: RegistryEntry },
) {
  const url = typeof location === "undefined"
    ? undefined
    : new URL(location.href);
  const returnHref = url === undefined ? undefined : componentReturnHref(url);
  return (
    <nav className="discern-catalogue-breadcrumb" aria-label="Breadcrumb">
      <a
        href={returnHref ?? (url === undefined
          ? catalogueRoutePaths.components
          : preserveCatalogueAppearanceHref(
            url,
            catalogueRoutePaths.components,
          ))}
      >
        {returnHref === undefined ? "Components" : "Back to results"}
      </a>
      <span aria-hidden="true">/</span>
      {returnHref === undefined
        ? (
          <a
            href={url === undefined
              ? componentGroupHref(entry.meta.group)
              : preserveCatalogueAppearanceHref(
                url,
                componentGroupHref(entry.meta.group),
              )}
          >
            {entry.meta.group}
          </a>
        )
        : <span>{entry.meta.group}</span>}
      <span aria-hidden="true">/</span>
      <span aria-current="page">{entry.meta.name}</span>
    </nav>
  );
}

/** Canonical group neighbours and comparison entry preserve the selected state. */
export function ComponentDetailNavigation(
  { entry, state }: {
    readonly entry: RegistryEntry;
    readonly state: ComponentDetailState;
  },
) {
  const grouped = registry.filter(({ meta }) => meta.group === entry.meta.group)
    .toSorted((left, right) => left.meta.order - right.meta.order);
  const index = grouped.findIndex(({ meta }) => meta.slug === entry.meta.slug);
  const previous = index > 0 ? grouped[index - 1] : undefined;
  const next = index >= 0 && index < grouped.length - 1
    ? grouped[index + 1]
    : undefined;
  const neighbourHref = (candidate: RegistryEntry) => {
    const href = componentDetailHref(candidate, {
      ...state,
      exampleId: candidate.canonicalExamples.some(({ id }) =>
          id === state.exampleId
        )
        ? state.exampleId
        : candidate.canonicalExamples[0]?.id ?? "default",
    });
    return typeof location === "undefined"
      ? href
      : preserveComponentReturnHref(new URL(location.href), href);
  };
  const compareHref = catalogueHref(catalogueRoutePaths.compare, {
    components: entry.meta.slug,
    surface: state.surface === "cli" ? "cli" : undefined,
    examples: `${entry.meta.slug}:${state.exampleId}`,
  });

  return (
    <nav
      className="discern-catalogue-detail__continuation"
      aria-label="Component continuation"
    >
      <span>
        {previous === undefined
          ? null
          : (
            <a rel="prev" href={neighbourHref(previous)}>
              ← {previous.meta.name}
            </a>
          )}
      </span>
      <a href={compareHref}>Compare {entry.meta.name}</a>
      <span>
        {next === undefined
          ? null
          : <a rel="next" href={neighbourHref(next)}>{next.meta.name} →</a>}
      </span>
    </nav>
  );
}
