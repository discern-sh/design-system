import type { CatalogueExampleState } from "../../../../catalogue/conformance.ts";
import { VoiceBreak } from "./voice-break.tsx";

function CalmVoiceState() {
  return (
    <VoiceBreak
      eyebrow="A change of voice"
      quote="For the first time, the explanation felt shorter than the idea."
      attribution="A product team"
      context="After simplifying a complex launch page"
      portrait={<span>PT</span>}
    />
  );
}

function ContrastVoiceState() {
  return (
    <VoiceBreak
      eyebrow="Pause"
      quote="We understood the decision before we learned the machinery."
      attribution="An early reader"
      context="Reviewing a technical product introduction"
      align="end"
      surface="contrast"
    />
  );
}

export const catalogueStates = [
  {
    name: "calm",
    label: "Calm voice",
    Example: CalmVoiceState,
  },
  {
    name: "contrast",
    label: "Contrast voice",
    Example: ContrastVoiceState,
  },
] satisfies readonly CatalogueExampleState[];

export default function VoiceBreakExamples() {
  return (
    <div className="discern-example-stack">
      <CalmVoiceState />
      <ContrastVoiceState />
    </div>
  );
}
