import { compositionRecipes } from "../../compositions.tsx";
import type { LocalNavigationProps } from "../navigation-types.ts";

export function CompositionsNavigation(
  { route, url, onNavigate }: LocalNavigationProps,
) {
  if (route.family !== "compositions") return null;
  return (
    <>
      <span className="discern-catalogue-nav__heading">Recipes</span>
      {compositionRecipes.map((recipe) => {
        const hash = `#recipe-${recipe.id}`;
        return (
          <a
            className="discern-catalogue-nav__child"
            href={hash}
            aria-current={url.hash === hash ? "location" : undefined}
            onClick={onNavigate}
            key={recipe.id}
          >
            {recipe.title}
          </a>
        );
      })}
    </>
  );
}
