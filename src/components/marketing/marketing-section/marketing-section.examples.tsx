import type { CatalogueExampleState } from "../../../../catalogue/conformance.ts";
import { MarketingSection } from "./marketing-section.tsx";

function StandardSectionState() {
  return (
    <MarketingSection spacing="standard">
      <h2>A measured section for the supporting story.</h2>
      <p>
        Use the ordinary frame when the content should stay close to the
        editorial system.
      </p>
    </MarketingSection>
  );
}

function SpaciousContrastState() {
  return (
    <MarketingSection surface="contrast" spacing="spacious" frame="wide">
      <h2>A broader chapter with a deliberate change of pace.</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
          gap: "var(--discern-space-4)",
          marginTop: "var(--discern-space-8)",
        }}
      >
        {["First supporting idea", "Second supporting idea"].map((title) => (
          <article
            key={title}
            style={{
              padding: "var(--discern-space-6)",
              border: "1px solid var(--discern-color-border)",
              borderRadius: "var(--discern-radius-lg)",
              background: "var(--discern-color-surface)",
            }}
          >
            <h3>{title}</h3>
            <p style={{ color: "var(--discern-color-ink-muted)" }}>
              Semantic surfaces and ink remain paired inside the contrast
              chapter.
            </p>
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}

export const catalogueStates = [
  {
    name: "standard",
    label: "Standard canvas",
    Example: StandardSectionState,
  },
  {
    name: "spacious-contrast",
    label: "Wide spacious contrast",
    Example: SpaciousContrastState,
  },
] satisfies readonly CatalogueExampleState[];

export default function MarketingSectionExamples() {
  return (
    <div className="discern-example-stack">
      <StandardSectionState />
      <SpaciousContrastState />
    </div>
  );
}
