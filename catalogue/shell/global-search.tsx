import { representativeComponentExampleImage } from "../example-images.ts";
import {
  catalogueRecentStorageKey,
  recentCatalogueRecords,
  rememberCatalogueRecord,
} from "../search/recent.ts";
import type { SearchRecord, SearchResult } from "../search/mod.ts";
import { catalogueRoute } from "../routes.ts";
import { preserveCatalogueAppearanceHref } from "./appearance-state.ts";
import { useMemo, useRef, useState } from "react";
import { Kbd } from "../../src/components/docs/kbd/kbd.tsx";
import {
  SearchPalette,
  SearchPaletteResult,
} from "../../src/components/docs/search-palette/search-palette.tsx";
import { publicTokens } from "../../src/token-inventory.ts";
import { glyphAtlasData } from "../../src/glyphs/atlas.ts";
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
    theme,
    onOpenChange,
    onQueryChange,
  }: {
    readonly open: boolean;
    readonly query: string;
    readonly theme: "light" | "dark";
    readonly onOpenChange: (open: boolean) => void;
    readonly onQueryChange: (query: string) => void;
  },
) {
  const records = useMemo(() =>
    catalogueSearchRecords({
      components: registry,
      glyphs: glyphAtlasData,
      tokens: publicTokens,
      compositions: compositionRecipes,
      terminalLayouts: cliCompositionRecipes,
      terminalFoundations: terminalFoundationSheets,
    }), []);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [recent, setRecent] = useState(() => {
    try {
      return recentCatalogueRecords(
        records,
        localStorage.getItem(catalogueRecentStorageKey),
      );
    } catch {
      return [];
    }
  });
  const saveRecent = (next: readonly SearchRecord[]): void => {
    setRecent(next);
    try {
      localStorage.setItem(
        catalogueRecentStorageKey,
        JSON.stringify(next.map(({ id }) => id)),
      );
    } catch { /* Search remains usable without persistence. */ }
  };
  const results = useMemo(
    () => searchRecords(records, query.slice(0, 256), { limit: 30 }),
    [query, records],
  );
  const close = (): void => {
    onOpenChange(false);
    onQueryChange("");
  };

  const groups = new Map<
    string,
    { label: string; results: readonly SearchResult[] }
  >();
  for (const result of results) {
    const family =
      catalogueRoute(new URL(result.record.href, globalThis.location.href))
        .family;
    const descriptor = catalogueNavigation.find(({ id }) => id === family);
    const group = groups.get(family);
    groups.set(family, {
      label: descriptor?.label ?? "Destinations",
      results: [...(group?.results ?? []), result],
    });
  }
  const cue = (record: SearchRecord) => {
    const route = catalogueRoute(
      new URL(record.href, globalThis.location.href),
    );
    const image = route.family === "components" && route.page === "detail"
      ? representativeComponentExampleImage(route.slug, theme)
      : undefined;
    return image
      ? (
        <img
          src={image.assetUrl}
          alt=""
          width="48"
          height="32"
          loading="lazy"
        />
      )
      : record.literals?.[0] ??
        catalogueNavigation.find(({ id }) => id === route.family)?.label.slice(
          0,
          1,
        );
  };
  const destination = (
    record: SearchRecord,
    reason?: ReturnType<typeof explanatoryMatchReason>,
  ) => (
    <li key={record.id}>
      <SearchPaletteResult
        href={preserveCatalogueAppearanceHref(
          new URL(globalThis.location.href),
          record.href,
        )}
        title={
          <>
            <span className="discern-catalogue-search-cue" aria-hidden="true">
              {cue(record)}
            </span>
            {record.title}
          </>
        }
        context={
          <>
            <span>{record.context}</span>
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
        onClick={() => {
          saveRecent(rememberCatalogueRecord(recent, record));
          close();
        }}
      />
    </li>
  );
  return (
    <SearchPalette
      ref={dialogRef}
      className="discern-catalogue-global-search"
      open={open}
      onOpenChange={(next) => next ? onOpenChange(true) : close()}
      value={query}
      onValueChange={onQueryChange}
      label="Search the Catalogue"
      placeholder="Find a Component, Glyph, Token, Composition, or layout"
      icon={<span>⌕</span>}
      inputProps={{ maxLength: 256 }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        const dialog = dialogRef.current;
        if (!dialog) return;
        const links = [
          ...dialog.querySelectorAll<HTMLAnchorElement>(
            ".discern-search-palette__result",
          ),
        ];
        if (links.length === 0) return;
        const current = links.indexOf(
          document.activeElement as HTMLAnchorElement,
        );
        const next = current + (event.key === "ArrowDown" ? 1 : -1);
        event.preventDefault();
        if (current >= 0 && next < 0) {
          dialog.querySelector<HTMLInputElement>(
            "input",
          )?.focus();
        } else {links[
            current < 0
              ? (event.key === "ArrowDown" ? 0 : links.length - 1)
              : Math.min(next, links.length - 1)
          ]?.focus();}
      }}
      hint={
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> move · <Kbd>Enter</Kbd> open ·{" "}
          <Kbd>Esc</Kbd> close
        </span>
      }
    >
      <p className="discern-visually-hidden" role="status" aria-live="polite">
        {query.trim() === ""
          ? `${recent.length} recent destinations`
          : `${results.length}${results.length === 30 ? " top" : ""} results`}
      </p>
      {query.trim() === ""
        ? (
          <>
            {recent.length === 0
              ? null
              : (
                <section aria-label="Recent destinations">
                  <div className="discern-catalogue-search-group">
                    <h2>Recent destinations</h2>
                    <button
                      type="button"
                      onClick={() => {
                        saveRecent([]);
                        dialogRef.current?.querySelector("input")?.focus();
                      }}
                    >
                      Clear recent
                    </button>
                  </div>
                  <ul className="discern-search-palette__list">
                    {recent.map((record) => destination(record))}
                  </ul>
                </section>
              )}
            <section aria-label="Explore the Catalogue">
              <div className="discern-catalogue-search-group">
                <h2>Explore the Catalogue</h2>
              </div>
              <ul className="discern-search-palette__list">
                {catalogueNavigation.slice(1, 4).flatMap((item) => {
                  const record = records.find((record) =>
                    record.href === item.path
                  );
                  return record ? [destination(record)] : [];
                })}
              </ul>
            </section>
          </>
        )
        : results.length === 0
        ? (
          <div className="discern-catalogue-search-recovery">
            <p {...catalogueDecisionCopyProps}>No matches for “{query}”.</p>
            <div>
              <a href={catalogueRoutePaths.components} onClick={close}>
                View all Components
              </a>
              <a href={catalogueRoutePaths.glyphs} onClick={close}>
                Browse Glyphs
              </a>
              <button
                type="button"
                onClick={() => {
                  onQueryChange("");
                  dialogRef.current?.querySelector("input")?.focus();
                }}
              >
                Clear search
              </button>
            </div>
          </div>
        )
        : (
          <>
            {[...groups].map(([id, group]) => (
              <section key={id} aria-label={group.label}>
                <div className="discern-catalogue-search-group">
                  <h2>{group.label}</h2>
                  <span>{group.results.length}</span>
                </div>
                <ul className="discern-search-palette__list">
                  {group.results.map((result) =>
                    destination(result.record, explanatoryMatchReason(result))
                  )}
                </ul>
              </section>
            ))}
          </>
        )}
    </SearchPalette>
  );
}
