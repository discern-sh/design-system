import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./voice-break.meta.ts";
import { VoiceBreak } from "./voice-break.tsx";

function CalmVoiceState() {
  return (
    <VoiceBreak
      eyebrow="A change of voice"
      quote="For the first time, the explanation felt shorter than the idea."
      attribution="A review team"
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
      context="Reviewing a technical introduction"
      align="end"
      surface="contrast"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "calm", Example: CalmVoiceState },
    { id: "contrast", Example: ContrastVoiceState },
  ],
);

export default function VoiceBreakExamples() {
  return (
    <div className="discern-example-stack">
      <CalmVoiceState />
      <ContrastVoiceState />
    </div>
  );
}
