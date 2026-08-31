import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import meta, { componentExampleVocabulary } from "./button.meta.ts";
import { Button } from "./button.tsx";

function PrimaryExample() {
  return (
    <div className="discern-example-row">
      <Button leadingIcon={<ExampleIcon name="spark" />}>
        Continue
      </Button>
      <Button href="#button-anchor-review">Continue link</Button>
      <Button disabled>Continue unavailable</Button>
    </div>
  );
}

function SecondaryExample() {
  return <Button variant="secondary">Preview</Button>;
}

function GhostExample() {
  return (
    <Button variant="ghost" trailingIcon={<ExampleIcon name="arrow" />}>
      Cancel
    </Button>
  );
}

function DangerExample() {
  return <Button variant="danger">Delete</Button>;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "default",
      Example: PrimaryExample,
      capture: {
        selectors: [".discern-example-row > .discern-button"],
      },
    },
    { id: "secondary", Example: SecondaryExample },
    { id: "ghost", Example: GhostExample },
    { id: "danger", Example: DangerExample },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "hover-button",
      label: "Button hover",
      example: "default",
      category: "interaction",
      sequence: [
        { action: "hover", target: { role: "button", name: "Continue" } },
        { checkpoint: { id: "button-hovered", label: "Hover feedback" } },
      ],
    },
    {
      id: "focus-button",
      label: "Button focus",
      example: "default",
      category: "interaction",
      sequence: [
        { action: "focus", target: { role: "button", name: "Continue" } },
        { checkpoint: { id: "button-focused", label: "Focus visible" } },
      ],
    },
    {
      id: "press-button",
      label: "Button pointer contact",
      example: "default",
      category: "interaction",
      sequence: [
        {
          action: "pointer-down",
          target: { role: "button", name: "Continue" },
        },
        { checkpoint: { id: "button-pressed", label: "Pointer held" } },
        { action: "pointer-up", target: { role: "button", name: "Continue" } },
      ],
    },
    {
      id: "disabled-button",
      label: "Disabled witness",
      example: "default",
      category: "interaction",
      sequence: [{ checkpoint: { id: "button-disabled", label: "Disabled" } }],
    },
    {
      id: "anchor-focus",
      label: "Anchor parity",
      example: "default",
      category: "interaction",
      sequence: [
        { action: "focus", target: { role: "link", name: "Continue link" } },
        { checkpoint: { id: "anchor-focused", label: "Anchor focus" } },
      ],
    },
  ] as const,
);

export default function ButtonExamples() {
  return (
    <div className="discern-example-row">
      <PrimaryExample />
      <SecondaryExample />
      <GhostExample />
      <DangerExample />
    </div>
  );
}
