import type { CompositionRecipe } from "../../compositions.tsx";
import {
  compositionConstituents,
  compositionRecipes,
  illustrativePatternStatus,
} from "../../compositions.tsx";
import {
  compositionRecipeIdFromUrl,
  compositionRecipePath,
  compositionsRouteFamily,
} from "../../routes/compositions.ts";
import { CataloguePageHeader } from "../shared.tsx";

export interface CompositionGalleryItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly componentNames: readonly string[];
}

/** Gallery facts projected directly from the ordered recipe authority. */
export function compositionGalleryItems(
  recipes: readonly CompositionRecipe[],
): readonly CompositionGalleryItem[] {
  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    href: compositionRecipePath(recipe.id),
    componentNames: compositionConstituents(recipe).map(({ name }) => name),
  }));
}

function liveCatalogueUrl(): URL {
  return typeof globalThis.location === "undefined"
    ? new URL(
      compositionsRouteFamily.descriptor.path,
      "https://catalogue.invalid",
    )
    : new URL(globalThis.location.href);
}

function ComponentSummary(
  { names }: { readonly names: readonly string[] },
) {
  const visible = names.slice(0, 3);
  const remaining = names.length - visible.length;
  return (
    <p
      className="discern-catalogue-pattern-card__components"
      aria-label={`Components: ${names.join(", ")}`}
    >
      {visible.join(" · ")}
      {remaining > 0 ? <span>+{remaining} more</span> : null}
    </p>
  );
}

function CompositionsGallery(
  { recipes }: { readonly recipes: readonly CompositionRecipe[] },
) {
  return (
    <div className="discern-catalogue-page" id="compositions">
      <CataloguePageHeader
        index="04"
        eyebrow="Compositions"
        title="Illustrative patterns for real interfaces."
        description="High-quality demonstrations of Components working together, curated to help you recognise and shape a complete experience."
      />
      <p className="discern-catalogue-pattern-status">
        {illustrativePatternStatus.label}s
      </p>
      <div className="discern-catalogue-pattern-grid">
        {compositionGalleryItems(recipes).map((pattern) => (
          <article
            className="discern-catalogue-pattern-card"
            data-discern-composition-card={pattern.id}
            key={pattern.id}
          >
            <h2>
              <a href={pattern.href}>{pattern.title}</a>
            </h2>
            <p>{pattern.description}</p>
            <ComponentSummary names={pattern.componentNames} />
            <a
              className="discern-catalogue-pattern-card__action"
              href={pattern.href}
              aria-label={`View ${pattern.title} pattern`}
            >
              View pattern <span aria-hidden="true">→</span>
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}

function CompositionNotFound() {
  return (
    <div className="discern-catalogue-page discern-catalogue-pattern-empty">
      <p className="discern-catalogue-pattern-status">
        {illustrativePatternStatus.label}
      </p>
      <h1>Pattern not found</h1>
      <p>This Composition is not part of the current gallery.</p>
      <a href={compositionsRouteFamily.descriptor.path}>
        Return to the gallery
      </a>
    </div>
  );
}

function CompositionDetail(
  { recipe }: { readonly recipe: CompositionRecipe },
) {
  const { id, title, description, journey, Example } = recipe;
  return (
    <article
      className="discern-catalogue-page discern-catalogue-pattern"
      id={`recipe-${id}`}
      data-discern-composition-detail={id}
      data-discern-journey={journey === undefined ? undefined : id}
      data-discern-journey-stages={journey === undefined
        ? undefined
        : JSON.stringify(journey.stages)}
    >
      <header className="discern-catalogue-pattern__header">
        <a href={compositionsRouteFamily.descriptor.path}>← Compositions</a>
        <p className="discern-catalogue-pattern-status">
          {recipe.status.label}
        </p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <section
        className="discern-catalogue-pattern__demonstration"
        aria-label="Pattern demonstration"
      >
        <div className="discern-catalogue-pattern__canvas">
          <div className="discern-catalogue-pattern__viewport">
            <Example />
          </div>
        </div>
      </section>
    </article>
  );
}

export interface CompositionsPageProps {
  readonly recipes?: readonly CompositionRecipe[];
  readonly currentUrl?: URL;
}

export function CompositionsPage(
  {
    recipes = compositionRecipes,
    currentUrl = liveCatalogueUrl(),
  }: CompositionsPageProps,
) {
  const selectedId = compositionRecipeIdFromUrl(currentUrl);
  if (selectedId === undefined) {
    return <CompositionsGallery recipes={recipes} />;
  }
  const recipe = recipes.find(({ id }) => id === selectedId);
  return recipe === undefined
    ? <CompositionNotFound />
    : <CompositionDetail recipe={recipe} />;
}
