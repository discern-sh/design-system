import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { packageManifest } from "../src/manifest.ts";
import { AgentHandoff } from "../src/components/workflow/agent-handoff/agent-handoff.tsx";
import { catalogueStates as branchChoiceStates } from "../src/components/workflow/branch-choice/branch-choice.examples.tsx";
import type { ComponentMeta } from "../src/types/component-meta.ts";
import { compositionRecipes } from "../styleguide/compositions.tsx";
import {
  type TaskFileEffects,
  TaskMetadata,
  type TaskRetrySafety,
} from "../src/components/workflow/task-metadata/task-metadata.tsx";

const commonFacts = {
  outcome: "Verify the generated reference.",
  audience: "Maintainers",
  prerequisites: "A clean worktree",
  complexity: "About 10 minutes",
  expectedState: "The reference matches its source.",
} as const;

Deno.test("task metadata owns a complete labelled task orientation", () => {
  const html = renderToStaticMarkup(
    createElement(TaskMetadata, {
      ...commonFacts,
      fileEffects: "changes-files",
      retrySafety: "check-first",
    }),
  );

  assertMatch(
    html,
    /<section[^>]*aria-label="Task overview"[^>]*><dl class="discern-task-metadata__facts">/,
  );
  assertEquals((html.match(/<dt>/g) ?? []).length, 7);
  assertEquals((html.match(/<dd>/g) ?? []).length, 7);
  for (
    const label of [
      "Outcome",
      "For",
      "Prerequisites",
      "Approximate complexity",
      "File effects",
      "Retry safety",
      "Expected end state",
    ]
  ) {
    assertStringIncludes(html, `<dt>${label}</dt>`);
  }
  assertStringIncludes(html, "Changes files");
  assertStringIncludes(html, "Check the current state before retrying");
});

Deno.test("task metadata writes every closed state as visible text", () => {
  const fileEffects: ReadonlyArray<
    readonly [TaskFileEffects, string]
  > = [
    ["none", "Does not change files"],
    ["may-change", "May change files"],
    ["changes-files", "Changes files"],
  ];
  for (const [fileEffect, label] of fileEffects) {
    const html = renderToStaticMarkup(
      createElement(TaskMetadata, {
        ...commonFacts,
        fileEffects: fileEffect,
        retrySafety: "safe",
      }),
    );
    assertStringIncludes(html, label);
  }

  const retryStates: ReadonlyArray<
    readonly [TaskRetrySafety, string]
  > = [
    ["safe", "Safe to retry"],
    ["check-first", "Check the current state before retrying"],
    ["do-not-retry", "Do not retry"],
  ];
  for (const [retrySafety, label] of retryStates) {
    const html = renderToStaticMarkup(
      createElement(TaskMetadata, {
        ...commonFacts,
        fileEffects: "none",
        retrySafety,
      }),
    );
    assertStringIncludes(html, label);
  }
});

Deno.test("agent handoff has one visible plain-text prompt authority", () => {
  const prompt =
    "Inspect the assigned change.\nRun the checks.\nReport the evidence.";
  const html = renderToStaticMarkup(
    createElement(AgentHandoff, {
      title: "Hand off the review",
      description: "Paste these instructions into an agent session.",
      children: prompt,
    }),
  );

  assertStringIncludes(html, 'role="group"');
  assertStringIncludes(html, 'aria-label="Hand off the review"');
  assertStringIncludes(
    html,
    `<pre class="discern-agent-handoff__prompt">${prompt}</pre>`,
  );
  assertEquals(html.split(prompt).length - 1, 1);
  assert(!html.includes("<code"));
  assertStringIncludes(html, "Copy prompt");

  const manifestEntry = packageManifest.components.find(({ id }) =>
    id === "agent-handoff"
  );
  assert(manifestEntry !== undefined);
  assertEquals(manifestEntry.dependencies, ["copy-button"]);
});

Deno.test("next action remains a guarded Branch choice composition", async () => {
  assert(
    !packageManifest.components.some(({ id }) => id === "next-action"),
    "next action must not become a runtime component",
  );

  const workflowRoot = new URL(
    "../src/components/workflow/",
    import.meta.url,
  );
  for await (const entry of Deno.readDir(workflowRoot)) {
    if (!entry.isDirectory) continue;
    assert(entry.name !== "next-action");
    const module = await import(
      new URL(`${entry.name}/${entry.name}.meta.ts`, workflowRoot).href
    ) as { readonly default: ComponentMeta };
    assert(
      module.default.order !== 420,
      `${module.default.slug} occupies reserved composition order 420`,
    );
  }

  const state = branchChoiceStates.find(({ name }) => name === "next-action");
  assert(state !== undefined);
  const stateHtml = renderToStaticMarkup(createElement(state.Example));
  assertEquals(
    (stateHtml.match(/class="discern-branch-choice__choice"/g) ?? []).length,
    4,
  );
  assertStringIncludes(stateHtml, "Recommended — it worked");
  assertStringIncludes(stateHtml, "Hand it to an agent");

  const recipe = compositionRecipes.find(({ id }) => id === "next-action");
  assert(recipe !== undefined);
  assertStringIncludes(recipe.source, "import { BranchChoice }");
  assertStringIncludes(recipe.source, "<BranchChoice");
  assert(!recipe.source.includes("<NextAction"));
});
