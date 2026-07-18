import { Fleet } from "./fleet.tsx";
import { AgentPersona } from "../agent-persona/agent-persona.tsx";
import { Persona } from "../../people/persona/persona.tsx";
import { Badge } from "../../display/badge/badge.tsx";

export default function FleetExamples() {
  return (
    <div className="discern-example-stack">
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
          {
            persona: <AgentPersona name="atlas-3" size="sm" status="done" />,
            branch: "agent/import-cleanup",
            state: <Badge tone="success">gate green</Badge>,
            ahead: 3,
            meta: "1h ago",
          },
          {
            persona: <Persona name="Morgan Ellis" size="sm" />,
            branch: "spike/pricing-page",
            state: <Badge tone="neutral">drafting</Badge>,
            behind: 5,
            meta: "3h ago",
          },
        ]}
      />
    </div>
  );
}
