import { DocsNav } from "../../../src/components/docs/docs-nav/docs-nav.tsx";
import type { DocsNavItem } from "../../../src/components/docs/docs-nav/docs-nav.tsx";
import {
  type CliCompositionRecipe,
  cliCompositionRecipes,
} from "../../cli-compositions.ts";
import {
  catalogueRoutePaths,
  catalogueTerminalLayoutPath,
} from "../../routes.ts";
import type {
  CatalogueNavigationSections,
  LocalNavigationProps,
} from "../navigation-types.ts";

function terminalRecipeNavigationItems(
  recipes: readonly CliCompositionRecipe[],
  activeRecipeId: string | undefined,
): readonly DocsNavItem[] {
  return recipes.map((recipe) => ({
    label: recipe.title,
    href: catalogueTerminalLayoutPath(recipe.id),
    current: activeRecipeId === recipe.id ? "location" as const : false,
  }));
}

/** Standalone projection retained for source-enrolment tests. */
export function TerminalRecipeNavigation(
  { recipes, activeRecipeId, onNavigate }: {
    readonly recipes: readonly CliCompositionRecipe[];
    readonly activeRecipeId: string | undefined;
    readonly onNavigate: () => void;
  },
) {
  return (
    <DocsNav
      sections={[{
        items: terminalRecipeNavigationItems(recipes, activeRecipeId),
      }]}
      onClick={onNavigate}
    />
  );
}

/** Source-backed terminal layout destinations projected into shared DocsNav. */
export function terminalNavigationSections(
  { route }: LocalNavigationProps,
): CatalogueNavigationSections {
  if (route.family !== "terminal") return [];
  return [{
    title: "Layouts",
    items: [
      {
        label: "All layouts",
        href: catalogueRoutePaths.terminal,
        current: route.page === "index" ? "location" : false,
      },
      ...terminalRecipeNavigationItems(
        cliCompositionRecipes,
        route.page === "detail" ? route.recipeId : undefined,
      ),
    ],
  }];
}
