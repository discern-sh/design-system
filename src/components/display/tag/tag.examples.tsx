import { useState } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import meta, { componentExampleVocabulary } from "./tag.meta.ts";
import { Tag } from "./tag.tsx";

export const conformance = [{
  example: "removable",
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

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "hover-remove",
      label: "Remove hover",
      example: "removable",
      category: "interaction",
      sequence: [
        {
          action: "hover",
          target: { role: "button", name: "Remove ipsum" },
        },
        { checkpoint: { id: "tag-remove-hovered", label: "Hover feedback" } },
      ],
    },
    {
      id: "focus-remove",
      label: "Remove focus",
      example: "removable",
      category: "interaction",
      sequence: [
        {
          action: "focus",
          target: { role: "button", name: "Remove ipsum" },
        },
        { checkpoint: { id: "tag-remove-focused", label: "Focus visible" } },
      ],
    },
    {
      id: "press-remove",
      label: "Remove pointer contact",
      example: "removable",
      category: "interaction",
      sequence: [
        {
          action: "pointer-down",
          target: { role: "button", name: "Remove ipsum" },
        },
        { checkpoint: { id: "tag-remove-pressed", label: "Pointer held" } },
        {
          action: "pointer-up",
          target: { role: "button", name: "Remove ipsum" },
        },
      ],
    },
  ] as const,
);

export default function TagExamples() {
  return (
    <div className="discern-example-row">
      <PlainExample />
      <RemovableExample />
    </div>
  );
}
