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

function dispositionTokenFailures(
  css: string,
  dispositions: readonly string[],
  expected: Readonly<Record<string, string>>,
): readonly string[] {
  const failures: string[] = [];
  for (const disposition of dispositions) {
    const blocks = [
      ...css.matchAll(
        new RegExp(
          `[^{}]*\\[data-discern-disposition="${disposition}"\\][^{}]*\\{([^}]*)\\}`,
          "g",
        ),
      ),
    ];
    const tokens = new Set(
      blocks.flatMap((match) =>
        [...(match[1] ?? "").matchAll(/color:\s*var\((--[^)]+)\)/g)].map(
          (color) => color[1] ?? "",
        )
      ).filter(Boolean),
    );
    const token = expected[disposition];
    if (token === undefined || tokens.size !== 1 || !tokens.has(token)) {
      failures.push(
        `${disposition}: expected ${token ?? "a declared token"}, found ${
          [...tokens].join(", ") || "no explicit token"
        }`,
      );
    }
  }
  return failures;
}

function invalidPhrasingFlowNesting(html: string): readonly string[] {
  const phrasingContainers = new Set([
    "a",
    "abbr",
    "b",
    "code",
    "em",
    "i",
    "mark",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
  ]);
  const flowOnly = new Set([
    "address",
    "article",
    "aside",
    "blockquote",
    "div",
    "dl",
    "fieldset",
    "figure",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hr",
    "main",
    "nav",
    "ol",
    "p",
    "pre",
    "section",
    "table",
    "ul",
  ]);
  const voidTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "source",
    "track",
    "wbr",
  ]);
  const stack: string[] = [];
  const failures: string[] = [];
  for (const match of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    const closing = match[1] === "/";
    const tag = (match[2] ?? "").toLowerCase();
    if (closing) {
      const index = stack.lastIndexOf(tag);
      if (index >= 0) stack.splice(index);
      continue;
    }
    const phrasingAncestor = stack.findLast((ancestor) =>
      phrasingContainers.has(ancestor)
    );
    if (phrasingAncestor !== undefined && flowOnly.has(tag)) {
      failures.push(`${phrasingAncestor} cannot contain ${tag}`);
    }
    if (!voidTags.has(tag) && !match[0].endsWith("/>")) stack.push(tag);
  }
  return failures;
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

Deno.test("every file disposition has its complete semantic token mapping", async () => {
  const css = await Deno.readTextFile(
    new URL(
      "../src/components/workflow/file-change/file-change.css",
      import.meta.url,
    ),
  );
  const expected = {
    added: "--discern-color-success-deep",
    updated: "--discern-color-accent-700",
    generated: "--discern-color-ink-muted",
    removed: "--discern-color-ink-muted",
    unchanged: "--discern-color-ink-muted",
  } as const satisfies Readonly<
    Record<(typeof fileDispositions)[number], string>
  >;
  assertEquals(
    dispositionTokenFailures(css, fileDispositions, expected),
    [],
  );

  const synthetic = `
    .future-entry[data-discern-disposition="removed"] .future-state {
      color: var(--discern-color-danger);
    }
  `;
  assertEquals(
    dispositionTokenFailures(synthetic, ["removed"], expected),
    [
      "removed: expected --discern-color-ink-muted, found --discern-color-danger",
    ],
  );
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

Deno.test("Artifact tree annotations accept inline and flow compositions without invalid nesting", () => {
  const ownership = renderToStaticMarkup(
    <ArtifactTree
      nodes={[{
        name: "guidance.md",
        kind: "file",
        annotation: <OwnershipBadge ownership="authored" />,
      }]}
    />,
  );
  const fileChange = renderToStaticMarkup(
    <ArtifactTree
      nodes={[{
        name: "guidance.md",
        kind: "file",
        annotation: (
          <FileChange
            path="/workspace/guidance.md"
            disposition="updated"
          />
        ),
      }]}
    />,
  );
  assertEquals(invalidPhrasingFlowNesting(ownership), []);
  assertEquals(invalidPhrasingFlowNesting(fileChange), []);

  assertEquals(
    invalidPhrasingFlowNesting(
      '<mark class="future-note"><section>Flow content</section></mark>',
    ),
    ["mark cannot contain section"],
  );
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
