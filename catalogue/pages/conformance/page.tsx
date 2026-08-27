import type { TerminalThemeVariant } from "../../../src/cli/theme.ts";
import type { CompositionRecipe } from "../../compositions.tsx";
import { compositionRecipes } from "../../compositions.tsx";
import { packageVersion } from "../../generated/registry.ts";
import type { RegistryEntry } from "../../generated/registry.ts";
import { ComponentPreview } from "../components/component-preview.tsx";

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
    includeJourneys,
    terminalTheme,
    theme,
  }: {
    readonly components: readonly RegistryEntry[];
    readonly includeJourneys: boolean;
    readonly terminalTheme: TerminalThemeVariant;
    readonly theme: "system" | "light" | "dark";
  },
) {
  return (
    <main
      className="discern-catalogue-conformance"
      data-discern-root
      data-discern-theme={theme}
      data-discern-conformance-ready="true"
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
          surface="web"
          terminalTheme={terminalTheme}
          key={entry.meta.slug}
        />
      ))}
    </main>
  );
}
