import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { OwnershipBadge } from "../ownership-badge/ownership-badge.tsx";
import { ArtifactTree } from "./artifact-tree.tsx";

const stressFilename =
  "generated-component-registry-with-a-purposeful-long-name.tsx";
const stressPath =
  `/workspace/packages/catalogue/generated/components/workflow/${stressFilename}`;

export const conformance = [{
  name:
    "six nested levels and a 60-character filename stay inside a mobile viewport",
  viewport: { width: 390, height: 844 },
  steps: [{
    expect: "within-viewport",
    target: { selector: "[data-example-artifact-tree-stress]" },
  }, {
    expect: "attribute",
    target: {
      selector:
        `[data-example-artifact-tree-stress] .discern-artifact-tree__name[title$="${stressFilename}"]`,
    },
    attribute: "title",
    value: stressPath,
  }],
}] satisfies readonly ConformanceScenario[];

export default function ArtifactTreeExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <ArtifactTree
        label="Project files"
        nodes={[
          {
            name: "workspace",
            path: "/workspace",
            kind: "directory",
            annotation: <OwnershipBadge ownership="project-owned" />,
            children: [
              {
                name: "project.toml",
                path: "/workspace/project.toml",
                kind: "file",
                annotation: <OwnershipBadge ownership="project-owned" />,
              },
              {
                name: "guidance.md",
                path: "/workspace/guidance.md",
                kind: "file",
                annotation: <OwnershipBadge ownership="authored" />,
              },
              {
                name: "map",
                path: "/workspace/map",
                kind: "directory",
                children: [{
                  name: "README.md",
                  path: "/workspace/map/README.md",
                  kind: "file",
                  annotation: <OwnershipBadge ownership="authored" />,
                }],
              },
              {
                name: "generated",
                path: "/workspace/generated",
                kind: "directory",
                annotation: <OwnershipBadge ownership="tool-owned" />,
                children: [{
                  name: "agent-guidance.md",
                  path: "/workspace/generated/agent-guidance.md",
                  kind: "file",
                  annotation: <OwnershipBadge ownership="generated" />,
                }],
              },
            ],
          },
        ]}
      />
      <div
        data-example-artifact-tree-stress
        style={{ width: "100%", maxWidth: "390px" }}
      >
        <ArtifactTree
          label="Deep generated file"
          nodes={[{
            name: "workspace",
            path: "/workspace",
            kind: "directory",
            children: [{
              name: "packages",
              path: "/workspace/packages",
              kind: "directory",
              children: [{
                name: "catalogue",
                path: "/workspace/packages/catalogue",
                kind: "directory",
                children: [{
                  name: "generated",
                  path: "/workspace/packages/catalogue/generated",
                  kind: "directory",
                  children: [{
                    name: "components",
                    path: "/workspace/packages/catalogue/generated/components",
                    kind: "directory",
                    children: [{
                      name: "workflow",
                      path:
                        "/workspace/packages/catalogue/generated/components/workflow",
                      kind: "directory",
                      children: [{
                        name: stressFilename,
                        path: stressPath,
                        kind: "file",
                        annotation: <OwnershipBadge ownership="generated" />,
                      }],
                    }],
                  }],
                }],
              }],
            }],
          }]}
        />
      </div>
    </div>
  );
}
