import {
  type CliCompositionRecipe,
  cliCompositionRecipes,
} from "../../cli-compositions.ts";
import { registry } from "../../generated/registry.ts";
import {
  catalogueComponentPath,
  catalogueRoutePaths,
  catalogueTerminalLayoutPath,
} from "../../routes.ts";
import type { CatalogueRoute } from "../../routes.ts";
import { TerminalLayoutLab } from "../../terminal-layout-inspector.tsx";
import type { CatalogueTerminalPresentation } from "../../terminal-theme.ts";
import { NotFoundPage } from "../not-found/page.tsx";
import { CatalogueIndexCard, CataloguePageHeader } from "../shared.tsx";

function componentName(slug: string): string {
  return registry.find(({ meta }) => meta.slug === slug)?.meta.name ?? slug;
}

/** Previous and next recipes in the canonical recipe order. */
export function terminalRecipeNeighbors(
  recipes: readonly CliCompositionRecipe[],
  recipeId: string,
): {
  readonly previous?: CliCompositionRecipe;
  readonly next?: CliCompositionRecipe;
} {
  const index = recipes.findIndex(({ id }) => id === recipeId);
  if (index < 0) return {};
  return {
    ...(index > 0 ? { previous: recipes[index - 1] } : {}),
    ...(index < recipes.length - 1 ? { next: recipes[index + 1] } : {}),
  };
}

/** Lightweight chooser derived from the complete recipe authority. */
export function TerminalIndexPage(
  { recipes = cliCompositionRecipes }: {
    readonly recipes?: readonly CliCompositionRecipe[];
  },
) {
  return (
    <div className="discern-catalogue-page" id="terminal-layouts">
      <CataloguePageHeader
        index="05"
        eyebrow="Terminal layouts"
        title="Choose one complete frame."
        description="Open a focused capability lab for one complete CLI layout."
      />
      <h2 className="discern-visually-hidden">Terminal layout recipes</h2>
      <div className="discern-catalogue-terminal-index">
        {recipes.map((recipe) => (
          <CatalogueIndexCard
            variant="compact"
            href={catalogueTerminalLayoutPath(recipe.id)}
            title={recipe.title}
            description={recipe.description}
            action="Inspect layout"
            metadata={
              <span>
                {recipe.components.length}{" "}
                Component{recipe.components.length === 1 ? "" : "s"}
              </span>
            }
            secondaryActions={recipe.components.map((slug) => ({
              href: catalogueComponentPath(slug),
              label: componentName(slug),
              ariaLabel: `Inspect ${componentName(slug)} Component`,
              className: "discern-catalogue-terminal-index__component",
            }))}
            data-discern-terminal-index-card={recipe.id}
            key={recipe.id}
          />
        ))}
      </div>
    </div>
  );
}

/** One recipe detail where the real frame leads the capability controls. */
export function TerminalDetailPage(
  { recipe, recipes, terminalPresentation, currentUrl }: {
    readonly recipe: CliCompositionRecipe;
    readonly recipes: readonly CliCompositionRecipe[];
    readonly terminalPresentation: CatalogueTerminalPresentation;
    readonly currentUrl: URL;
  },
) {
  const neighbors = terminalRecipeNeighbors(recipes, recipe.id);
  return (
    <div className="discern-catalogue-page discern-catalogue-terminal-detail">
      <nav className="discern-catalogue-breadcrumb" aria-label="Breadcrumb">
        <a href={catalogueRoutePaths.terminal}>Terminal layouts</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{recipe.title}</span>
      </nav>
      <CataloguePageHeader
        index="05"
        eyebrow="Terminal layout"
        title={recipe.title}
        description={recipe.description}
      />
      <div
        className="discern-catalogue-terminal-detail__components"
        aria-label="Components in this layout"
      >
        {recipe.components.map((slug) => (
          <a href={catalogueComponentPath(slug)} key={slug}>
            {componentName(slug)}
          </a>
        ))}
      </div>
      <TerminalLayoutLab
        recipe={recipe}
        presentation={terminalPresentation}
        initialUrl={currentUrl}
      />
      <nav
        className="discern-catalogue-terminal-detail__continuation"
        aria-label="Terminal layout continuation"
      >
        {neighbors.previous === undefined
          ? <span />
          : (
            <a href={catalogueTerminalLayoutPath(neighbors.previous.id)}>
              ← {neighbors.previous.title}
            </a>
          )}
        <a href={catalogueRoutePaths.terminal}>All terminal layouts</a>
        {neighbors.next === undefined
          ? <span />
          : (
            <a href={catalogueTerminalLayoutPath(neighbors.next.id)}>
              {neighbors.next.title} →
            </a>
          )}
      </nav>
    </div>
  );
}

export function TerminalPage(
  { route, currentUrl, terminalPresentation }: {
    readonly route: Extract<CatalogueRoute, { readonly family: "terminal" }>;
    readonly currentUrl: URL;
    readonly terminalPresentation: CatalogueTerminalPresentation;
  },
) {
  if (route.page === "index") return <TerminalIndexPage />;
  const recipe = cliCompositionRecipes.find(({ id }) => id === route.recipeId);
  if (recipe === undefined) return <NotFoundPage />;
  return (
    <TerminalDetailPage
      recipe={recipe}
      recipes={cliCompositionRecipes}
      terminalPresentation={terminalPresentation}
      currentUrl={currentUrl}
    />
  );
}
