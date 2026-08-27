import { cataloguePurposes } from "../../../src/types/component-meta.ts";
import {
  catalogueComponentPath,
  catalogueGroupFromSlug,
} from "../../routes.ts";
import type { LocalNavigationProps } from "../navigation-types.ts";
import {
  componentGroupHref,
  componentPurposeHref,
  groupComponentEntries,
  purposeDetails,
} from "../shared.tsx";

export function ComponentsNavigation(
  { route, url, sortedComponents, onNavigate }: LocalNavigationProps,
) {
  if (route.family !== "components") return null;
  const activeGroup = catalogueGroupFromSlug(url.searchParams.get("group"));
  const activePurpose = url.searchParams.get("purpose");
  if (route.page === "detail") {
    const componentEntry = sortedComponents.find(({ meta }) =>
      meta.slug === route.slug
    );
    if (componentEntry === undefined) return null;
    const groupEntries = sortedComponents.filter(({ meta }) =>
      meta.group === componentEntry.meta.group
    );
    return (
      <>
        <a
          className="discern-catalogue-nav__back"
          href={componentGroupHref(componentEntry.meta.group)}
          onClick={onNavigate}
        >
          <span aria-hidden="true">←</span>
          {componentEntry.meta.group} Components
        </a>
        <span className="discern-catalogue-nav__heading">
          {componentEntry.meta.group}
        </span>
        {groupEntries.map(({ meta }) => (
          <a
            className="discern-catalogue-nav__child"
            href={catalogueComponentPath(meta.slug)}
            aria-current={meta.slug === componentEntry.meta.slug
              ? "location"
              : undefined}
            onClick={onNavigate}
            key={meta.slug}
          >
            {meta.name}
          </a>
        ))}
      </>
    );
  }
  return (
    <>
      <span className="discern-catalogue-nav__heading">Groups</span>
      {groupComponentEntries(sortedComponents).map(({ group, entries }) => (
        <a
          className="discern-catalogue-nav__child"
          href={componentGroupHref(group)}
          aria-current={activeGroup === group ? "location" : undefined}
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
          aria-current={activePurpose === purpose ? "location" : undefined}
          onClick={onNavigate}
          key={purpose}
        >
          {purposeDetails[purpose].label}
        </a>
      ))}
    </>
  );
}
