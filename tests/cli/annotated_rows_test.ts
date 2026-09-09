import { assert, assertEquals, assertThrows } from "@std/assert";
import { measureText, renderSelectCli, stripAnsi } from "../../src/cli/mod.ts";
import { projectTerminalSpans } from "../../src/cli/projection.ts";
const options = [{
  id: "one",
  label: "First item",
  indicator: { content: "✓", ascii: "+", tone: "success" as const },
  status: { content: "Ready", tone: "success" as const },
}, {
  id: "two",
  label: "Second item",
  status: { content: "Waiting", tone: "warning" as const },
}];
Deno.test("row annotations align and retain semantic style independently of focus", () => {
  for (const colorDepth of ["none", "truecolor"] as const) {
    for (const unicode of [true, false]) {
      const frames = [0, 1].map((highlightedIndex) =>
        renderSelectCli({
          kind: "select",
          label: "Choose",
          lifecycle: { status: "active" },
          presentation: "menu",
          chrome: "none",
          options,
          highlightedIndex,
          appearance: { accent: 220 },
        }, { colorDepth, unicode, columns: 40 })
      );
      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          assert(measureText(line) <= 40);
        }
        assert(stripAnsi(frame).includes(unicode ? "✓" : "+"));
        assert(stripAnsi(frame).includes("Ready"));
        assert(!stripAnsi(frame).includes("┌"));
        const lines = stripAnsi(frame).split("\n");
        assertEquals(measureText(lines[0]!), 40);
        assertEquals(measureText(lines[1]!), 40);
      }
      const statusStyle = frames.map((frame) =>
        projectTerminalSpans(frame).find((span) => span.text.includes("Ready"))
          ?.style
      );
      assertEquals(statusStyle[0], statusStyle[1]);
      if (colorDepth !== "none") {
        const focus = projectTerminalSpans(frames[0]!).find((span) =>
          span.text.includes("First item")
        );
        assert(
          JSON.stringify(focus?.style?.color) !==
            JSON.stringify(statusStyle[0]?.color),
        );
      }
    }
  }
});
Deno.test("row annotations reject terminal controls and bound oversized labels", () => {
  const render = (label: string, status: string) =>
    renderSelectCli({
      kind: "select",
      label: "Choose",
      lifecycle: { status: "active" },
      presentation: "menu",
      chrome: "none",
      maximumLabelLines: 2,
      options: [{ id: "x", label, status: { content: status } }],
      highlightedIndex: 0,
    }, { colorDepth: "none", unicode: true, columns: 32 });
  assertEquals(
    render("Long label ".repeat(100), "Ready").split("\n").length,
    2,
  );
  assertThrows(() => render("Label", "\x1b[2J"), TypeError);
});
