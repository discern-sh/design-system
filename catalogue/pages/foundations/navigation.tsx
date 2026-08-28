import { useEffect, useState } from "react";
import { allTokens } from "../../../src/tokens/tokens.ts";
import {
  catalogueTerminalFoundationPath,
  foundationsPaths,
  foundationsUrlChangeEvent,
  foundationTokenCategories,
  foundationTokenCategoryPath,
  foundationTokenExplorerState,
} from "../../routes/foundations.ts";
import type { CatalogueRoute } from "../../routes/types.ts";
import type { TerminalFoundationSheet } from "../../terminal-foundations.ts";
import { terminalFoundationSheets } from "../../terminal-foundations.ts";
import type { LocalNavigationProps } from "../navigation-types.ts";

interface FoundationsNavigationContentProps {
  readonly route: Extract<CatalogueRoute, { readonly family: "foundations" }>;
  readonly url: URL;
  readonly onNavigate: () => void;
  readonly sheets: readonly TerminalFoundationSheet[];
}

function NavigationLink(
  { href, label, current, onNavigate }: {
    readonly href: string;
    readonly label: string;
    readonly current: boolean;
    readonly onNavigate: () => void;
  },
) {
  return (
    <a
      className="discern-catalogue-nav__child"
      href={href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
    >
      {label}
    </a>
  );
}

/** Contextual Foundations navigation projected from Token and sheet authorities. */
export function FoundationsNavigationContent(
  { route, url, onNavigate, sheets }: FoundationsNavigationContentProps,
) {
  if (route.page === "index") {
    return (
      <>
        <span className="discern-catalogue-nav__heading">Explore</span>
        <NavigationLink
          href={foundationsPaths.tokens}
          label="Tokens"
          current={false}
          onNavigate={onNavigate}
        />
        <NavigationLink
          href={foundationsPaths.terminal}
          label="Terminal foundations"
          current={false}
          onNavigate={onNavigate}
        />
      </>
    );
  }
  if (route.page === "tokens") {
    const state = foundationTokenExplorerState(url, allTokens);
    return (
      <>
        <NavigationLink
          href={foundationsPaths.index}
          label="← Foundations"
          current={false}
          onNavigate={onNavigate}
        />
        <span className="discern-catalogue-nav__heading">Token categories</span>
        <NavigationLink
          href={foundationsPaths.tokens}
          label="All"
          current={state.category === undefined}
          onNavigate={onNavigate}
        />
        {foundationTokenCategories(allTokens).map((category) => (
          <NavigationLink
            href={foundationTokenCategoryPath(category)}
            label={category}
            current={state.category === category}
            onNavigate={onNavigate}
            key={category}
          />
        ))}
      </>
    );
  }
  return (
    <>
      <NavigationLink
        href={foundationsPaths.index}
        label="← Foundations"
        current={false}
        onNavigate={onNavigate}
      />
      <span className="discern-catalogue-nav__heading">
        Terminal foundations
      </span>
      <NavigationLink
        href={foundationsPaths.terminal}
        label="All sheets"
        current={route.page === "terminal-index"}
        onNavigate={onNavigate}
      />
      {sheets.map((sheet) => (
        <NavigationLink
          href={catalogueTerminalFoundationPath(sheet.id)}
          label={sheet.title}
          current={route.page === "terminal-detail" &&
            route.sheetId === sheet.id}
          onNavigate={onNavigate}
          key={sheet.id}
        />
      ))}
    </>
  );
}

export function FoundationsNavigation(
  { route, url, onNavigate }: LocalNavigationProps,
) {
  const [currentUrl, setCurrentUrl] = useState(url);
  const urlHref = url.href;
  useEffect(() => setCurrentUrl(new URL(urlHref)), [urlHref]);
  useEffect(() => {
    const sync = (): void => setCurrentUrl(new URL(globalThis.location.href));
    globalThis.addEventListener("popstate", sync);
    globalThis.addEventListener(foundationsUrlChangeEvent, sync);
    return () => {
      globalThis.removeEventListener("popstate", sync);
      globalThis.removeEventListener(foundationsUrlChangeEvent, sync);
    };
  }, []);
  if (route.family !== "foundations") return null;
  return (
    <FoundationsNavigationContent
      route={route}
      url={currentUrl}
      onNavigate={onNavigate}
      sheets={terminalFoundationSheets}
    />
  );
}
