import { createElement } from "react";
import type { ReactNode } from "react";
import type { DocsNavSection } from "../../src/components/docs/docs-nav/docs-nav.tsx";
import type { RegistryEntry } from "../generated/registry.ts";
import type { CatalogueRoute } from "../routes.ts";

export type CatalogueNavigationSections = readonly DocsNavSection[];

/** Align a navigation label and optional source-backed count as one link body. */
export function catalogueNavigationLabel(
  label: ReactNode,
  count?: ReactNode,
): ReactNode {
  return createElement(
    "span",
    { className: "discern-catalogue-nav__label" },
    createElement("span", null, label),
    count === undefined ? null : createElement("small", null, count),
  );
}

export interface LocalNavigationProps {
  readonly route: CatalogueRoute;
  readonly url: URL;
  readonly sortedComponents: readonly RegistryEntry[];
}
