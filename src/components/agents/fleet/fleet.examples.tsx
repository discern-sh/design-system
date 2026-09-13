import { denseFleetRows } from "../operational-examples.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Fleet } from "./fleet.tsx";
import { AgentPersona } from "../agent-persona/agent-persona.tsx";
import meta, { componentExampleVocabulary } from "./fleet.meta.ts";

function ParallelWorkState() {
  return (
    <Fleet
      label="Efforts in flight"
      style={{ maxWidth: "40rem" }}
      rows={[
        {
          persona: <AgentPersona name="quill" size="sm" />,
          branch: "agent/checkout-flow",
          status: "working",
          ahead: 4,
          meta: "2m ago",
        },
        {
          persona: <AgentPersona name="forge-2" size="sm" />,
          branch: "agent/payment-step",
          status: "waiting",
          ahead: 7,
          behind: 2,
          meta: "18m ago",
        },
      ]}
    />
  );
}

function LosslessIdentitiesState() {
  return (
    <Fleet
      label="Long effort identities"
      style={{ maxWidth: "40rem" }}
      rows={[{
        persona: <AgentPersona name="terminal-contract-audit" size="sm" />,
        branch: "agent/terminal-contract-audit-with-complete-identities",
        status: "working",
        ahead: 3,
        meta: "evidence in progress",
      }]}
    />
  );
}

function DenseState() {
  return <Fleet rows={denseFleetRows} />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: ParallelWorkState },
    { id: "lossless-identities", Example: LosslessIdentitiesState },
    { id: "dense", Example: DenseState },
  ],
);

export default function FleetExamples() {
  return (
    <div className="discern-example-stack">
      <ParallelWorkState />
      <LosslessIdentitiesState />
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
