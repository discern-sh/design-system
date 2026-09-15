import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./code-listing.meta.ts";
import { CodeListing } from "./code-listing.tsx";

const example = `// Average adult reading pace, in words per minute.
const PACE = 220;

function readingTime(words: number): string {
  const minutes = Math.ceil(words / PACE);
  return minutes === 1 ? "1 minute" : \`\${minutes} minutes\`;
}

console.log(readingTime(1540));`;

function StandardCodeListingState() {
  return (
    <CodeListing
      filename="reading-time.ts"
      language="TypeScript"
      code={example}
      wrap
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

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "wrapped-keyboard",
    label: "Wrapped source keyboard focus",
    example: "standard",
    category: "responsive",
    requirements: { inlineSize: "narrow", reducedMotion: true },
    sequence: [
      { action: "focus", target: { selector: ".discern-code-listing__body" } },
      {
        checkpoint: {
          id: "wrapped-focus",
          label: "Logical lines and focus at narrow width",
        },
      },
    ],
  }],
);

export default function CodeListingExamples() {
  return (
    <div className="discern-example-stack">
      <StandardCodeListingState />
      <ShowcaseCodeListingState />
    </div>
  );
}
