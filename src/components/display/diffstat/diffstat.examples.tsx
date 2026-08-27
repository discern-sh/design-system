import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./diffstat.meta.ts";
import { Diffstat } from "./diffstat.tsx";

function MixedExample() {
  return <Diffstat added={310} removed={204} />;
}

function AddedExample() {
  return <Diffstat added={12} removed={0} />;
}

function RemovedExample() {
  return <Diffstat added={0} removed={86} />;
}

function EmptyExample() {
  return <Diffstat added={0} removed={0} />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: MixedExample },
    { id: "added", Example: AddedExample },
    { id: "removed", Example: RemovedExample },
    { id: "empty", Example: EmptyExample },
  ],
);

export default function DiffstatExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <MixedExample />
      <AddedExample />
      <RemovedExample />
      <EmptyExample />
    </div>
  );
}
