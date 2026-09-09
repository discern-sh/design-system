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
      <Button busy>Save changes</Button>
      <Button href="#button-anchor-review" aria-disabled="true">
        Unavailable link
      </Button>
    </div>
  );
}

function SecondaryExample() {
  return <Button variant="secondary">Preview</Button>;
}

function ActionLayoutExample() {
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--discern-space-4)",
        maxWidth: "100%",
      }}
    >
      {(["sm", "md", "lg"] as const).map((size) => (
        <div
          key={size}
          style={{ display: "grid", gap: "var(--discern-space-2)" }}
        >
          <strong>{size} · Save changes</strong>
          {(["idle", "disabled", "busy", "disabled-busy"] as const).map((
            state,
          ) => (
            <div
              key={state}
              style={{ display: "grid", gap: "var(--discern-space-2)" }}
            >
              <span>{state}</span>
              <div
                className="discern-example-row"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--discern-space-2)",
                }}
              >
                {(["primary", "secondary", "ghost", "danger"] as const).map((
                  variant,
                ) => (
                  <Button
                    key={variant}
                    size={size}
                    variant={variant}
                    disabled={state.includes("disabled")}
                    busy={state.includes("busy")}
                    leadingIcon={variant === "danger"
                      ? "×"
                      : <ExampleIcon name="spark" />}
                    trailingIcon={variant === "secondary" ? "→" : undefined}
                  >
                    {variant === "primary"
                      ? "Save changes"
                      : variant === "secondary"
                      ? "Preview"
                      : variant === "ghost"
                      ? "Cancel"
                      : "Delete draft"}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <div
            className="discern-example-row"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--discern-space-2)",
            }}
          >
            <Button
              size={size}
              leadingIcon="✓"
              trailingIcon={<ExampleIcon name="arrow" />}
            >
              Änderungen speichern und fortfahren
            </Button>
            <Button size={size} variant="secondary">変更を保存して続行</Button>
            <Button size={size} variant="ghost">
              Review changes<br />before publishing
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
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
    { id: "action-layout", Example: ActionLayoutExample },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    ...(["light", "dark"] as const).map((theme) => ({
      id: `action-matrix-${theme}`,
      label: `Action matrix ${theme}`,
      example: "action-layout",
      category: "responsive" as const,
      requirements: { theme, inlineSize: 320, reducedMotion: true },
      sequence: [{
        checkpoint: {
          id: `matrix-${theme}`,
          label: "Adjacent actions, sizes and wrapping",
        },
      }],
    })),
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
