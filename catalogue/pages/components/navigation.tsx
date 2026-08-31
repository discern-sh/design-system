import { catalogueGroupFromSlug } from "../../routes.ts";
import type {
  CatalogueNavigationSections,
  LocalNavigationProps,
} from "../navigation-types.ts";
import { catalogueNavigationLabel } from "../navigation-types.ts";
import { componentGroupHref } from "../shared.tsx";
import { componentDirectory } from "./collections.ts";
import { componentDetailHref, parseComponentDetailState } from "./state.ts";

/** Source-backed Component destinations projected into the shared DocsNav. */
export function componentsNavigationSections(
  { route, url, sortedComponents }: LocalNavigationProps,
): CatalogueNavigationSections {
  if (route.family !== "components") return [];
  const activeGroup = catalogueGroupFromSlug(url.searchParams.get("group"));
  const activePurpose = url.searchParams.get("purpose");
  const directory = componentDirectory(sortedComponents);
  if (route.page === "detail") {
    const componentEntry = sortedComponents.find(({ meta }) =>
      meta.slug === route.slug
    );
    if (componentEntry === undefined) return [];
    const groupEntries = directory.groups.find(({ group }) =>
      group === componentEntry.meta.group
    )?.members ?? [];
    const detailState = parseComponentDetailState(componentEntry, url, "web");
    return [
      {
        items: [{
          label: `← ${componentEntry.meta.group} Components`,
          href: componentGroupHref(componentEntry.meta.group),
        }],
      },
      {
        title: componentEntry.meta.group,
        items: groupEntries.map((candidate) => ({
          label: candidate.meta.name,
          href: componentDetailHref(candidate, {
            ...detailState,
            exampleId: candidate.canonicalExamples.some(({ id }) =>
                id === detailState.exampleId
              )
              ? detailState.exampleId
              : candidate.canonicalExamples[0]?.id ?? "default",
          }),
          current: candidate.meta.slug === componentEntry.meta.slug
            ? "location" as const
            : false,
        })),
      },
    ];
  }
  return [
    {
      title: "Groups",
      items: directory.groups.map(({ group, members, browseHref }) => ({
        label: catalogueNavigationLabel(group, members.length),
        href: browseHref,
        current: activeGroup === group ? "location" as const : false,
      })),
    },
    {
      title: "Purposes",
      items: directory.purposes.map((
        { purpose, label, browseHref, members },
      ) => ({
        label: catalogueNavigationLabel(label, members.length),
        href: browseHref,
        current: activePurpose === purpose ? "location" as const : false,
      })),
    },
  ];
}
