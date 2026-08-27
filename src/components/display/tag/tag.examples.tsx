import { useState } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./tag.meta.ts";
import { Tag } from "./tag.tsx";

export const conformance = [{
  name: "the labelled remove action removes its tag",
  steps: [
    { action: "click", target: { role: "button", name: "Remove ipsum" } },
    {
      expect: "hidden",
      target: {
        selector: '.discern-tag:has([aria-label="Remove ipsum"])',
      },
    },
  ],
}] satisfies readonly ConformanceScenario[];

function PlainExample() {
  return <Tag>Metadata</Tag>;
}

function RemovableExample() {
  const [showRemovable, setShowRemovable] = useState(true);
  return showRemovable
    ? (
      <Tag
        onRemove={() => setShowRemovable(false)}
        removeLabel="Remove ipsum"
      >
        Ipsum
      </Tag>
    )
    : null;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: PlainExample },
    { id: "removable", Example: RemovableExample },
  ],
);

export default function TagExamples() {
  return (
    <div className="discern-example-row">
      <PlainExample />
      <RemovableExample />
    </div>
  );
}
