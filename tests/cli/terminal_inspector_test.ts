import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { styleText } from "../../src/cli/ansi.ts";
import {
  inspectTerminalLayout,
  projectTerminalInspectorHtml,
} from "../../src/cli/projection.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";

Deno.test("terminal layout inspection separates geometry from advisory cues", () => {
  const inspection = inspectTerminalLayout(
    "alpha\n\n\nrepeat\nrepeat\n123456789",
    { columns: 8, rows: 5 },
  );

  assertEquals(inspection.contentRows, 6);
  assertEquals(inspection.maximumColumns, 9);
  assertEquals(inspection.spareRows, 0);
  assertEquals(inspection.rowsBelowFold, 1);
  assertEquals(inspection.overflowRows, [6]);
  assertEquals(inspection.lines, [
    {
      row: 1,
      text: "alpha",
      columns: 5,
      blank: false,
      overflows: false,
      belowFold: false,
    },
    {
      row: 2,
      text: "",
      columns: 0,
      blank: true,
      overflows: false,
      belowFold: false,
    },
    {
      row: 3,
      text: "",
      columns: 0,
      blank: true,
      overflows: false,
      belowFold: false,
    },
    {
      row: 4,
      text: "repeat",
      columns: 6,
      blank: false,
      overflows: false,
      belowFold: false,
    },
    {
      row: 5,
      text: "repeat",
      columns: 6,
      blank: false,
      overflows: false,
      belowFold: false,
    },
    {
      row: 6,
      text: "123456789",
      columns: 9,
      blank: false,
      overflows: true,
      belowFold: true,
    },
  ]);
  assertEquals(inspection.reviewCues, [{
    kind: "blank-run",
    rows: [2, 3],
    message: "rows 2 and 3 contain consecutive blank lines.",
  }, {
    kind: "repeated-line",
    rows: [4, 5],
    message: "rows 4 and 5 repeat the same visible line.",
  }]);
});

Deno.test("terminal layout inspection handles tabs, Unicode, and terminal newlines", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const output = `${styleText("界", { bold: true }, capabilities)}\tvalue\n`;
  const inspection = inspectTerminalLayout(output, { columns: 12, rows: 2 });

  assertEquals(
    inspection.contentRows,
    1,
    "terminal newline added a phantom row",
  );
  assertEquals(inspection.maximumColumns, 13);
  assertEquals(inspection.overflowRows, [1]);
  assertEquals(inspection.lines[0]?.text, "界\tvalue");
});

Deno.test("terminal inspector HTML carries a self-contained viewport and real styles", () => {
  const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
  const output = styleText(
    "ready\nnext",
    { bold: true },
    capabilities,
  );
  const html = projectTerminalInspectorHtml(output, {
    columns: 12,
    rows: 4,
    title: "<Status> & layout",
    showGrid: true,
  });

  assertStringIncludes(html, "data-discern-terminal-inspector");
  assertStringIncludes(html, 'data-discern-terminal-theme="dark"');
  assertStringIncludes(html, "data-discern-terminal-viewport");
  assertStringIncludes(html, "data-discern-overflow-cue-target");
  assertStringIncludes(html, 'tabindex="0"');
  assertStringIncludes(html, 'role="region"');
  assertStringIncludes(html, 'data-discern-terminal-columns="12"');
  assertStringIncludes(html, 'data-discern-terminal-rows="4"');
  assertStringIncludes(html, "&lt;Status&gt; &amp; layout");
  assertStringIncludes(html, "12 × 4 viewport");
  assertStringIncludes(html, "2 content rows");
  assertStringIncludes(html, "2 rows spare");
  assertStringIncludes(html, "123456789012");
  assertStringIncludes(html, 'data-discern-terminal-ruler="labels"');
  assertStringIncludes(html, 'data-discern-terminal-ruler="ticks"');
  assertStringIncludes(html, 'data-discern-terminal-row-number="1"');
  assertStringIncludes(html, " / 0.7)");
  assertStringIncludes(html, " / 0.34)");
  assertStringIncludes(html, "repeating-linear-gradient");
  assertStringIncludes(html, "font-weight:700");
  assertStringIncludes(html, "No advisory review cues.");
});

Deno.test("terminal inspector validates explicit geometry", () => {
  for (
    const viewport of [
      { columns: 0, rows: 24 },
      { columns: 80, rows: 0 },
      { columns: 80.5, rows: 24 },
    ]
  ) {
    assertThrows(
      () => inspectTerminalLayout("frame", viewport),
      TypeError,
      "positive safe integer",
    );
  }
});
