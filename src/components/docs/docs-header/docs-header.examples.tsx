import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import { Kbd } from "../kbd/kbd.tsx";
import { SearchGlyph } from "../search-palette/search-palette.examples.tsx";
import meta, { componentExampleVocabulary } from "./docs-header.meta.ts";
import { DocsHeader } from "./docs-header.tsx";

/**
 * The middle slot's search trigger: the palette's lens, a label, and its
 * shortcut in Docs header shortcut, which the header drops when its row
 * runs narrow. `aria-keyshortcuts` announces the chord the chips show.
 */
export function SearchTrigger() {
  return (
    <Button
      variant="secondary"
      size="sm"
      leadingIcon={<SearchGlyph />}
      aria-keyshortcuts="Control+K"
    >
      Search…
      <span className="discern-docs-header__shortcut" aria-hidden="true">
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </span>
    </Button>
  );
}

function DocumentationHeaderExample() {
  return (
    <DocsHeader
      style={{ position: "static" }}
      brand={<a href="#top">Lorem manual</a>}
      actions={
        <Button href="#components" variant="ghost" size="sm">
          Dolor
        </Button>
      }
    >
      <SearchTrigger />
    </DocsHeader>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: DocumentationHeaderExample }],
);

export default DocumentationHeaderExample;
