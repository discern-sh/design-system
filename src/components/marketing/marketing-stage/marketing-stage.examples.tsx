import type { CSSProperties } from "react";
import type { CatalogueExampleState } from "../../../../catalogue/conformance.ts";
import { MarketingStage } from "./marketing-stage.tsx";

const flowStyle: CSSProperties = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
  gap: "var(--discern-space-4)",
  alignItems: "center",
};

const stepStyle: CSSProperties = {
  minHeight: "7rem",
  display: "grid",
  placeItems: "center",
  padding: "var(--discern-space-5)",
  border: "1px solid var(--discern-color-border)",
  borderRadius: "var(--discern-radius-lg)",
  background: "var(--discern-color-canvas)",
  color: "var(--discern-color-ink-muted)",
  fontSize: "var(--discern-font-size-sm)",
  textAlign: "center",
};

function FramedStageState() {
  return (
    <MarketingStage
      label="One idea, three moments"
      caption="A concise visual can compress a relationship without becoming another reading assignment."
      aspect="landscape"
    >
      <div style={flowStyle}>
        {["Begin", "Separate", "Return"].map((label, index) => (
          <div
            key={label}
            style={{
              ...stepStyle,
              borderColor: index === 1
                ? "var(--discern-color-accent-500)"
                : "var(--discern-color-border)",
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </MarketingStage>
  );
}

function InsetStageState() {
  return (
    <MarketingStage
      label="Atmospheric relief"
      treatment="inset"
      aspect="landscape"
    >
      <div
        aria-hidden="true"
        style={{
          width: "86%",
          aspectRatio: "1.5",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, color-mix(in oklab, var(--discern-color-accent-200) 58%, transparent) 0%, color-mix(in oklab, var(--discern-color-accent-200) 24%, transparent) 44%, transparent 78%)",
          filter: "blur(28px)",
          opacity: 0.72,
          transform: "scale(0.86)",
        }}
      />
    </MarketingStage>
  );
}

function PlainStageState() {
  return (
    <MarketingStage
      label="Unframed artwork"
      treatment="plain"
      caption="The plain treatment lets consumer artwork establish its own edge."
    >
      <div
        aria-hidden="true"
        style={{
          minHeight: "12rem",
          borderRadius: "var(--discern-radius-lg)",
          background:
            "linear-gradient(135deg, var(--discern-color-surface-sunken), var(--discern-color-accent-100))",
        }}
      />
    </MarketingStage>
  );
}

export const catalogueStates = [
  {
    name: "framed",
    label: "Framed concept",
    Example: FramedStageState,
  },
  {
    name: "inset",
    label: "Inset atmosphere",
    Example: InsetStageState,
  },
  {
    name: "plain",
    label: "Plain artwork",
    Example: PlainStageState,
  },
] satisfies readonly CatalogueExampleState[];

export default function MarketingStageExamples() {
  return (
    <div className="discern-example-stack">
      <FramedStageState />
      <InsetStageState />
      <PlainStageState />
    </div>
  );
}
