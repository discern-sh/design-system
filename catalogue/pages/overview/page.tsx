import { Button } from "../../../src/components/core/button/button.tsx";
import { Kicker } from "../../../src/components/display/kicker/kicker.tsx";
import { allTokens } from "../../../src/tokens/tokens.ts";
import { componentGroups } from "../../../src/types/component-meta.ts";
import { cliCompositionRecipes } from "../../cli-compositions.ts";
import { compositionRecipes } from "../../compositions.tsx";
import {
  componentExampleImagePresentation,
  representativeComponentExampleImage,
} from "../../example-images.ts";
import { registry } from "../../generated/registry.ts";
import { catalogueNavigation } from "../../routes.ts";
import { componentExplorerHref } from "../components/state.ts";
import { CatalogueIndexCard } from "../shared.tsx";

export const overviewCatalogueDestinations = catalogueNavigation.slice(1);

const findAComponentHref = componentExplorerHref({
  query: "",
  showAll: true,
});

const overviewRouteDetails = {
  components: {
    description: "Search by name, Group, or purpose, then inspect a Component.",
    count: `${registry.length} Components`,
    action: "Find a Component",
  },
  foundations: {
    description:
      "Explore Tokens and the visual rules shared by browser and terminal surfaces.",
    count: `${allTokens.length} Tokens`,
    action: "Explore Tokens",
  },
  compositions: {
    description:
      "Study adaptable browser patterns built from the package Components.",
    count: `${compositionRecipes.length} illustrative patterns`,
    action: "View illustrative patterns",
  },
  terminal: {
    description:
      "Inspect complete CLI frames at explicit sizes and capabilities.",
    count: `${cliCompositionRecipes.length} Terminal layouts`,
    action: "Inspect terminal layouts",
  },
  compare: {
    description:
      "Choose a Group, purpose, or the complete system and compare Components together.",
    count: `${componentGroups.length} Component Groups`,
    action: "Compare Components",
  },
} as const;

function overviewRepresentativeImages() {
  let fallback:
    | {
      readonly light: NonNullable<
        ReturnType<typeof representativeComponentExampleImage>
      >;
      readonly dark: NonNullable<
        ReturnType<typeof representativeComponentExampleImage>
      >;
    }
    | undefined;
  for (const { meta } of registry) {
    const light = representativeComponentExampleImage(meta.slug, "light");
    const dark = representativeComponentExampleImage(meta.slug, "dark");
    if (light === undefined || dark === undefined) continue;
    const pair = { light, dark };
    fallback ??= pair;
    if (light.width >= 240 && light.height >= 120) return pair;
  }
  return fallback;
}

const representativeImages = overviewRepresentativeImages();

function ComponentsRouteImage() {
  if (representativeImages === undefined) return null;
  const light = componentExampleImagePresentation(representativeImages.light);
  const dark = componentExampleImagePresentation(representativeImages.dark);
  return (
    <>
      <img
        className="discern-catalogue-index-card__theme-image"
        data-discern-image-theme="light"
        src={light.src}
        width={light.width}
        height={light.height}
        alt=""
      />
      <img
        className="discern-catalogue-index-card__theme-image"
        data-discern-image-theme="dark"
        src={dark.src}
        width={dark.width}
        height={dark.height}
        alt=""
      />
    </>
  );
}

export function OverviewPage() {
  return (
    <div className="discern-catalogue-page discern-catalogue-overview">
      <section className="discern-catalogue-hero">
        <span className="discern-kicker">
          <span className="discern-catalogue-live-dot" />
          <span className="discern-kicker__text">Design system Catalogue</span>
        </span>
        <h1>
          Find the part you <em>need</em>.
        </h1>
        <p>
          Start with a Component, Token, illustrative pattern, terminal layout,
          or focused comparison.
        </p>
        <div className="discern-catalogue-hero__actions">
          <Button
            href={findAComponentHref}
            data-discern-primary-catalogue-action=""
          >
            Find a Component
          </Button>
        </div>
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
          {overviewCatalogueDestinations.map((destination) => {
            if (destination.id === "overview") return null;
            const detail = overviewRouteDetails[destination.id];
            const lead = destination.id === "components";
            return (
              <CatalogueIndexCard
                data-discern-catalogue-destination={destination.id}
                href={destination.path}
                title={destination.label}
                description={detail.description}
                action={detail.action}
                metadata={<span>{detail.count}</span>}
                media={lead ? <ComponentsRouteImage /> : undefined}
                key={destination.id}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
