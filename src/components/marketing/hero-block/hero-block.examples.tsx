import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { EnvelopeBackdrop } from "../../artwork/envelope-backdrop/envelope-backdrop.tsx";
import { Button } from "../../core/button/button.tsx";
import { Badge } from "../../display/badge/badge.tsx";
import { Window } from "../../display/window/window.tsx";
import meta, { componentExampleVocabulary } from "./hero-block.meta.ts";
import { HeroBlock } from "./hero-block.tsx";
import { LightBackdrop } from "../../artwork/light-backdrop/light-backdrop.tsx";
import { Icon } from "../../core/icon/icon.tsx";
import { Grid } from "../../layout/grid/grid.tsx";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";

function StatementHeroState() {
  return (
    <HeroBlock
      layout="statement"
      eyebrow="A shared project workspace"
      title="Good work starts with a clear next step."
      description="Keep the plan, its context, and the next decision together."
      actions={<Button href="#explore">Explore the workspace</Button>}
      backdrop={<LightBackdrop />}
      visual={
        <Grid minimum="12rem" gap={6}>
          {["Find your bearings", "Keep context close", "Move forward together"]
            .map((text) => (
              <div key={text}>
                <Icon size="3rem" fit="contain" relief>
                  <ExampleIcon name="spark" />
                </Icon>
                <p>{text}</p>
              </div>
            ))}
        </Grid>
      }
    />
  );
}

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
    {
      id: "statement",
      Example: StatementHeroState,
      capture: {
        selectors: [".discern-hero-block"],
        // The symbol relief remains inside the padded Hero section.
        paintBleed: 0,
      },
    },
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
