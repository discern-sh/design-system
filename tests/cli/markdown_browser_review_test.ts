import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { markdownBrowserReviewArtifacts } from "../../catalogue/markdown-browser-review.ts";
import { inspectTerminalLayout } from "../../src/cli/projection.ts";

Deno.test("Markdown browser visual review enrolls every required posture", () => {
  const artifacts = markdownBrowserReviewArtifacts();
  assertEquals(artifacts.map(({ id }) => id), [
    "initial-picker",
    "split-reader",
    "single-pane",
    "no-color",
    "resize-result",
  ]);
  for (const artifact of artifacts) {
    assertEquals(artifact.frame.split("\n").length, artifact.rows);
    assertEquals(
      inspectTerminalLayout(artifact.frame, artifact).overflowRows,
      [],
    );
    assertStringIncludes(
      artifact.inspectorHtml,
      `data-discern-terminal-columns="${artifact.columns}"`,
    );
    assertStringIncludes(
      artifact.inspectorHtml,
      `data-discern-terminal-rows="${artifact.rows}"`,
    );
  }
  assert(
    artifacts.find(({ id }) => id === "no-color")?.frame.includes("\u001b") ===
      false,
  );
  assertStringIncludes(
    artifacts.find(({ id }) => id === "resize-result")?.frame ?? "",
    "Paragraph",
  );
});
