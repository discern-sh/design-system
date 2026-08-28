import { useEffect, useState } from "react";
import { CopyButton } from "../../../src/components/docs/copy-button/copy-button.tsx";
import type { CompositionRecipe } from "../../compositions.tsx";
import {
  compositionConstituents,
  compositionRecipes,
  illustrativePatternStatus,
} from "../../compositions.tsx";
import {
  canonicalCompositionUrl,
  compositionRecipeIdFromUrl,
  compositionRecipePath,
  compositionsRouteFamily,
} from "../../routes/compositions.ts";
import { catalogueComponentPath } from "../../routes/components.ts";
import { CataloguePageHeader } from "../shared.tsx";

export interface CompositionGalleryItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly componentNames: readonly string[];
}

export type CompositionWidthPresetId = "narrow" | "standard" | "wide";

/** Reproducible real CSS widths for reviewing responsive pattern behaviour. */
export const compositionWidthPresets = Object.freeze(
  [
    { id: "narrow", label: "Narrow", pixels: 360 },
    { id: "standard", label: "Standard", pixels: 720 },
    { id: "wide", label: "Wide", pixels: 1000 },
  ] as const,
);

export function compositionWidthPreset(
  value: string | null,
): (typeof compositionWidthPresets)[number] {
  return compositionWidthPresets.find(({ id }) => id === value) ??
    compositionWidthPresets[1];
}

/** Change only responsive review state while preserving the detail destination. */
export function compositionWidthUrl(
  current: URL,
  width: CompositionWidthPresetId,
): URL {
  const url = canonicalCompositionUrl(current);
  url.searchParams.set("width", width);
  return url;
}

export function compositionRecipeNeighbours(
  recipes: readonly CompositionRecipe[],
  id: string,
): Readonly<{
  previous: CompositionRecipe | undefined;
  next: CompositionRecipe | undefined;
}> {
  const index = recipes.findIndex((recipe) => recipe.id === id);
  return {
    previous: index > 0 ? recipes[index - 1] : undefined,
    next: index >= 0 && index < recipes.length - 1
      ? recipes[index + 1]
      : undefined,
  };
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
  {
    recipe,
    recipes,
    currentUrl,
  }: {
    readonly recipe: CompositionRecipe;
    readonly recipes: readonly CompositionRecipe[];
    readonly currentUrl: URL;
  },
) {
  const { id, title, description, journey, Example, source } = recipe;
  const [width, setWidth] = useState<CompositionWidthPresetId>(
    () => compositionWidthPreset(currentUrl.searchParams.get("width")).id,
  );
  const constituents = compositionConstituents(recipe);
  const neighbours = compositionRecipeNeighbours(recipes, id);

  useEffect(() => {
    if (typeof globalThis.history === "undefined") return;
    const canonical = canonicalCompositionUrl(currentUrl);
    if (canonical.href !== currentUrl.href) {
      globalThis.history.replaceState(
        null,
        "",
        canonical.pathname + canonical.search + canonical.hash,
      );
    }
  }, [currentUrl]);

  const changeWidth = (next: CompositionWidthPresetId): void => {
    setWidth(next);
    if (typeof globalThis.history === "undefined") return;
    const url = compositionWidthUrl(liveCatalogueUrl(), next);
    globalThis.history.replaceState(
      null,
      "",
      url.pathname + url.search + url.hash,
    );
  };

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
        data-discern-pattern-width={width}
      >
        <fieldset className="discern-catalogue-pattern__widths">
          <legend>Preview width</legend>
          {compositionWidthPresets.map((preset) => (
            <label key={preset.id}>
              <input
                type="radio"
                name="composition-width"
                value={preset.id}
                checked={width === preset.id}
                onChange={() => changeWidth(preset.id)}
              />
              <span>{preset.label}</span>
              <small>{preset.pixels}px</small>
            </label>
          ))}
        </fieldset>
        <div className="discern-catalogue-pattern__canvas">
          <div className="discern-catalogue-pattern__viewport">
            <Example />
          </div>
        </div>
      </section>
      <section
        className="discern-catalogue-pattern__components"
        aria-labelledby={`pattern-${id}-components`}
      >
        <h2 id={`pattern-${id}-components`}>Built from</h2>
        <ul>
          {constituents.map(({ slug, name }) => (
            <li key={slug}>
              <a href={catalogueComponentPath(slug)}>{name}</a>
            </li>
          ))}
        </ul>
      </section>
      <details className="discern-catalogue-pattern__source">
        <summary>View adaptable example source</summary>
        <div>
          <p>{recipe.status.sourceGuidance}</p>
          <div className="discern-catalogue-pattern__source-heading">
            <span>Example TSX</span>
            <CopyButton
              value={source}
              label="Copy adaptable example source"
              copiedLabel="Adaptable example source copied"
            />
          </div>
          <pre tabIndex={0}><code>{source}</code></pre>
        </div>
      </details>
      <nav
        className="discern-catalogue-pattern__pagination"
        aria-label="Pattern navigation"
      >
        {neighbours.previous === undefined ? <span /> : (
          <a
            className="discern-catalogue-pattern__previous"
            href={compositionRecipePath(neighbours.previous.id)}
          >
            <small>Previous pattern</small>
            {neighbours.previous.title}
          </a>
        )}
        <a
          className="discern-catalogue-pattern__gallery-link"
          href={compositionsRouteFamily.descriptor.path}
        >
          All patterns
        </a>
        {neighbours.next === undefined ? <span /> : (
          <a
            className="discern-catalogue-pattern__next"
            href={compositionRecipePath(neighbours.next.id)}
          >
            <small>Next pattern</small>
            {neighbours.next.title}
          </a>
        )}
      </nav>
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
  return recipe === undefined ? <CompositionNotFound /> : (
    <CompositionDetail
      recipe={recipe}
      recipes={recipes}
      currentUrl={currentUrl}
    />
  );
}
