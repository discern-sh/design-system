import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./code-listing.meta.ts";
import { CodeListing } from "./code-listing.tsx";

const example = `const brief = {
  question: "What must remain true?",
  evidence: ["tests", "proof"],
};

await prove(brief);`;

function StandardCodeListingState() {
  return (
    <CodeListing
      filename="example.ts"
      language="TypeScript"
      code={example}
      highlightLines={[2, 3]}
      caption="Highlighted lines carry the decision into executable evidence."
    />
  );
}

function ShowcaseCodeListingState() {
  return (
    <CodeListing
      filename="decision.ts"
      language="TypeScript"
      code={example}
      highlightLines={[2, 3]}
      caption="A stable dark treatment for source used as campaign evidence."
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
