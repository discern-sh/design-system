import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./table-of-contents.meta.ts";
import { TableOfContents } from "./table-of-contents.tsx";

export default function TableOfContentsExamples() {
  return (
    <TableOfContents
      items={[
        { label: "The opening scene", href: "#opening", current: true },
        {
          label: "A closer look",
          href: "#closer-look",
          nested: true,
        },
        { label: "What changed", href: "#changed" },
        { label: "Notes and sources", href: "#notes" },
      ]}
      progress="12 minute read · 1 of 4"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: TableOfContentsExamples }],
);
