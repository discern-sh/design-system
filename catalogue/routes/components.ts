import type {
  ComponentGroup,
  ComponentMeta,
} from "../../src/types/component-meta.ts";
import type { SearchRecord } from "../search/mod.ts";
import type { CatalogueRouteFamily } from "./types.ts";
import { routeDescriptorSearchRecord } from "./types.ts";

export const componentsRouteFamily: CatalogueRouteFamily = {
  descriptor: {
    id: "components",
    label: "Components",
    path: "/catalogue/components/",
    description: "Find a Component and inspect its Web and CLI examples.",
    searchTerms: ["find", "browse", "groups", "purposes", "ui"],
  },
  match: (pathname) => {
    if (pathname === componentsRouteFamily.descriptor.path) {
      return { family: "components", page: "index" };
    }
    const detail = /^\/catalogue\/components\/([^/]+)\/$/.exec(pathname);
    if (detail?.[1] === undefined) return undefined;
    try {
      return {
        family: "components",
        page: "detail",
        slug: decodeURIComponent(detail[1]),
      };
    } catch {
      return { family: "not-found", page: "not-found" };
    }
  },
  ownsShellPath: (pathname) =>
    pathname === componentsRouteFamily.descriptor.path ||
    /^\/catalogue\/components\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(pathname),
  searchRecords: (sources) => [
    routeDescriptorSearchRecord(componentsRouteFamily.descriptor),
    ...componentSearchRecords(sources.components),
  ],
};

/** Canonical detail path for one generated Component. */
export function catalogueComponentPath(slug: string): string {
  return `${componentsRouteFamily.descriptor.path}${encodeURIComponent(slug)}/`;
}

/** Stable URL slug for one metadata-owned Component Group. */
export function catalogueGroupSlug(group: ComponentGroup): string {
  return group.toLowerCase();
}

/** Resolve a URL slug back to a canonical metadata-owned Component Group. */
export function catalogueGroupFromSlug(
  slug: string | null,
  groups: readonly ComponentGroup[],
): ComponentGroup | undefined {
  return groups.find((group) => catalogueGroupSlug(group) === slug);
}

/** Component provider shared by global search and restricted local explorers. */
export function componentSearchRecords<
  T extends { readonly meta: ComponentMeta },
>(
  entries: readonly T[],
): readonly SearchRecord<T>[] {
  return entries.map((entry, order) => ({
    id: `component:${entry.meta.slug}`,
    href: catalogueComponentPath(entry.meta.slug),
    title: entry.meta.name,
    context: `Component · ${entry.meta.group}`,
    slug: entry.meta.slug,
    group: entry.meta.group,
    description: entry.meta.description,
    ...(entry.meta.purposes === undefined ? {} : {
      purposes: entry.meta.purposes.map((purpose) =>
        purpose.replaceAll("-", " ").replace(
          /^./,
          (letter) => letter.toUpperCase(),
        )
      ),
    }),
    facts: [
      ...(entry.meta.useWhen ?? []).map((value) => ({
        label: "Use when",
        value,
      })),
      ...(entry.meta.notWhen ?? []).map((value) => ({
        label: "Not when",
        value,
      })),
      ...(entry.meta.accessibility ?? []).map((value) => ({
        label: "Guidance",
        value,
      })),
    ],
    order,
    payload: entry,
  }));
}
