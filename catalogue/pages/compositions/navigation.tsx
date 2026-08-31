import { DocsNav } from "../../../src/components/docs/docs-nav/docs-nav.tsx";
import type { CompositionRecipe } from "../../compositions.tsx";
import { compositionRecipes } from "../../compositions.tsx";
import {
  compositionNavigationItems,
  compositionRecipeIdFromUrl,
} from "../../routes/compositions.ts";
import type {
  CatalogueNavigationSections,
  LocalNavigationProps,
} from "../navigation-types.ts";

/** Source-backed Composition destinations projected into the shared DocsNav. */
export function compositionNavigationSections(
  {
    route,
    url,
    recipes = compositionRecipes,
  }: LocalNavigationProps & {
    readonly recipes?: readonly CompositionRecipe[];
  },
): CatalogueNavigationSections {
  if (route.family !== "compositions") return [];
  const currentId = route.page === "detail"
    ? route.slug
    : compositionRecipeIdFromUrl(url);
  return [{
    title: "Illustrative patterns",
    items: compositionNavigationItems(recipes).map((pattern) => ({
      label: pattern.title,
      href: pattern.href,
      current: currentId === pattern.id ? "location" as const : false,
    })),
  }];
}

/** Standalone projection retained for source-enrolment tests. */
export function CompositionsNavigation(
  props: LocalNavigationProps & {
    readonly recipes?: readonly CompositionRecipe[];
    readonly onNavigate: () => void;
  },
) {
  return (
    <DocsNav
      sections={compositionNavigationSections(props)}
      onClick={props.onNavigate}
    />
  );
}
