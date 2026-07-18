import { AgentPersona } from "./agent-persona.tsx";

export default function AgentPersonaExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <AgentPersona
        name="quill"
        detail="agent/checkout-flow"
        size="sm"
      />
      <AgentPersona
        name="forge-2"
        detail="running the test suite"
        status="working"
      />
      <AgentPersona
        name="atlas-3"
        detail="waiting on review · 12m"
        status="waiting"
        size="lg"
      />
      <AgentPersona
        name="lantern-9"
        detail="a very long branch name that truncates with an ellipsis"
        status="done"
        style={{ maxWidth: "14rem" }}
      />
    </div>
  );
}
