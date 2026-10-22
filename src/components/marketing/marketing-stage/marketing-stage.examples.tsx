import type { CSSProperties } from "react";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./marketing-stage.meta.ts";
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
  borderRadius: "var(--discern-radius-md)",
  background: "var(--discern-color-inset)",
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
            style={index === 1
              ? {
                ...stepStyle,
                borderColor: "var(--discern-color-border-strong)",
                background: "var(--discern-color-surface)",
                boxShadow: "var(--discern-shadow-card)",
                color: "var(--discern-color-ink)",
              }
              : stepStyle}
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
      label="Three connected moments"
      treatment="inset"
      aspect="landscape"
    >
      <svg
        viewBox="0 0 320 120"
        aria-hidden="true"
        style={{
          width: "min(100%, 26rem)",
          color: "var(--discern-color-border-strong)",
          overflow: "visible",
        }}
      >
        <path
          d="M54 60H146M174 60H266"
          fill="none"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
        {[40, 160, 280].map((x) => (
          <circle
            key={x}
            cx={x}
            cy={60}
            r={14}
            style={{
              fill: "var(--discern-color-surface)",
              stroke: x === 160
                ? "var(--discern-color-accent-600)"
                : "currentColor",
            }}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
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
          border: "1px solid var(--discern-color-border)",
          borderRadius: "var(--discern-radius-lg)",
          background: "var(--discern-color-surface)",
          boxShadow: "var(--discern-shadow-card)",
        }}
      />
    </MarketingStage>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "framed", Example: FramedStageState },
    {
      id: "inset",
      Example: InsetStageState,
      capture: {
        selectors: [".discern-marketing-stage"],
        paintBleed: 0,
      },
    },
    { id: "plain", Example: PlainStageState },
  ],
);

export default function MarketingStageExamples() {
  return (
    <div className="discern-example-stack">
      <FramedStageState />
      <InsetStageState />
      <PlainStageState />
    </div>
  );
}
