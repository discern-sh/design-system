import type {
  CatalogueNavigationSections,
  LocalNavigationProps,
} from "../navigation-types.ts";
import { catalogueNavigationLabel } from "../navigation-types.ts";
import { componentDirectory } from "../components/collections.ts";
import { parseCompareState } from "./state.ts";

/** Source-backed Compare destinations projected into the shared DocsNav. */
export function compareNavigationSections(
  { route, url, sortedComponents }: LocalNavigationProps,
): CatalogueNavigationSections {
  if (route.family !== "compare") return [];
  const directory = componentDirectory(sortedComponents);
  const state = parseCompareState(url, sortedComponents);
  return [
    {
      title: "Compare a Group",
      items: directory.groups.map((collection) => ({
        label: catalogueNavigationLabel(
          collection.label,
          collection.members.length,
        ),
        href: collection.compareHref,
        current: state.scope?.kind === "group" &&
            state.scope.group === collection.group
          ? "location" as const
          : false,
      })),
    },
    {
      title: "Other scopes",
      items: [
        {
          label: "Custom selection",
          href: "/catalogue/review/?components=",
          current: state.scope?.kind === "custom" ? "location" : false,
        },
        {
          label: catalogueNavigationLabel(
            "Complete system",
            directory.components.length,
          ),
          href: "/catalogue/review/?scope=all",
          current: state.scope?.kind === "all" ? "location" : false,
        },
      ],
    },
  ];
}
