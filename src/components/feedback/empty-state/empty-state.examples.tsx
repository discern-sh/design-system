import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import meta, { componentExampleVocabulary } from "./empty-state.meta.ts";
import { EmptyState } from "./empty-state.tsx";

function DefaultEmptyState() {
  return (
    <EmptyState
      title="Create your first collection"
      description="Collections keep related items together. Create one when you have something to save."
      actions={<Button variant="secondary">Create collection</Button>}
    />
  );
}

function CompactEmptyState() {
  return <EmptyState title="No results" />;
}

function NoResults() {
  return (
    <EmptyState
      title="No results for “field notes”"
      description="Try fewer words or clear the filters to search all items."
      actions={<Button variant="secondary">Clear filters</Button>}
    />
  );
}
function Unavailable() {
  return (
    <EmptyState
      title="This collection is unavailable"
      description="It may have been moved or access may have changed. Return to your collections to choose another."
      actions={<Button variant="secondary">Browse collections</Button>}
    />
  );
}
function RecoverableFailure() {
  return (
    <EmptyState
      title="Items could not be loaded"
      description="Your collection is still saved. Check your connection, then try loading it again."
      actions={<Button variant="secondary">Try loading again</Button>}
    />
  );
}
export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultEmptyState },
    { id: "compact", Example: CompactEmptyState },
    { id: "no-results", Example: NoResults },
    { id: "unavailable", Example: Unavailable },
    { id: "recoverable-failure", Example: RecoverableFailure },
  ],
);
export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  ["default", "no-results", "unavailable", "recoverable-failure"].map((
    example,
  ) => ({
    id: `${example}-narrow`,
    label: `${example} in a narrow region`,
    example,
    category: "responsive" as const,
    requirements: { inlineSize: 260 },
    sequence: [{
      checkpoint: { id: `${example}-next-step`, label: "Reason and next step" },
    }],
  })),
);
export default DefaultEmptyState;
