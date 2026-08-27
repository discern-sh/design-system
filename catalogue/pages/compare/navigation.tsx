import { compareHref, groupComponentEntries } from "../shared.tsx";
import { catalogueGroupFromSlug } from "../../routes.ts";
import type { LocalNavigationProps } from "../navigation-types.ts";

export function CompareNavigation(
  { route, url, sortedComponents, onNavigate }: LocalNavigationProps,
) {
  if (route.family !== "compare") return null;
  const activeGroup = catalogueGroupFromSlug(url.searchParams.get("group"));
  const complete = url.searchParams.get("scope") === "all";
  return (
    <>
      <span className="discern-catalogue-nav__heading">Compare Groups</span>
      {groupComponentEntries(sortedComponents).map(({ group, entries }) => (
        <a
          className="discern-catalogue-nav__child"
          href={compareHref({ group })}
          aria-current={!complete && activeGroup === group
            ? "location"
            : undefined}
          onClick={onNavigate}
          key={group}
        >
          {group}
          <small>{entries.length}</small>
        </a>
      ))}
      <a
        className="discern-catalogue-nav__child"
        href={compareHref({ all: true })}
        aria-current={complete ? "location" : undefined}
        onClick={onNavigate}
      >
        Complete system
        <small>{sortedComponents.length}</small>
      </a>
    </>
  );
}
