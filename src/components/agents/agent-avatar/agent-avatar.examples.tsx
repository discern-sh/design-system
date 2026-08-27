import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { AgentAvatar } from "./agent-avatar.tsx";
import meta, { componentExampleVocabulary } from "./agent-avatar.meta.ts";

function IdentityState() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <AgentAvatar name="quill" size="sm" />
      <AgentAvatar name="forge-2" />
      <AgentAvatar name="atlas-3" size="lg" />
    </div>
  );
}

function WorkingState() {
  return <AgentAvatar name="quill" status="working" />;
}

function BlockedState() {
  return <AgentAvatar name="atlas-3" status="blocked" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: IdentityState },
    { id: "working", Example: WorkingState },
    { id: "blocked", Example: BlockedState },
  ],
);

export default function AgentAvatarExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <IdentityState />
      <WorkingState />
      <BlockedState />
    </div>
  );
}
