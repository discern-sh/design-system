import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { EnvelopeBackdrop } from "../../artwork/envelope-backdrop/envelope-backdrop.tsx";
import { Button } from "../../core/button/button.tsx";
import { Badge } from "../../display/badge/badge.tsx";
import { Window } from "../../display/window/window.tsx";
import meta, { componentExampleVocabulary } from "./hero-block.meta.ts";
import { HeroBlock } from "./hero-block.tsx";

function SplitHeroState() {
  return (
    <HeroBlock
      eyebrow={<Badge tone="accent" dot>Workshop guide</Badge>}
      title={<>Bring a question. Leave with a plan.</>}
      description={
        <p>
          Prepare the discussion, compare the options, and capture a next step
          with a named owner.
        </p>
      }
      actions={
        <>
          <Button href="#start">Plan a workshop</Button>
          <Button href="#details" variant="secondary">
            Read the checklist
          </Button>
        </>
      }
      meta="A practical guide for facilitators and participants."
      visual={
        <Window title="Session preparation">
          <div style={{ padding: "2rem", minHeight: "15rem" }}>
            <strong>What to bring</strong>
            <p>
              One question, relevant notes, and the constraints the decision
              needs to respect.
            </p>
          </div>
        </Window>
      }
      surface="accent"
    />
  );
}

function ShowcaseHeroState() {
  return (
    <HeroBlock
      eyebrow="Collaborative planning"
      title={
        <>
          A <em>clearer</em> way to decide.
        </>
      }
      description={
        <p>
          Give each participant the same starting point: the question, the
          evidence, and a place to record what remains uncertain.
        </p>
      }
      actions={
        <>
          <Button href="#start">See it in practice</Button>
          <Button href="#details" variant="secondary">Read the method</Button>
        </>
      }
      meta="Preparation · discussion · a recorded decision"
      visual={
        <Window
          title="Workshop brief"
          actions={<Badge tone="success" dot>ready to discuss</Badge>}
          variant="showcase"
        >
          <div style={{ padding: "var(--discern-space-6)" }}>
            <strong>
              Decision: which option should we try first?
            </strong>
            <p>
              Compare the available options against the agreed constraints.
              Record the smallest next step that would answer an open question.
            </p>
          </div>
        </Window>
      }
      layout="showcase"
      surface="atmospheric"
    />
  );
}

function BackdropHeroState() {
  return (
    <HeroBlock
      eyebrow="Start with a question"
      title="Make room for different perspectives."
      description={
        <p>
          Invite the people affected by the decision. Share the brief in advance
          so everyone has time to prepare a response.
        </p>
      }
      actions={<Button href="#continue">Read the invitation checklist</Button>}
      backdrop={<EnvelopeBackdrop presence={1.1} />}
      layout="centered"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "split", Example: SplitHeroState },
    { id: "showcase", Example: ShowcaseHeroState },
    { id: "backdrop", Example: BackdropHeroState },
  ],
);

export default function HeroBlockExamples() {
  return (
    <div className="discern-example-stack">
      <SplitHeroState />
      <ShowcaseHeroState />
      <BackdropHeroState />
    </div>
  );
}
