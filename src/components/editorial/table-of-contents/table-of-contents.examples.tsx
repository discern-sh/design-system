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

/** A procedure numbers its own steps while framing sections stay blank. */
function AuthoredNumbersExample() {
  return (
    <TableOfContents
      items={[
        { label: "Starting state", href: "#starting-state", number: false },
        { label: "Find the source", href: "#find-the-source", number: "1" },
        { label: "Write the rule", href: "#write-the-rule", number: "2" },
        { label: "Check the result", href: "#check-the-result", nested: true },
        { label: "Completion", href: "#completion", number: false },
      ]}
    />
  );
}

/** Sequential numbering counts only the items left to it. */
function MixedNumbersExample() {
  return (
    <TableOfContents
      items={[
        { label: "Overview", href: "#overview", number: false },
        { label: "Prepare", href: "#prepare" },
        { label: "Appendix", href: "#appendix", number: "A" },
        { label: "Apply", href: "#apply", current: true },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: TableOfContentsExamples },
    { id: "authored-numbers", Example: AuthoredNumbersExample },
    { id: "mixed-numbers", Example: MixedNumbersExample },
  ],
);
