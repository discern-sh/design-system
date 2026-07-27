import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
