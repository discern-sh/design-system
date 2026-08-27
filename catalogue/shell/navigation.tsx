import { useEffect, useState } from "react";
import type { RegistryEntry } from "../generated/registry.ts";
import { packageVersion } from "../generated/registry.ts";
import { LocalNavigation } from "../pages/local-navigation.tsx";
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
      <nav className="discern-catalogue-nav" aria-label="Catalogue">
        {catalogueNavigation.map((item) => {
          const active = route.family === item.id;
          return (
            <a
              href={item.path}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              key={item.id}
            >
              {item.label}
            </a>
          );
        })}
        <LocalNavigation
          route={route}
          url={navigationUrl}
          sortedComponents={sortedComponents}
          onNavigate={onNavigate}
        />
        <a
          className="discern-catalogue-nav__experimental"
          href="/catalogue/builder/"
          onClick={onNavigate}
        >
          <span>Interface builder ↗</span>
          <small>Beta</small>
        </a>
      </nav>
      <p className="discern-catalogue-sidebar__version">
        @discern-sh/design-system v{packageVersion}
      </p>
    </>
  );
}
