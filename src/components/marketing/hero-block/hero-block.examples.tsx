import type { CatalogueExampleState } from "../../../../catalogue/conformance.ts";
import { EnvelopeBackdrop } from "../../artwork/envelope-backdrop/envelope-backdrop.tsx";
import { Button } from "../../core/button/button.tsx";
import { Badge } from "../../display/badge/badge.tsx";
import { Window } from "../../display/window/window.tsx";
import { HeroBlock } from "./hero-block.tsx";

function SplitHeroState() {
  return (
    <HeroBlock
      eyebrow={<Badge tone="accent" dot>New collection</Badge>}
      title={<>Make the complicated feel inevitable.</>}
      description={
        <p>
          A flexible opening composition for a clear promise, an immediate next
          step, and one memorable piece of product evidence.
        </p>
      }
      actions={
        <>
          <Button href="#start">Start exploring</Button>
          <Button href="#details" variant="secondary">See the details</Button>
        </>
      }
      meta="No account required · takes two minutes"
      visual={
        <Window title="A useful product view">
          <div style={{ padding: "2rem", minHeight: "15rem" }}>
            <strong>Flexible visual slot</strong>
            <p>Windows, diagrams, screenshots, code, or editorial artwork.</p>
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
      eyebrow="For people doing consequential work"
      title={
        <>
          A <em>bolder</em> way to build.
        </>
      }
      description={
        <p>
          Give a substantial idea the scale, evidence, and working space it
          needs without changing the rest of the product interface.
        </p>
      }
      actions={
        <>
          <Button href="#start">See it in practice</Button>
          <Button href="#details" variant="secondary">Read the method</Button>
        </>
      }
      meta="One connected practice · one local foundation · explicit authority"
      visual={
        <Window
          title="project · ready for review"
          actions={<Badge tone="success" dot>evidence ready</Badge>}
          variant="showcase"
        >
          <div style={{ padding: "clamp(1.5rem, 4vw, 3rem)" }}>
            <strong>
              Wide product evidence remains the final visual word.
            </strong>
            <p>
              The showcase layout gives a consumer-owned preview room to breathe
              beneath the opening promise.
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
      eyebrow="Artwork backdrop"
      title="Give the opening a quiet geometry."
      description={
        <p>
          The optional backdrop sits behind complete copy and actions, so
          atmosphere can change without changing the section's meaning.
        </p>
      }
      actions={<Button href="#continue">Continue through the field</Button>}
      backdrop={<EnvelopeBackdrop presence={1.1} />}
      layout="centered"
    />
  );
}

export const catalogueStates = [
  { name: "split", label: "Split accent", Example: SplitHeroState },
  { name: "showcase", label: "Showcase", Example: ShowcaseHeroState },
  { name: "backdrop", label: "Artwork backdrop", Example: BackdropHeroState },
] satisfies readonly CatalogueExampleState[];

export default function HeroBlockExamples() {
  return (
    <div className="discern-example-stack">
      <SplitHeroState />
      <ShowcaseHeroState />
      <BackdropHeroState />
    </div>
  );
}
