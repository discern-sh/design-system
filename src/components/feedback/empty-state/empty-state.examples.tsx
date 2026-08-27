import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./empty-state.meta.ts";
import { EmptyState } from "./empty-state.tsx";

function DefaultEmptyState() {
  return (
    <EmptyState
      title="Nothing here yet"
      description="Create the first item to get started."
      actions={<Button variant="secondary">Create item</Button>}
    />
  );
}

function CompactEmptyState() {
  return <EmptyState title="No results" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultEmptyState },
    { id: "compact", Example: CompactEmptyState },
  ],
);

export default function EmptyStateExamples() {
  return <DefaultEmptyState />;
}
