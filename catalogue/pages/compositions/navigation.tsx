import type { CompositionRecipe } from "../../compositions.tsx";
import { compositionRecipes } from "../../compositions.tsx";
import {
  compositionNavigationItems,
  compositionRecipeIdFromUrl,
} from "../../routes/compositions.ts";
import type { LocalNavigationProps } from "../navigation-types.ts";

export function CompositionsNavigation(
  {
    route,
    url,
    onNavigate,
    recipes = compositionRecipes,
  }: LocalNavigationProps & {
    readonly recipes?: readonly CompositionRecipe[];
  },
) {
  if (route.family !== "compositions") return null;
  const currentId = route.page === "detail"
    ? route.slug
    : compositionRecipeIdFromUrl(url);
  return (
    <>
      <span className="discern-catalogue-nav__heading">
        Illustrative patterns
      </span>
      {compositionNavigationItems(recipes).map((pattern) => (
        <a
          className="discern-catalogue-nav__child"
          href={pattern.href}
          aria-current={currentId === pattern.id ? "page" : undefined}
          onClick={onNavigate}
          key={pattern.id}
        >
          {pattern.title}
        </a>
      ))}
    </>
  );
}
