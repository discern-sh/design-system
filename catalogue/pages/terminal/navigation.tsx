import { cliCompositionRecipes } from "../../cli-compositions.ts";
import type { LocalNavigationProps } from "../navigation-types.ts";

export function TerminalNavigation(
  { route, url, onNavigate }: LocalNavigationProps,
) {
  if (route.family !== "terminal") return null;
  return (
    <>
      <span className="discern-catalogue-nav__heading">Layouts</span>
      {cliCompositionRecipes.map((recipe) => {
        const hash = `#terminal-layout-${recipe.id}`;
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
