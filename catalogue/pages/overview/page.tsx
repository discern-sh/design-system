import { Kicker } from "../../../src/components/display/kicker/kicker.tsx";
import { allTokens } from "../../../src/tokens/tokens.ts";
import { componentGroups } from "../../../src/types/component-meta.ts";
import { cliCompositionRecipes } from "../../cli-compositions.ts";
import { compositionRecipes } from "../../compositions.tsx";
import { registry } from "../../generated/registry.ts";
import { catalogueNavigation } from "../../routes.ts";
import { CatalogueRouteCard } from "../shared.tsx";

const counts = {
  overview: "Start here",
  components: registry.length,
  foundations: allTokens.length,
  compositions: compositionRecipes.length,
  terminal: cliCompositionRecipes.length,
  compare: "Choose a scope",
} as const;

export function OverviewPage() {
  return (
    <div className="discern-catalogue-page discern-catalogue-overview">
      <section className="discern-catalogue-hero">
        <span className="discern-kicker">
          <span className="discern-catalogue-live-dot" />
          <span className="discern-kicker__text">Design system Catalogue</span>
        </span>
        <h1>
          Discern, built as a <em>system</em>.
        </h1>
        <p>
          Find a Component, explore a foundation, or choose a focused
          comparison.
        </p>
        <div className="discern-catalogue-stats">
          <span>{allTokens.length} tokens</span>
          <span>{registry.length} components</span>
          <span>{componentGroups.length} groups</span>
        </div>
      </section>
      <section aria-labelledby="catalogue-explore-title">
        <div className="discern-catalogue-section__header">
          <div>
            <Kicker index="01">— Explore</Kicker>
            <h2 id="catalogue-explore-title">Choose where to start.</h2>
          </div>
        </div>
        <div className="discern-catalogue-route-grid">
          {catalogueNavigation.map((destination) => (
            <CatalogueRouteCard
              href={destination.path}
              title={destination.label}
              description={destination.description}
              count={counts[destination.id]}
              key={destination.id}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
