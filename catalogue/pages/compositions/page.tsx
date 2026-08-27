import { compositionRecipes } from "../../compositions.tsx";
import { CataloguePageHeader, CopyableCode } from "../shared.tsx";

export function CompositionsPage() {
  return (
    <div className="discern-catalogue-page" id="compositions">
      <CataloguePageHeader
        index="04"
        eyebrow="Compositions"
        title="Components working together."
        description="Adaptable patterns for common documentation and tool-output journeys."
      />
      <div className="discern-catalogue-recipes">
        {compositionRecipes.map((
          { id, title, description, journey, Example, source },
        ) => (
          <section
            className="discern-catalogue-recipe"
            id={`recipe-${id}`}
            data-discern-journey={journey === undefined ? undefined : id}
            data-discern-journey-stages={journey === undefined
              ? undefined
              : JSON.stringify(journey.stages)}
            key={id}
          >
            <header>
              <h2>{title}</h2>
              <p>{description}</p>
            </header>
            <div className="discern-catalogue-recipe__preview">
              <Example />
            </div>
            <details className="discern-catalogue-recipe__source">
              <summary>Copy recipe source</summary>
              <CopyableCode label="Recipe source" value={source} />
            </details>
          </section>
        ))}
      </div>
    </div>
  );
}
