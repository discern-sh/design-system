import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { OwnershipBadge } from "./ownership-badge.tsx";
import meta, { componentExampleVocabulary } from "./ownership-badge.meta.ts";

function AuthoredState() {
  return <OwnershipBadge ownership="authored" />;
}

function GeneratedState() {
  return <OwnershipBadge ownership="generated" />;
}

function ProjectOwnedState() {
  return <OwnershipBadge ownership="project-owned" />;
}

function ToolOwnedState() {
  return <OwnershipBadge ownership="tool-owned" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "authored", Example: AuthoredState },
    { id: "generated", Example: GeneratedState },
    { id: "project-owned", Example: ProjectOwnedState },
    { id: "tool-owned", Example: ToolOwnedState },
  ],
);

export default function OwnershipBadgeExamples() {
  return (
    <div className="discern-example-row">
      <AuthoredState />
      <GeneratedState />
      <ProjectOwnedState />
      <ToolOwnedState />
    </div>
  );
}
