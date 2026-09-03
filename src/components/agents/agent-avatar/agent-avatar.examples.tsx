import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { AgentAvatar } from "./agent-avatar.tsx";
import meta, { componentExampleVocabulary } from "./agent-avatar.meta.ts";

function IdentityState() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--discern-space-3)",
      }}
    >
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
    {
      id: "default",
      Example: IdentityState,
      capture: { selectors: [".discern-agent-avatar"] },
    },
    { id: "working", Example: WorkingState },
    { id: "blocked", Example: BlockedState },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "working-motion",
      label: "Working motion",
      example: "working",
      category: "motion",
      sequence: [{ checkpoint: { id: "avatar-working", label: "Working" } }],
      requirements: { reducedMotion: false },
    },
    {
      id: "working-reduced",
      label: "Working still",
      example: "working",
      category: "motion",
      sequence: [{
        checkpoint: { id: "avatar-working-still", label: "Working still" },
      }],
      requirements: { reducedMotion: true },
    },
  ] as const,
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
