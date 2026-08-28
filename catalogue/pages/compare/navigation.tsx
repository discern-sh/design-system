import type { LocalNavigationProps } from "../navigation-types.ts";
import { componentDirectory } from "../components/collections.ts";
import { parseCompareState } from "./state.ts";

export function CompareNavigation(
  { route, url, sortedComponents, onNavigate }: LocalNavigationProps,
) {
  if (route.family !== "compare") return null;
  const directory = componentDirectory(sortedComponents);
  const state = parseCompareState(url, sortedComponents);
  return (
    <>
      <span className="discern-catalogue-nav__heading">Compare a Group</span>
      {directory.groups.map((collection) => (
        <a
          className="discern-catalogue-nav__child"
          href={collection.compareHref}
          aria-current={state.scope?.kind === "group" &&
              state.scope.group === collection.group
            ? "location"
            : undefined}
          onClick={onNavigate}
          key={collection.id}
        >
          {collection.label}
          <small>{collection.members.length}</small>
        </a>
      ))}
      <span className="discern-catalogue-nav__heading">Other scopes</span>
      <a
        className="discern-catalogue-nav__child"
        href="/catalogue/review/?components="
        aria-current={state.scope?.kind === "custom" ? "location" : undefined}
        onClick={onNavigate}
      >
        Custom selection
      </a>
      <a
        className="discern-catalogue-nav__child"
        href="/catalogue/review/?scope=all"
        aria-current={state.scope?.kind === "all" ? "location" : undefined}
        onClick={onNavigate}
      >
        Complete system<small>{directory.components.length}</small>
      </a>
    </>
  );
}
