import type { CatalogueRouteFamily } from "./types.ts";
import { routeDescriptorSearchRecord } from "./types.ts";

export const compareRouteFamily: CatalogueRouteFamily = {
  descriptor: {
    id: "compare",
    label: "Compare",
    path: "/catalogue/review/",
    description:
      "Compare a focused Component Group, purpose, or the complete system.",
    searchTerms: ["review", "compare", "group", "purpose", "complete"],
  },
  match: (pathname) =>
    pathname === compareRouteFamily.descriptor.path
      ? { family: "compare", page: "index" }
      : undefined,
  ownsShellPath: (pathname) => pathname === compareRouteFamily.descriptor.path,
  searchRecords: () => [routeDescriptorSearchRecord(
    compareRouteFamily.descriptor,
  )],
};
