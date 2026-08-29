import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import meta, { componentExampleVocabulary } from "./icon-button.meta.ts";
import { IconButton } from "./icon-button.tsx";

function QuietExample() {
  return <IconButton icon={<ExampleIcon name="spark" />} label="Generate" />;
}

function OutlineExample() {
  return (
    <IconButton
      icon={<ExampleIcon name="info" />}
      label="Information"
      variant="outline"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: QuietExample },
    { id: "outline", Example: OutlineExample },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "press-icon-button",
    label: "Pointer contact",
    example: "default",
    category: "interaction",
    sequence: [
      {
        action: "pointer-down",
        target: { role: "button", name: "Generate" },
      },
      {
        checkpoint: {
          id: "icon-button-pressed",
          label: "Pointer held",
        },
      },
      {
        action: "pointer-up",
        target: { role: "button", name: "Generate" },
      },
    ],
  }] as const,
);

export default function IconButtonExamples() {
  return (
    <div className="discern-example-row">
      <QuietExample />
      <OutlineExample />
    </div>
  );
}
