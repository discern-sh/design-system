import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Kbd } from "../../src/components/docs/kbd/kbd.tsx";
import { SkipLink } from "../../src/components/docs/skip-link/skip-link.tsx";
import type { RegistryEntry } from "../generated/registry.ts";
import type { CatalogueRoute } from "../routes.ts";
import { AppearanceControl } from "./appearance.tsx";
import type { AppearanceControlProps } from "./appearance.tsx";
import { GlobalSearch } from "./global-search.tsx";
import { useMobileDrawer } from "./mobile-drawer.ts";
import { CatalogueNavigation } from "./navigation.tsx";

export function CatalogueShell(
  {
    route,
    sortedComponents,
    appearance,
    style,
    children,
  }: {
    readonly route: CatalogueRoute;
    readonly sortedComponents: readonly RegistryEntry[];
    readonly appearance: AppearanceControlProps;
    readonly style: React.CSSProperties;
    readonly children: ReactNode;
  },
) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeNavigation = useCallback(() => setMobileNavOpen(false), []);
  const { drawerRef, triggerRef, drawerProps } = useMobileDrawer(
    mobileNavOpen,
    setMobileNavOpen,
  );
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) return;
      event.preventDefault();
      setMobileNavOpen(false);
      setSearchOpen(true);
    };
    document.addEventListener("keydown", openSearch);
    return () => document.removeEventListener("keydown", openSearch);
  }, []);

  return (
    <div
      className="discern-catalogue-shell"
      data-discern-root
      data-discern-theme={appearance.theme}
      data-discern-appearance={appearance.appearance}
      data-discern-theme-consumer=""
      data-discern-theme-control=".discern-catalogue-appearance .discern-theme-switcher"
      data-discern-theme-storage-key="discern-catalogue-appearance"
      data-discern-theme-storage-parameter="theme"
      style={style}
    >
      <SkipLink
        href="#discern-catalogue-main"
        data-discern-drawer-background=""
        onClick={() => requestAnimationFrame(() => mainRef.current?.focus())}
      />
      <aside
        ref={drawerRef}
        id="discern-catalogue-sidebar"
        className="discern-catalogue-sidebar"
        data-discern-open={mobileNavOpen ? "true" : undefined}
        {...drawerProps}
      >
        <CatalogueNavigation
          route={route}
          sortedComponents={sortedComponents}
          onNavigate={closeNavigation}
        />
      </aside>
      {mobileNavOpen
        ? (
          <div
            className="discern-catalogue-nav-backdrop"
            aria-hidden="true"
            onClick={closeNavigation}
          />
        )
        : null}

      <header
        className="discern-catalogue-toolbar"
        data-discern-drawer-background=""
      >
        <button
          ref={triggerRef}
          className="discern-catalogue-menu"
          type="button"
          aria-label="Open Catalogue navigation"
          aria-expanded={mobileNavOpen}
          aria-controls="discern-catalogue-sidebar"
          onClick={() => {
            setSearchOpen(false);
            setMobileNavOpen(true);
          }}
        >
          ☰
        </button>
        <button
          className="discern-catalogue-search"
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            setMobileNavOpen(false);
            setSearchOpen(true);
          }}
        >
          <span aria-hidden="true">⌕</span>
          <span>Find in the Catalogue</span>
          <Kbd>/</Kbd>
        </button>
        <AppearanceControl {...appearance} />
      </header>

      <GlobalSearch
        open={searchOpen}
        query={searchQuery}
        onOpenChange={setSearchOpen}
        onQueryChange={setSearchQuery}
      />

      <main
        ref={mainRef}
        id="discern-catalogue-main"
        className="discern-catalogue-main"
        data-discern-drawer-background=""
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
