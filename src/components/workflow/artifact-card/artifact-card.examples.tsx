import { PathReference } from "../path-reference/path-reference.tsx";
import { ArtifactCard } from "./artifact-card.tsx";

export default function ArtifactCardExamples() {
  return (
    <div
      className="discern-example-stack discern-example-stack--start"
      style={{ maxWidth: "40rem" }}
    >
      <ArtifactCard
        name="Component registry"
        path="/workspace/generated/component-registry.ts"
        summary="The stable component index consumed by the runtime emitter."
        ownership="generated"
        provenance={
          <>
            Generated from <PathReference path="/workspace/components.ts" />
          </>
        }
        sourceLink={<a href="#component-registry-source">View source</a>}
      />
      <ArtifactCard
        name="Project guidance"
        path="/workspace/guidance.md"
        summary="The project-specific instructions maintained by its authors."
        ownership="project-owned"
        provenance="Written during project setup"
      />
    </div>
  );
}
