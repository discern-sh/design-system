import { useEffect, useState } from "react";
import { DocsNav } from "../../src/components/docs/docs-nav/docs-nav.tsx";
import type { RegistryEntry } from "../generated/registry.ts";
import { packageVersion } from "../generated/registry.ts";
import { localNavigationSections } from "../pages/local-navigation.tsx";
import { catalogueNavigationLabel } from "../pages/navigation-types.ts";
import type { CatalogueRoute } from "../routes.ts";
import { catalogueNavigation, catalogueRoutePaths } from "../routes.ts";
import { catalogueLocationChangeEvent } from "./location.ts";

export function CatalogueNavigation(
  {
    route,
    sortedComponents,
    onNavigate,
  }: {
    readonly route: CatalogueRoute;
    readonly sortedComponents: readonly RegistryEntry[];
    readonly onNavigate: () => void;
  },
) {
  const [navigationUrl, setNavigationUrl] = useState(() =>
    new URL(globalThis.location.href)
  );
  useEffect(() => {
    const synchronise = (): void => {
      setNavigationUrl(new URL(globalThis.location.href));
    };
    globalThis.addEventListener("hashchange", synchronise);
    globalThis.addEventListener("popstate", synchronise);
    globalThis.addEventListener(catalogueLocationChangeEvent, synchronise);
    return () => {
      globalThis.removeEventListener("hashchange", synchronise);
      globalThis.removeEventListener("popstate", synchronise);
      globalThis.removeEventListener(catalogueLocationChangeEvent, synchronise);
    };
  }, []);

  const sections = [
    {
      items: catalogueNavigation.map((item) => ({
        label: item.label,
        href: item.path,
        current: route.family === item.id,
      })),
    },
    ...localNavigationSections({
      route,
      url: navigationUrl,
      sortedComponents,
    }),
    {
      title: "More",
      items: [{
        label: catalogueNavigationLabel("Interface builder ↗", "Beta"),
        href: "/catalogue/builder/",
      }],
    },
  ];

  return (
    <>
      <div className="discern-catalogue-sidebar__header">
        <a
          className="discern-catalogue-brand"
          href={catalogueRoutePaths.overview}
          onClick={onNavigate}
        >
          <span className="discern-catalogue-brand__mark" aria-hidden="true">
            ◮
          </span>
          <span>
            <strong>discern</strong>
            <small>Design system</small>
          </span>
        </a>
        <span
          className="discern-visually-hidden"
          id="discern-catalogue-navigation-title"
        >
          Catalogue navigation
        </span>
        <button
          className="discern-catalogue-sidebar__close"
          type="button"
          aria-label="Close Catalogue navigation"
          onClick={onNavigate}
        >
          ×
        </button>
      </div>
      <DocsNav
        className="discern-catalogue-nav"
        label="Catalogue"
        sections={sections}
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("a[href]") !== null
          ) onNavigate();
        }}
      />
      <p className="discern-catalogue-sidebar__version">
        @discern-sh/design-system v{packageVersion}
      </p>
    </>
  );
}
