import { useId, useRef, useState } from "react";
import type { MouseEvent } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { Button } from "../../core/button/button.tsx";
import { Kbd } from "../kbd/kbd.tsx";
import meta, { componentExampleVocabulary } from "./search-palette.meta.ts";
import {
  SearchPalette,
  SearchPaletteEmpty,
  SearchPaletteList,
  SearchPaletteOption,
  SearchPaletteResult,
  SearchPaletteStatus,
} from "./search-palette.tsx";

const DESTINATIONS = [
  {
    href: "#top",
    title: "Lorem ipsum dolor",
    context: "Orientation / Overview",
  },
  {
    href: "#components",
    title: "Consectetur adipiscing",
    context: "Reference / Configuration",
  },
  {
    href: "#group-docs",
    title: "Sed do eiusmod",
    context: "Reference / Glossary",
  },
] as const;

export const conformance = [{
  example: "default",
  name:
    "opening focuses the field, typing filters, and escaping clears then closes",
  steps: [
    { action: "click", target: { role: "button", name: "Open search" } },
    { expect: "visible", target: { role: "dialog", name: "Search" } },
    { expect: "focused", target: { role: "searchbox", name: "Search" } },
    { action: "press", key: "i" },
    { action: "press", key: "p" },
    { action: "press", key: "s" },
    {
      expect: "visible",
      target: {
        role: "link",
        name: "Lorem ipsum dolor Orientation / Overview",
      },
    },
    {
      expect: "hidden",
      target: { role: "link", name: "Sed do eiusmod Reference / Glossary" },
    },
    { action: "press", key: "Escape" },
    { expect: "visible", target: { role: "dialog", name: "Search" } },
    { action: "press", key: "Escape" },
    { expect: "hidden", target: { role: "dialog", name: "Search" } },
    { expect: "focused", target: { role: "button", name: "Open search" } },
  ],
}, {
  example: "default",
  name: "the visible close action dismisses and restores the opener",
  steps: [
    { action: "click", target: { role: "button", name: "Open search" } },
    { expect: "visible", target: { role: "dialog", name: "Search" } },
    { action: "click", target: { role: "button", name: "Close search" } },
    { expect: "hidden", target: { role: "dialog", name: "Search" } },
    { expect: "focused", target: { role: "button", name: "Open search" } },
  ],
}, {
  example: "static",
  name:
    "static markup opens, closes, and restores focus under the consumer's own script",
  steps: [
    { action: "click", target: { role: "button", name: "Open static search" } },
    { expect: "visible", target: { role: "dialog", name: "Search" } },
    { expect: "focused", target: { role: "combobox", name: "Search" } },
    {
      expect: "attribute",
      target: { role: "combobox", name: "Search" },
      attribute: "data-discern-search-palette-input",
      value: "",
    },
    { expect: "visible", target: { role: "listbox", name: "Search results" } },
    { action: "press", key: "Escape" },
    { expect: "hidden", target: { role: "dialog", name: "Search" } },
    {
      expect: "focused",
      target: { role: "button", name: "Open static search" },
    },
    { action: "click", target: { role: "button", name: "Open static search" } },
    { action: "click", target: { role: "button", name: "Dismiss search" } },
    { expect: "hidden", target: { role: "dialog", name: "Search" } },
  ],
}] satisfies readonly ConformanceScenario[];

/**
 * The static contract: the palette renders closed with bindable hooks, and
 * the two handlers here stand in for the consumer script that owns opening
 * and dismissal on a page without hydration; a modal dialog focuses its
 * first focusable control, the field, natively.
 */
function StaticSearchPaletteExample() {
  const dialog = useRef<HTMLDialogElement>(null);
  const listId = `results-${useId()}`;
  const open = () => dialog.current?.showModal();
  const dismiss = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-discern-search-palette-close]")
    ) dialog.current?.close();
  };
  return (
    <div onClick={dismiss}>
      <Button onClick={open}>Open static search</Button>
      <SearchPalette
        ref={dialog}
        closeAriaLabel="Dismiss search"
        inputProps={{
          role: "combobox",
          "aria-controls": listId,
          "aria-expanded": true,
          "aria-autocomplete": "list",
          "aria-activedescendant": `${listId}-0`,
        }}
        hint={
          <span>
            <Kbd>Esc</Kbd> close
          </span>
        }
      >
        <SearchPaletteList id={listId}>
          {DESTINATIONS.map((destination, index) => (
            <SearchPaletteOption
              key={destination.href}
              id={`${listId}-${index}`}
              title={destination.title}
              context={destination.context}
              selected={index === 0}
            />
          ))}
        </SearchPaletteList>
        <SearchPaletteEmpty>No matches.</SearchPaletteEmpty>
        <SearchPaletteStatus>3 search results</SearchPaletteStatus>
      </SearchPalette>
    </div>
  );
}

export default function SearchPaletteExamples() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = DESTINATIONS.filter((destination) =>
    `${destination.title} ${destination.context}`.toLowerCase().includes(
      query.trim().toLowerCase(),
    )
  );
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open search</Button>
      <SearchPalette
        open={open}
        onOpenChange={setOpen}
        value={query}
        onValueChange={setQuery}
        hint={
          <>
            <span>
              <Kbd>↵</Kbd> open
            </span>
            <span>
              <Kbd>Esc</Kbd> close
            </span>
          </>
        }
      >
        {matches.length === 0
          ? (
            <p className="discern-search-palette__empty">
              No matches for “{query}”.
            </p>
          )
          : (
            <ul className="discern-search-palette__list">
              {matches.map((destination) => (
                <li key={destination.href}>
                  <SearchPaletteResult
                    href={destination.href}
                    title={destination.title}
                    context={destination.context}
                  />
                </li>
              ))}
            </ul>
          )}
      </SearchPalette>
    </>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{
    id: "default",
    Example: SearchPaletteExamples,
    capture: {
      prepare: [{ action: "click", selector: ":scope > .discern-button" }],
      selectors: [".discern-search-palette"],
    },
  }, {
    id: "static",
    Example: StaticSearchPaletteExample,
    capture: {
      prepare: [{ action: "click", selector: ".discern-button" }],
      selectors: [".discern-search-palette"],
    },
  }],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "open-search",
      label: "Open search",
      example: "default",
      category: "motion",
      sequence: [
        { action: "click", target: { role: "button", name: "Open search" } },
        {
          checkpoint: {
            id: "search-palette-open",
            label: "Open and focused",
          },
        },
      ],
      capture: { selectors: [".discern-search-palette"] },
    },
    {
      id: "press-search-close",
      label: "Close pointer contact",
      example: "default",
      category: "interaction",
      sequence: [
        { action: "click", target: { role: "button", name: "Open search" } },
        {
          action: "pointer-down",
          target: { role: "button", name: "Close search" },
        },
        {
          checkpoint: {
            id: "search-close-pressed",
            label: "Close pointer held",
          },
        },
        {
          action: "pointer-up",
          target: { role: "button", name: "Close search" },
        },
      ],
      capture: { selectors: [".discern-search-palette"] },
    },
    {
      id: "press-search-result",
      label: "Result pointer contact",
      example: "default",
      category: "interaction",
      sequence: [
        { action: "click", target: { role: "button", name: "Open search" } },
        {
          action: "pointer-down",
          target: {
            selector: '.discern-search-palette__result[href="#top"]',
          },
        },
        {
          checkpoint: {
            id: "search-result-pressed",
            label: "Result pointer held",
          },
        },
        {
          action: "pointer-up",
          target: {
            selector: '.discern-search-palette__result[href="#top"]',
          },
        },
      ],
      capture: { selectors: [".discern-search-palette"] },
    },
  ] as const,
);
