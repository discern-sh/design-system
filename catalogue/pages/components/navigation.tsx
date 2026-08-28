import { catalogueGroupFromSlug } from "../../routes.ts";
import type { LocalNavigationProps } from "../navigation-types.ts";
import { componentGroupHref } from "../shared.tsx";
import { componentDirectory } from "./collections.ts";
import { componentDetailHref, parseComponentDetailState } from "./state.ts";

export function ComponentsNavigation(
  { route, url, sortedComponents, onNavigate }: LocalNavigationProps,
) {
  if (route.family !== "components") return null;
  const activeGroup = catalogueGroupFromSlug(url.searchParams.get("group"));
  const activePurpose = url.searchParams.get("purpose");
  const directory = componentDirectory(sortedComponents);
  if (route.page === "detail") {
    const componentEntry = sortedComponents.find(({ meta }) =>
      meta.slug === route.slug
    );
    if (componentEntry === undefined) return null;
    const groupEntries = directory.groups.find(({ group }) =>
      group === componentEntry.meta.group
    )?.members ?? [];
    const detailState = parseComponentDetailState(componentEntry, url, "web");
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
        {groupEntries.map((candidate) => (
          <a
            className="discern-catalogue-nav__child"
            href={componentDetailHref(candidate, {
              ...detailState,
              exampleId: candidate.canonicalExamples.some(({ id }) =>
                  id === detailState.exampleId
                )
                ? detailState.exampleId
                : candidate.canonicalExamples[0]?.id ?? "default",
            })}
            aria-current={candidate.meta.slug === componentEntry.meta.slug
              ? "location"
              : undefined}
            onClick={onNavigate}
            key={candidate.meta.slug}
          >
            {candidate.meta.name}
          </a>
        ))}
      </>
    );
  }
  return (
    <>
      <span className="discern-catalogue-nav__heading">Groups</span>
      {directory.groups.map(({ group, members, browseHref }) => (
        <a
          className="discern-catalogue-nav__child"
          href={browseHref}
          aria-current={activeGroup === group ? "location" : undefined}
          onClick={onNavigate}
          key={group}
        >
          {group}
          <small>{members.length}</small>
        </a>
      ))}
      <span className="discern-catalogue-nav__heading">Purposes</span>
      {directory.purposes.map(({ purpose, label, browseHref, members }) => (
        <a
          className="discern-catalogue-nav__child"
          href={browseHref}
          aria-current={activePurpose === purpose ? "location" : undefined}
          onClick={onNavigate}
          key={purpose}
        >
          {label}
          <small>{members.length}</small>
        </a>
      ))}
    </>
  );
}
