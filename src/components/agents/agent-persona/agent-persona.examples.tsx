import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { AgentPersona } from "./agent-persona.tsx";
import meta, { componentExampleVocabulary } from "./agent-persona.meta.ts";

function IdentityState() {
  return <AgentPersona name="quill" detail="agent/checkout-flow" />;
}

function WorkingState() {
  return (
    <AgentPersona
      name="forge-2"
      detail="running the test suite"
      status="working"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: IdentityState },
    { id: "working", Example: WorkingState },
  ],
);

export default function AgentPersonaExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <IdentityState />
      <WorkingState />
    </div>
  );
}
