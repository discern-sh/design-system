import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogueExamples as procedureExamples } from "../src/components/workflow/procedure/procedure.examples.tsx";
import { catalogueExamples as procedureStepExamples } from "../src/components/workflow/procedure-step/procedure-step.examples.tsx";
import { transcriptPositions } from "../src/components/agents/transcript/transcript.types.ts";
import { worklogPositions } from "../src/components/agents/worklog/worklog.types.ts";
import { Transcript } from "../src/components/agents/transcript/transcript.tsx";
import { denseTranscriptTurns } from "../src/components/agents/operational-examples.ts";
import { outputExtent } from "../src/components/workflow/raw-output/raw-output.types.ts";

Deno.test("active Procedure examples carry the same visible current-step meaning on Web", () => {
  for (const examples of [procedureExamples, procedureStepExamples]) {
    const active = examples.find(({ id }) => id === "active");
    assert(active !== undefined);
    const html = renderToStaticMarkup(createElement(active.Example));
    assertStringIncludes(html, 'aria-current="step"');
    assertStringIncludes(html, "Current step.");
  }
});

Deno.test("routine grouping preserves caller boundaries and every original record", () => {
  const positions = transcriptPositions(denseTranscriptTurns);
  assertEquals(positions.map((position) => position?.continued), [
    undefined,
    false,
    true,
    true,
    undefined,
    undefined,
  ]);
  assertEquals(positions[1]?.size, 3);
  const html = renderToStaticMarkup(
    createElement(Transcript, { turns: denseTranscriptTurns }),
  );
  assertEquals((html.match(/<li /g) ?? []).length, denseTranscriptTurns.length);
  for (const turn of denseTranscriptTurns) {
    assertStringIncludes(html, turn.speaker);
  }
  assertStringIncludes(html, "Decision · 09:16");
  assertEquals(
    transcriptPositions([
      { speaker: "One", speakerId: "shared", routineGroup: "Read", body: "a" },
      { speaker: "Two", speakerId: "shared", routineGroup: "Read", body: "b" },
      { speaker: "Two", body: "decision" },
      { speaker: "Two", routineGroup: "Read", body: "c" },
    ]),
    [undefined, undefined, undefined, undefined],
  );
  assertEquals(
    transcriptPositions([
      { speaker: createElement("b", {}, "One"), routineGroup: "Read" },
      { speaker: createElement("b", {}, "One"), routineGroup: "Read" },
    ]),
    [undefined, undefined],
  );
  assertEquals(
    worklogPositions([
      { status: "done", routineGroup: "Read" },
      { status: "done", routineGroup: "Read" },
      { status: "failed", routineGroup: "Read" },
      { status: "failed", routineGroup: "Read" },
      { status: "active", routineGroup: "Read" },
    ]).map((position) => position?.size),
    [2, 2, undefined, undefined, undefined],
  );
});

Deno.test("raw output extent counts authored empty, mixed-newline and Unicode content", () => {
  assertEquals(outputExtent(""), "0 lines");
  assertEquals(outputExtent("βeta"), "1 line");
  assertEquals(outputExtent("one\r\ntwo\rthree\nfour"), "4 lines");
});
