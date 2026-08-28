import {
  type CliCompositionRecipe,
  cliCompositionRecipes,
} from "../../cli-compositions.ts";
import {
  catalogueRoutePaths,
  catalogueTerminalLayoutPath,
} from "../../routes.ts";
import type { LocalNavigationProps } from "../navigation-types.ts";

/** Recipe links projected from the same source-backed inventory as the pages. */
export function TerminalRecipeNavigation(
  { recipes, activeRecipeId, onNavigate }: {
    readonly recipes: readonly CliCompositionRecipe[];
    readonly activeRecipeId: string | undefined;
    readonly onNavigate: () => void;
  },
) {
  return (
    <>
      {recipes.map((recipe) => (
        <a
          className="discern-catalogue-nav__child"
          href={catalogueTerminalLayoutPath(recipe.id)}
          aria-current={activeRecipeId === recipe.id ? "page" : undefined}
          onClick={onNavigate}
          key={recipe.id}
        >
          {recipe.title}
        </a>
      ))}
    </>
  );
}

export function TerminalNavigation(
  { route, onNavigate }: LocalNavigationProps,
) {
  if (route.family !== "terminal") return null;
  return (
    <>
      <span className="discern-catalogue-nav__heading">Layouts</span>
      <a
        className="discern-catalogue-nav__child"
        href={catalogueRoutePaths.terminal}
        aria-current={route.page === "index" ? "page" : undefined}
        onClick={onNavigate}
      >
        All layouts
      </a>
      <TerminalRecipeNavigation
        recipes={cliCompositionRecipes}
        activeRecipeId={route.page === "detail" ? route.recipeId : undefined}
        onNavigate={onNavigate}
      />
    </>
  );
}
