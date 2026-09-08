import type { CSSProperties } from "react";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { ApproachBackdrop } from "../../artwork/approach-backdrop/approach-backdrop.tsx";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./editorial-hero.meta.ts";
import { EditorialHero } from "./editorial-hero.tsx";

const visualStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "18rem",
};

const planeStyle: CSSProperties = {
  position: "absolute",
  border: "1px solid var(--discern-color-border-strong)",
  borderRadius: "var(--discern-radius-lg)",
  background: "var(--discern-color-canvas)",
};

function ConceptVisual() {
  return (
    <div style={visualStyle} aria-hidden="true">
      <div
        style={{
          ...planeStyle,
          inset: "8% 34% 34% 5%",
          transform: "rotate(-4deg)",
        }}
      />
      <div
        style={{
          ...planeStyle,
          inset: "28% 8% 10% 38%",
          borderColor: "var(--discern-color-accent-500)",
          transform: "rotate(3deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "41% auto auto 45%",
          width: "3.5rem",
          aspectRatio: 1,
          borderRadius: "var(--discern-radius-pill)",
          background: "var(--discern-color-accent-500)",
          boxShadow: "var(--discern-shadow-card)",
        }}
      />
    </div>
  );
}

function VisualHeroState() {
  return (
    <EditorialHero
      eyebrow="A guide to collaborative planning"
      title={
        <>
          Turn an open question <em>into a shared plan.</em>
        </>
      }
      description={
        <p>
          Prepare a focused workshop with a clear question, useful reading, and
          a decision record everyone can return to.
        </p>
      }
      actions={
        <>
          <Button href="#approach">Plan the session</Button>
          <Button href="#principles" variant="secondary">
            Read the preparation guide
          </Button>
        </>
      }
      meta="Start with one question and the people closest to it."
      visual={<ConceptVisual />}
      visualLabel="One relationship"
      visualCaption="Two independent planes meet at one deliberate hand-off."
      backdrop={<ApproachBackdrop />}
    />
  );
}

function TextOnlyHeroState() {
  return (
    <EditorialHero
      eyebrow="Written participation"
      title="Make space for people who cannot join the room."
      headingLevel={2}
      description={
        <p>
          Share the brief early, set a response date, and carry written
          contributions into the same decision record.
        </p>
      }
      actions={<Button href="#continue">Read the participation guide</Button>}
      surface="surface"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "visual", Example: VisualHeroState },
    { id: "text-only", Example: TextOnlyHeroState },
  ],
);

export default function EditorialHeroExamples() {
  return (
    <div className="discern-example-stack">
      <VisualHeroState />
      <TextOnlyHeroState />
    </div>
  );
}
