import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import artifactCardMeta from "../src/components/workflow/artifact-card/artifact-card.meta.ts";
import artifactTreeMeta from "../src/components/workflow/artifact-tree/artifact-tree.meta.ts";
import decisionRecordMeta from "../src/components/workflow/decision-record/decision-record.meta.ts";
import fileChangeMeta from "../src/components/workflow/file-change/file-change.meta.ts";
import ownershipBadgeMeta from "../src/components/workflow/ownership-badge/ownership-badge.meta.ts";
import ruleMeta from "../src/components/workflow/rule/rule.meta.ts";
import type { ArtifactTreeNode } from "../src/react.ts";
import {
  ArtifactCard,
  artifactOwnerships,
  ArtifactTree,
  DecisionRecord,
  decisionRecordStatuses,
  FileChange,
  fileDispositions,
  OwnershipBadge,
  Rule,
} from "../src/react.ts";

function canonicalLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

Deno.test("the Artifact family occupies its reserved Workflow order band", () => {
  assertEquals(
    [
      artifactTreeMeta,
      fileChangeMeta,
      artifactCardMeta,
      ownershipBadgeMeta,
      decisionRecordMeta,
      ruleMeta,
    ].map(({ slug, group, order }) => ({ slug, group, order })),
    [
      { slug: "artifact-tree", group: "Workflow", order: 310 },
      { slug: "file-change", group: "Workflow", order: 320 },
      { slug: "artifact-card", group: "Workflow", order: 330 },
      { slug: "ownership-badge", group: "Workflow", order: 340 },
      { slug: "decision-record", group: "Workflow", order: 350 },
      { slug: "rule", group: "Workflow", order: 360 },
    ],
  );
});

Deno.test("every canonical ownership and disposition is a visible text label", () => {
  for (const ownership of artifactOwnerships) {
    const markup = renderToStaticMarkup(
      <OwnershipBadge ownership={ownership} />,
    );
    assertStringIncludes(
      markup,
      `data-discern-ownership="${ownership}"`,
    );
    assertStringIncludes(markup, `>${canonicalLabel(ownership)}</span>`);
  }

  for (const disposition of fileDispositions) {
    const markup = renderToStaticMarkup(
      <FileChange path="/workspace/example.ts" disposition={disposition} />,
    );
    assertStringIncludes(
      markup,
      `data-discern-disposition="${disposition}"`,
    );
    assertStringIncludes(
      markup,
      `</span>${canonicalLabel(disposition)}</span>`,
    );
    assertStringIncludes(markup, "/workspace/example.ts");
  }
});

Deno.test("Artifact tree renders six nested directory levels and preserves the exact long path", () => {
  const filename =
    "generated-component-registry-with-a-purposeful-long-name.tsx";
  assertEquals(filename.length, 60);
  const levels = [
    "workspace",
    "packages",
    "catalogue",
    "generated",
    "components",
    "workflow",
  ] as const;
  const path = `/${levels.join("/")}/${filename}`;
  let node: ArtifactTreeNode = {
    name: filename,
    path,
    kind: "file",
    annotation: <OwnershipBadge ownership="generated" />,
  };
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    const name = levels[index];
    if (name === undefined) continue;
    node = {
      name,
      path: `/${levels.slice(0, index + 1).join("/")}`,
      kind: "directory",
      children: [node],
    };
  }

  const markup = renderToStaticMarkup(
    <ArtifactTree label="Deep project tree" nodes={[node]} />,
  );
  assertEquals(markup.match(/<ul/g)?.length, 7);
  assertEquals(markup.match(/<li/g)?.length, 7);
  assertEquals(
    markup.match(/data-discern-kind="directory"/g)?.length,
    6,
  );
  assertEquals(markup.match(/data-discern-kind="file"/g)?.length, 1);
  assertStringIncludes(markup, `title="${path}"`);
  assertStringIncludes(markup, `File: ${path}`);
  assertStringIncludes(markup, "Generated");
});

Deno.test("artifact, decision, and rule surfaces expose their source semantics", () => {
  const artifact = renderToStaticMarkup(
    <ArtifactCard
      name="Component registry"
      path="/workspace/generated/registry.ts"
      summary="Stable generated index."
      ownership="generated"
      provenance="Generated from components.ts"
      sourceLink={<a href="/components.ts">View source</a>}
    />,
  );
  assertStringIncludes(artifact, "<article");
  assertStringIncludes(artifact, "<h3>Component registry</h3>");
  assertStringIncludes(artifact, "<dl");
  assertStringIncludes(artifact, "Ownership");
  assertStringIncludes(artifact, "Generated");
  assertStringIncludes(artifact, "Provenance");
  assertStringIncludes(artifact, "Source");

  for (const status of decisionRecordStatuses) {
    const decision = renderToStaticMarkup(
      <DecisionRecord
        identifier="ADR 0012"
        title="Keep one source"
        status={status}
        date="2026-04-14"
        context="Repeated facts drift."
        decision="Generate every derived surface."
        consequences="Authored metadata becomes the edit point."
      />,
    );
    assertStringIncludes(decision, `data-discern-status="${status}"`);
    assertStringIncludes(decision, `>${canonicalLabel(status)}</span>`);
    assertStringIncludes(decision, '<time dateTime="2026-04-14">');
    const context = decision.indexOf("<h4>Context</h4>");
    const resolution = decision.indexOf("<h4>Decision</h4>");
    const consequences = decision.indexOf("<h4>Consequences</h4>");
    assert(context >= 0);
    assert(context < resolution);
    assert(resolution < consequences);
  }

  const rule = renderToStaticMarkup(
    <Rule origin="AGENTS.md" scope="Every change">
      Commit generated outputs with their source.
    </Rule>,
  );
  assertStringIncludes(rule, "<article");
  assertStringIncludes(rule, "<dl");
  assertStringIncludes(rule, "<dt>Origin</dt><dd>AGENTS.md</dd>");
  assertStringIncludes(rule, "<dt>Scope</dt><dd>Every change</dd>");
  assert(!rule.includes('role="alert"'));
});
