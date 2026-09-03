import type { CompositionRecipe } from "../../compositions.tsx";
import { compositionRecipes } from "../../compositions.tsx";
import { packageVersion } from "../../generated/registry.ts";
import type { RegistryEntry } from "../../generated/registry.ts";
import type { CatalogueTerminalPresentation } from "../../terminal-theme.ts";
import type { CatalogueAxesSelection } from "../../shell/axes-state.ts";
import { catalogueAppearanceRootStyle } from "../../shell/axes-state.ts";
import { ComponentPreview } from "../components/component-preview.tsx";
import type { CatalogueSurface } from "../shared.tsx";

function JourneyPreview({ recipe }: { readonly recipe: CompositionRecipe }) {
  const { id, title, description, journey, Example } = recipe;
  if (journey === undefined) return null;
  const titleId = `journey-${id}-title`;
  return (
    <section
      className="discern-catalogue-journey"
      data-discern-journey={id}
      data-discern-journey-stages={JSON.stringify(journey.stages)}
      aria-labelledby={titleId}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="discern-catalogue-journey__canvas">
        <Example />
      </div>
    </section>
  );
}

export function ConformancePage(
  {
    components,
    accent,
    field,
    fieldScheme,
    includeJourneys,
    surface,
    terminalPresentation,
    theme,
  }: {
    readonly components: readonly RegistryEntry[];
    readonly accent: number | undefined;
    readonly field: CatalogueAxesSelection;
    readonly fieldScheme: "light" | "dark";
    readonly includeJourneys: boolean;
    readonly surface: CatalogueSurface;
    readonly terminalPresentation: CatalogueTerminalPresentation;
    readonly theme: "system" | "light" | "dark";
  },
) {
  return (
    <main
      className="discern-catalogue-conformance"
      data-discern-root
      data-discern-theme={theme}
      data-discern-accent={accent === undefined ? undefined : ""}
      data-discern-conformance-ready="true"
      style={catalogueAppearanceRootStyle(field, fieldScheme, accent)}
    >
      <h1 className="discern-visually-hidden">
        Discern component conformance sheet
      </h1>
      <p className="discern-catalogue-conformance__identity">
        @discern-sh/design-system v{packageVersion}
      </p>
      {includeJourneys
        ? compositionRecipes.map((recipe) => (
          <JourneyPreview recipe={recipe} key={recipe.id} />
        ))
        : null}
      {components.map((entry) => (
        <ComponentPreview
          entry={entry}
          surface={surface}
          terminalPresentation={terminalPresentation}
          key={entry.meta.slug}
        />
      ))}
    </main>
  );
}
