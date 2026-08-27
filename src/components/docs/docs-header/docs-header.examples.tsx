import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Kbd } from "../kbd/kbd.tsx";
import meta, { componentExampleVocabulary } from "./docs-header.meta.ts";
import { DocsHeader } from "./docs-header.tsx";

function DocumentationHeaderExample() {
  return (
    <DocsHeader
      style={{ position: "static" }}
      brand={<a href="#top">Lorem manual</a>}
      actions={<a href="#components">Consectetur</a>}
    >
      <span>
        Search <Kbd>⌘</Kbd> <Kbd>K</Kbd>
      </span>
    </DocsHeader>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: DocumentationHeaderExample }],
);

export default DocumentationHeaderExample;
