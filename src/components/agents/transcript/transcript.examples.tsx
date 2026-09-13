import { denseTranscriptTurns } from "../operational-examples.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Transcript } from "./transcript.tsx";
import { AgentPersona } from "../agent-persona/agent-persona.tsx";
import { Persona } from "../../people/persona/persona.tsx";
import meta, { componentExampleVocabulary } from "./transcript.meta.ts";

function ReviewHandoffState() {
  return (
    <Transcript
      style={{ maxWidth: "34rem" }}
      turns={[
        {
          speaker: <Persona name="Morgan Ellis" size="sm" />,
          aside: <time dateTime="09:12">09:12</time>,
          body: <p>Run the complete gate and report the evidence.</p>,
        },
        {
          speaker: <AgentPersona name="quill" size="sm" status="done" />,
          aside: <time dateTime="09:41">09:41</time>,
          body: <p>The gate passed and the proof is ready for review.</p>,
        },
      ]}
    />
  );
}

function DenseState() {
  return <Transcript turns={denseTranscriptTurns} />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: ReviewHandoffState }, {
    id: "dense",
    Example: DenseState,
  }],
);

export default function TranscriptExamples() {
  return (
    <div className="discern-example-stack">
      <ReviewHandoffState />
    </div>
  );
}

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    ...(["narrow", "wide"] as const).map((inlineSize) => ({
      id: `dense-${inlineSize}`,
      label: `Dense evidence at ${inlineSize} width`,
      example: "dense",
      category: "responsive" as const,
      requirements: { inlineSize },
      sequence: [{
        checkpoint: {
          id: `dense-${inlineSize}-reading`,
          label: "Outcome, identity and boundaries",
        },
      }],
    })),
  ],
);
