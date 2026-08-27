import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Fleet } from "./fleet.tsx";
import { AgentPersona } from "../agent-persona/agent-persona.tsx";
import { Badge } from "../../display/badge/badge.tsx";
import meta, { componentExampleVocabulary } from "./fleet.meta.ts";

function ParallelWorkState() {
  return (
    <Fleet
      label="Efforts in flight"
      style={{ maxWidth: "40rem" }}
      rows={[
        {
          persona: <AgentPersona name="quill" size="sm" status="working" />,
          branch: "agent/checkout-flow",
          state: <Badge tone="accent">running tests</Badge>,
          ahead: 4,
          meta: "2m ago",
        },
        {
          persona: <AgentPersona name="forge-2" size="sm" status="waiting" />,
          branch: "agent/payment-step",
          state: <Badge tone="warning">needs review</Badge>,
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
        state: <Badge tone="accent">reviewing compatibility</Badge>,
        ahead: 3,
        meta: "evidence in progress",
      }]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: ParallelWorkState },
    { id: "lossless-identities", Example: LosslessIdentitiesState },
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
