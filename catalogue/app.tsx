import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useInitialFragmentTarget } from "../src/components/use-initial-fragment-target.ts";
import { componentGroups } from "../src/types/component-meta.ts";
import { glyphAtlasData } from "../src/glyphs/atlas.ts";
import { registry } from "./generated/registry.ts";
import { ComparePage } from "./pages/compare/page.tsx";
import { ComponentDetailPage } from "./pages/components/detail-page.tsx";
import { ComponentIndexPage } from "./pages/components/index-page.tsx";
import { CompositionsPage } from "./pages/compositions/page.tsx";
import { ConformancePage } from "./pages/conformance/page.tsx";
import { FoundationsPage } from "./pages/foundations/page.tsx";
import { GlyphsPage } from "./pages/glyphs/page.tsx";
import { NotFoundPage } from "./pages/not-found/page.tsx";
import { OverviewPage } from "./pages/overview/page.tsx";
import type { CatalogueSurface } from "./pages/shared.tsx";
import { catalogueSurface } from "./pages/shared.tsx";
import { TerminalPage } from "./pages/terminal/page.tsx";
import { canonicalCatalogueLegacyUrl, catalogueRoute } from "./routes.ts";
import { useCatalogueAppearance } from "./shell/appearance.tsx";
import { CatalogueShell } from "./shell/catalogue-shell.tsx";

function App() {
  useInitialFragmentTarget();
  const currentUrl = useMemo(() => new URL(globalThis.location.href), []);
  const route = catalogueRoute(currentUrl);
  const appearance = useCatalogueAppearance(currentUrl);
  const defaultSurface = catalogueSurface(
    currentUrl.searchParams.get("surface"),
  );
  const [componentSurfaces, setComponentSurfaces] = useState<
    Readonly<Record<string, CatalogueSurface>>
  >({});
  const sortedComponents = useMemo(
    () =>
      registry.slice().sort((left, right) =>
        componentGroups.indexOf(left.meta.group) -
          componentGroups.indexOf(right.meta.group) ||
        left.meta.order - right.meta.order
      ),
    [],
  );

  const selectedComponent = currentUrl.searchParams.get("component");
  const conformanceComponents = useMemo(
    () =>
      sortedComponents.filter(({ meta }) =>
        !selectedComponent || meta.slug === selectedComponent
      ),
    [selectedComponent, sortedComponents],
  );
  if (currentUrl.searchParams.get("conformance") === "1") {
    return (
      <ConformancePage
        appearance={appearance.appearance}
        accentHue={appearance.accentHue}
        components={conformanceComponents}
        field={appearance.field}
        fieldScheme={appearance.fieldScheme}
        includeJourneys={selectedComponent === null}
        surface={defaultSurface}
        terminalPresentation={appearance.terminalPresentation}
        theme={appearance.theme}
      />
    );
  }

  const changeComponentSurface = (
    slug: string,
    surface: CatalogueSurface,
  ): void => {
    setComponentSurfaces((current) => ({ ...current, [slug]: surface }));
  };

  const page = (() => {
    switch (route.family) {
      case "overview":
        return <OverviewPage />;
      case "components": {
        if (route.page === "index") {
          return <ComponentIndexPage sortedComponents={sortedComponents} />;
        }
        const entry = sortedComponents.find(({ meta }) =>
          meta.slug === route.slug
        );
        return entry === undefined ? <NotFoundPage /> : (
          <ComponentDetailPage
            entry={entry}
            surface={componentSurfaces[entry.meta.slug] ?? defaultSurface}
            terminalPresentation={appearance.terminalPresentation}
            onSurfaceChange={(surface) =>
              changeComponentSurface(entry.meta.slug, surface)}
          />
        );
      }
      case "foundations":
        return (
          <FoundationsPage
            terminalPresentation={appearance.terminalPresentation}
            field={appearance.field}
            fieldScheme={appearance.fieldScheme}
            appearance={appearance.appearance}
            accentHue={appearance.accentHue}
            onFieldChange={appearance.changeField}
          />
        );
      case "glyphs":
        return (
          <GlyphsPage
            route={route}
            data={glyphAtlasData}
            currentUrl={currentUrl}
          />
        );
      case "compositions":
        return <CompositionsPage />;
      case "terminal":
        return (
          <TerminalPage
            route={route}
            currentUrl={currentUrl}
            terminalPresentation={appearance.terminalPresentation}
          />
        );
      case "compare":
        return (
          <ComparePage
            sortedComponents={sortedComponents}
            defaultSurface={defaultSurface}
            componentSurfaces={componentSurfaces}
            terminalPresentation={appearance.terminalPresentation}
            onSurfaceChange={changeComponentSurface}
          />
        );
      case "not-found":
        return <NotFoundPage />;
    }
  })();

  return (
    <CatalogueShell
      route={route}
      sortedComponents={sortedComponents}
      appearance={{
        theme: appearance.theme,
        resolvedTheme: appearance.terminalPresentation.theme,
        appearance: appearance.appearance,
        accentHue: appearance.accentHue,
        field: appearance.field,
        onThemeChange: appearance.changeTheme,
        onAppearanceChange: appearance.changeAppearance,
        onAccentHueChange: appearance.changeAccentHue,
        onFieldChange: appearance.changeField,
        onFieldReset: appearance.resetField,
      }}
      style={appearance.style}
    >
      {page}
    </CatalogueShell>
  );
}

const requestedCatalogueUrl = new URL(globalThis.location.href);
const canonicalCatalogueUrl = canonicalCatalogueLegacyUrl(
  requestedCatalogueUrl,
);
if (canonicalCatalogueUrl.href !== requestedCatalogueUrl.href) {
  globalThis.history.replaceState(null, "", canonicalCatalogueUrl);
}

const root = document.getElementById("root");
if (!root) throw new Error("Catalogue root is missing");
createRoot(root).render(<App />);
