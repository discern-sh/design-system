import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { PathReference } from "../path-reference/path-reference.tsx";
import { ArtifactCard } from "./artifact-card.tsx";
import meta, { componentExampleVocabulary } from "./artifact-card.meta.ts";

function GeneratedArtifactState() {
  return (
    <ArtifactCard
      name="API registry"
      path="/workspace/generated/api-registry.ts"
      summary="The stable endpoint index consumed by the runtime."
      ownership="generated"
      provenance={
        <>
          Generated from <PathReference path="/workspace/api-schema.ts" />
        </>
      }
      sourceLink={<a href="#api-registry-source">View source</a>}
    />
  );
}

function ProjectOwnedArtifactState() {
  return (
    <ArtifactCard
      name="Project instructions"
      path="/workspace/instructions.md"
      summary="The project-specific instructions maintained by its authors."
      ownership="project-owned"
      provenance="Written during project setup"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: GeneratedArtifactState },
    { id: "project-owned", Example: ProjectOwnedArtifactState },
  ],
);

export default function ArtifactCardExamples() {
  return (
    <div
      className="discern-example-stack discern-example-stack--start"
      style={{ maxWidth: "40rem" }}
    >
      <GeneratedArtifactState />
      <ProjectOwnedArtifactState />
    </div>
  );
}
