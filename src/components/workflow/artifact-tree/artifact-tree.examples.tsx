import type { ConformanceScenario } from "../../../../catalogue/conformance.ts";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { OwnershipBadge } from "../ownership-badge/ownership-badge.tsx";
import { ArtifactTree } from "./artifact-tree.tsx";
import meta, { componentExampleVocabulary } from "./artifact-tree.meta.ts";

const stressFilename =
  "generated-api-reference-with-a-purposefully-long-filename.html";
const stressPath =
  `/workspace/packages/reference/generated/pages/api/${stressFilename}`;

export const conformance = [{
  example: "deep-tree",
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

function ProjectTreeState() {
  return (
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
              name: "instructions.md",
              path: "/workspace/instructions.md",
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
                name: "api-reference.html",
                path: "/workspace/generated/api-reference.html",
                kind: "file",
                annotation: <OwnershipBadge ownership="generated" />,
              }],
            },
          ],
        },
      ]}
    />
  );
}

function DeepTreeState() {
  return (
    <div
      data-example-artifact-tree-stress
      style={{ width: "100%", maxWidth: "390px" }}
    >
      <ArtifactTree
        label="Deep generated path"
        nodes={[{
          name: "workspace",
          path: "/workspace",
          kind: "directory",
          children: [{
            name: "packages",
            path: "/workspace/packages",
            kind: "directory",
            children: [{
              name: "reference",
              path: "/workspace/packages/reference",
              kind: "directory",
              children: [{
                name: "generated",
                path: "/workspace/packages/reference/generated",
                kind: "directory",
                children: [{
                  name: "pages",
                  path: "/workspace/packages/reference/generated/pages",
                  kind: "directory",
                  children: [{
                    name: "api",
                    path: "/workspace/packages/reference/generated/pages/api",
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
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: ProjectTreeState },
    { id: "deep-tree", Example: DeepTreeState },
  ],
);

export default function ArtifactTreeExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <ProjectTreeState />
      <DeepTreeState />
    </div>
  );
}
