import { useMemo } from "react";
import { Kbd } from "../../src/components/docs/kbd/kbd.tsx";
import {
  SearchPalette,
  SearchPaletteResult,
} from "../../src/components/docs/search-palette/search-palette.tsx";
import { publicTokens } from "../../src/token-inventory.ts";
import { cliCompositionRecipes } from "../cli-compositions.ts";
import { compositionRecipes } from "../compositions.tsx";
import { registry } from "../generated/registry.ts";
import { catalogueDecisionCopyProps } from "../metadata-copy.ts";
import {
  catalogueNavigation,
  catalogueRoutePaths,
  catalogueSearchRecords,
} from "../routes.ts";
import { explanatoryMatchReason, searchRecords } from "../search/mod.ts";
import { terminalFoundationSheets } from "../terminal-foundations.ts";

export function GlobalSearch(
  {
    open,
    query,
    onOpenChange,
    onQueryChange,
  }: {
    readonly open: boolean;
    readonly query: string;
    readonly onOpenChange: (open: boolean) => void;
    readonly onQueryChange: (query: string) => void;
  },
) {
  const records = useMemo(() =>
    catalogueSearchRecords({
      components: registry,
      tokens: publicTokens,
      compositions: compositionRecipes,
      terminalLayouts: cliCompositionRecipes,
      terminalFoundations: terminalFoundationSheets,
    }), []);
  const results = useMemo(
    () => searchRecords(records, query, { limit: 30 }),
    [query, records],
  );
  const close = (): void => {
    onOpenChange(false);
    onQueryChange("");
  };

  return (
    <SearchPalette
      open={open}
      onOpenChange={(next) => next ? onOpenChange(true) : close()}
      value={query}
      onValueChange={onQueryChange}
      label="Search the Catalogue"
      placeholder="Find a Component, Token, Composition, or layout"
      icon={<span>⌕</span>}
      hint={
        <span>
          <Kbd>Esc</Kbd> close
        </span>
      }
    >
      {query.trim() === ""
        ? (
          <ul className="discern-search-palette__list">
            {catalogueNavigation.slice(1, 4).map((destination) => (
              <li key={destination.id}>
                <SearchPaletteResult
                  href={destination.path}
                  title={destination.label}
                  context={destination.description}
                  onClick={close}
                />
              </li>
            ))}
          </ul>
        )
        : results.length === 0
        ? (
          <div className="discern-catalogue-search-recovery">
            <p {...catalogueDecisionCopyProps}>No matches for “{query}”.</p>
            <div>
              <a href={catalogueRoutePaths.components} onClick={close}>
                View all Components
              </a>
              <button type="button" onClick={() => onQueryChange("")}>
                Clear search
              </button>
            </div>
          </div>
        )
        : (
          <ul className="discern-search-palette__list">
            {results.map((result) => {
              const reason = explanatoryMatchReason(result);
              return (
                <li key={result.record.id}>
                  <SearchPaletteResult
                    href={result.record.href}
                    title={result.record.title}
                    context={
                      <>
                        <span>{result.record.context}</span>
                        {reason === undefined ? null : (
                          <span
                            className="discern-catalogue-search-match"
                            {...catalogueDecisionCopyProps}
                          >
                            Matched {reason.label.toLowerCase()}: {reason.value}
                          </span>
                        )}
                      </>
                    }
                    onClick={close}
                  />
                </li>
              );
            })}
          </ul>
        )}
    </SearchPalette>
  );
}
