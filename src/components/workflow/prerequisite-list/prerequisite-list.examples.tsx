import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { PrerequisiteList } from "./prerequisite-list.tsx";
import meta, { componentExampleVocabulary } from "./prerequisite-list.meta.ts";

function MixedPrerequisitesState() {
  return (
    <PrerequisiteList
      items={[
        {
          requirement: "The destination path is known.",
          state: "required",
          detail: "Confirm the path before starting the restore.",
        },
        {
          requirement: "A current backup exists outside the source.",
          state: "satisfied",
          detail: "Verified by listing its contents.",
        },
        {
          requirement: "The destination path is empty.",
          state: "unresolved",
          detail: "Inspect it before starting the restore.",
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: MixedPrerequisitesState }],
);

export default function PrerequisiteListExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <MixedPrerequisitesState />
    </div>
  );
}
