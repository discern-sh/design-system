import type { CatalogueRouteFamily } from "./types.ts";
import { routeDescriptorSearchRecord } from "./types.ts";

export const overviewRouteFamily: CatalogueRouteFamily = {
  descriptor: {
    id: "overview",
    label: "Overview",
    path: "/catalogue/",
    description: "Start with the part of the design system you need.",
    searchTerms: ["home", "start", "catalogue"],
  },
  match: (pathname) =>
    pathname === "/catalogue/"
      ? { family: "overview", page: "index" }
      : undefined,
  ownsShellPath: (pathname) => pathname === "/catalogue/",
  searchRecords: () => [routeDescriptorSearchRecord(
    overviewRouteFamily.descriptor,
  )],
};
