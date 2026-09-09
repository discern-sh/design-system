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

function ActionLayoutExample() {
  return (
    <div
      className="discern-example-row"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--discern-space-2)",
      }}
    >
      {(["sm", "md", "lg"] as const).map((size) => (
        <div
          key={size}
          className="discern-example-row"
          style={{ display: "grid", gap: "var(--discern-space-2)" }}
        >
          <strong>{size} · idle, disabled, busy, both</strong>
          {(["quiet", "outline"] as const).map((variant) => (
            <div
              key={variant}
              className="discern-example-row"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--discern-space-2)",
              }}
            >
              <IconButton
                size={size}
                variant={variant}
                icon={<ExampleIcon name="info" />}
                label="Information"
              />
              <IconButton
                size={size}
                variant={variant}
                icon="×"
                label="Close inspector"
                disabled
              />
              <IconButton
                size={size}
                variant={variant}
                icon="↻"
                label="Refresh results"
                busy
              />
              <IconButton
                size={size}
                variant={variant}
                icon={<ExampleIcon name="spark" />}
                label="Generate report"
                disabled
                busy
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "default",
      Example: QuietExample,
      capture: {
        selectors: [".discern-icon-button"],
        framing: {
          mode: "allocation",
          reason:
            "The quiet Icon button's transparent square is its minimum pointer target and visible alignment contract.",
        },
      },
    },
    { id: "outline", Example: OutlineExample },
    { id: "action-layout", Example: ActionLayoutExample },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "icon-action-matrix",
    label: "Unavailable and busy icon actions",
    example: "action-layout",
    category: "responsive",
    requirements: { inlineSize: 320, reducedMotion: true },
    sequence: [{
      checkpoint: { id: "icon-matrix", label: "Sizes, SVG and Unicode" },
    }],
  }, {
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
    <div
      className="discern-example-row"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--discern-space-2)",
      }}
    >
      <QuietExample />
      <OutlineExample />
    </div>
  );
}
