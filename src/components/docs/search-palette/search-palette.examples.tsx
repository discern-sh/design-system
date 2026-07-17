import { useState } from "react";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import { Kbd } from "../kbd/kbd.tsx";
import { SearchPalette, SearchPaletteResult } from "./search-palette.tsx";

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
}] satisfies readonly ConformanceScenario[];

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
