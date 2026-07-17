import { useState } from "react";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import { Kbd } from "../kbd/kbd.tsx";
import { SearchPalette, SearchPaletteResult } from "./search-palette.tsx";

export const conformance = [{
  name: "opening focuses the search field and escaping restores the trigger",
  steps: [
    { action: "click", target: { role: "button", name: "Open search" } },
    { expect: "visible", target: { role: "dialog", name: "Search" } },
    { expect: "focused", target: { role: "searchbox", name: "Search" } },
    { action: "press", key: "Escape" },
    { expect: "hidden", target: { role: "dialog", name: "Search" } },
    { expect: "focused", target: { role: "button", name: "Open search" } },
  ],
}] satisfies readonly ConformanceScenario[];

export default function SearchPaletteExamples() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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
        {query.length > 0 && query.length < 3
          ? (
            <p className="discern-search-palette__empty">
              No matches for “{query}”.
            </p>
          )
          : (
            <ul className="discern-search-palette__list">
              <li>
                <SearchPaletteResult
                  href="#top"
                  title="Lorem ipsum dolor"
                  context="Orientation / Overview"
                />
              </li>
              <li>
                <SearchPaletteResult
                  href="#components"
                  title="Consectetur adipiscing"
                  context="Reference / Configuration"
                />
              </li>
              <li>
                <SearchPaletteResult
                  href="#group-docs"
                  title="Sed do eiusmod"
                  context="Reference / Glossary"
                />
              </li>
            </ul>
          )}
      </SearchPalette>
    </>
  );
}
