import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./code-listing.meta.ts";
import { CodeListing } from "./code-listing.tsx";

const example = `function readingTime(words: number): number {
  return Math.ceil(words / 220);
}

console.log(readingTime(1540));`;

function StandardCodeListingState() {
  return (
    <CodeListing
      filename="reading-time.ts"
      language="TypeScript"
      code={example}
      highlightLines={[1, 2]}
      caption="Highlighted lines draw attention to the calculation."
    />
  );
}

function ShowcaseCodeListingState() {
  return (
    <CodeListing
      filename="reading-time.ts"
      language="TypeScript"
      code={example}
      highlightLines={[1, 2]}
      caption="The showcase treatment gives the same source stronger visual emphasis."
      variant="showcase"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "standard", Example: StandardCodeListingState },
    { id: "showcase", Example: ShowcaseCodeListingState },
  ],
);

export default function CodeListingExamples() {
  return (
    <div className="discern-example-stack">
      <StandardCodeListingState />
      <ShowcaseCodeListingState />
    </div>
  );
}
