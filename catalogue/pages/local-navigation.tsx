import { compareNavigationSections } from "./compare/navigation.tsx";
import { componentsNavigationSections } from "./components/navigation.tsx";
import { compositionNavigationSections } from "./compositions/navigation.tsx";
import { foundationsNavigationSections } from "./foundations/navigation.tsx";
import type {
  CatalogueNavigationSections,
  LocalNavigationProps,
} from "./navigation-types.ts";
import { terminalNavigationSections } from "./terminal/navigation.tsx";

/** Project current route-family facts into the shared DocsNav authority. */
export function localNavigationSections(
  props: LocalNavigationProps,
): CatalogueNavigationSections {
  switch (props.route.family) {
    case "components":
      return componentsNavigationSections(props);
    case "foundations":
      return foundationsNavigationSections(props);
    case "compositions":
      return compositionNavigationSections(props);
    case "terminal":
      return terminalNavigationSections(props);
    case "compare":
      return compareNavigationSections(props);
    case "overview":
    case "not-found":
      return [];
  }
}
