import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { stripAnsi, styleText } from "../../src/cli/ansi.ts";
import { measureText } from "../../src/cli/text.ts";
import { terminalThemeColor, terminalThemes } from "../../src/cli/theme.ts";
import {
  renderCheckboxCli,
  renderRadioCli,
  renderSelectCli,
} from "../../src/cli/mod.ts";
import {
  requestSearch,
  requestSearchSelections,
  requestSelection,
} from "../../src/cli/interactive/mod.ts";
import {
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const longLabel =
  "This task label is deliberately long enough to wrap onto another line";
const shortLabel = "Short";

function widestLine(frame: string): number {
  return Math.max(
    ...stripAnsi(frame).split("\n").map((line) => measureText(line)),
  );
}

function longChoiceLines(frame: string): readonly string[] {
  const lines = stripAnsi(frame).split("\n");
  const start = lines.findIndex((line) => line.includes("This task label"));
  const end = lines.findIndex((line, index) =>
    index > start && line.includes(shortLabel)
  );
  if (start < 0 || end < 0) {
    throw new Error("choice frame did not contain the expected long row");
  }
  return lines.slice(start, end).map((line, index) =>
    index === 0 ? line.replace(/^│./u, "│ ") : line
  );
}

function assertStableChoiceGeometry(
  highlighted: string,
  unhighlighted: string,
  labelColumn: number,
): void {
  const activeLines = longChoiceLines(highlighted);
  const inactiveLines = longChoiceLines(unhighlighted);
  assertEquals(activeLines, inactiveLines);
  const continuationPrefix = `│${" ".repeat(labelColumn)}`;
  assert(
    activeLines.slice(1).every((line) => line.startsWith(continuationPrefix)),
    `wrapped choice labels must continue at column ${labelColumn}`,
  );
}

function assertEveryHeadingHasSpace(frame: string): void {
  const lines = stripAnsi(frame).split("\n");
  const headings = lines.flatMap((line, index) =>
    line.includes("PRIMARY") || line.includes("SECONDARY") ? [index] : []
  );
  assertEquals(headings.length, 2);
  for (const index of headings) {
    assertEquals(
      lines[index - 1],
      "│                              │",
      `group heading on line ${index + 1} needs one framed blank row above it`,
    );
  }
}

Deno.test("scrolling choice frames use the available terminal width while compact forms retain the prose measure", () => {
  const capabilities = testTerminalCapabilities({ columns: 96 });
  const options = [
    { id: "one", label: "One" },
    { id: "two", label: "Two" },
  ] as const;
  const choiceFrames = [
    renderSelectCli({
      kind: "select",
      label: "Pick",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 0,
    }, capabilities),
    renderCheckboxCli({
      kind: "multiselect",
      label: "Pick many",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 0,
      selectedIds: [],
    }, capabilities),
    renderRadioCli({
      kind: "search",
      label: "Find",
      lifecycle: { status: "active" },
      query: "",
      cursor: 0,
      results: options,
      highlightedIndex: 0,
    }, capabilities),
  ];
  assertEquals(choiceFrames.map(widestLine), [96, 96, 96]);

  const confirmation = renderCheckboxCli({
    kind: "confirm",
    label: "Continue",
    lifecycle: { status: "active" },
    value: true,
    yesLabel: "Yes",
    noLabel: "No",
  }, capabilities);
  assertEquals(widestLine(confirmation), 62);
});

Deno.test("highlight movement preserves every wrapped choice label column and row", () => {
  const capabilities = testTerminalCapabilities({ columns: 30 });
  const options = [
    { id: "long", label: longLabel },
    { id: "short", label: shortLabel },
  ] as const;

  assertStableChoiceGeometry(
    renderSelectCli({
      kind: "select",
      label: "Pick",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 0,
      selectedId: "long",
      width: 30,
    }, capabilities),
    renderSelectCli({
      kind: "select",
      label: "Pick",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 1,
      selectedId: "long",
      width: 30,
    }, capabilities),
    6,
  );

  assertStableChoiceGeometry(
    renderCheckboxCli({
      kind: "multiselect",
      label: "Pick many",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 0,
      selectedIds: ["long"],
      width: 30,
    }, capabilities),
    renderCheckboxCli({
      kind: "multiselect",
      label: "Pick many",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 1,
      selectedIds: ["long"],
      width: 30,
    }, capabilities),
    6,
  );

  assertStableChoiceGeometry(
    renderRadioCli({
      kind: "select",
      label: "Pick",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 0,
      selectedId: "long",
      width: 30,
    }, capabilities),
    renderRadioCli({
      kind: "select",
      label: "Pick",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 1,
      selectedId: "long",
      width: 30,
    }, capabilities),
    4,
  );
});

Deno.test("wrapped highlighted choice labels retain their Token styling", () => {
  const capabilities = testTerminalCapabilities({
    colorDepth: "truecolor",
    columns: 30,
  });
  const frame = renderSelectCli({
    kind: "select",
    label: "Pick",
    lifecycle: { status: "active" },
    options: [
      { id: "long", label: longLabel },
      { id: "short", label: shortLabel },
    ],
    highlightedIndex: 0,
    width: 30,
  }, capabilities);
  const wrappedRows = frame.split("\n").filter((line) => {
    const plain = stripAnsi(line);
    return plain.includes("This task label") ||
      plain.includes("deliberately") ||
      plain.includes("onto another line");
  });
  assert(wrappedRows.length > 1);
  assert(
    wrappedRows.every((line) =>
      line.split(String.fromCharCode(27)).length - 1 > 4
    ),
    "each wrapped label row must carry styling beyond the two styled borders",
  );
});

Deno.test("every semantic choice group heading has one framed blank row above it", () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  const options = [
    { kind: "group-heading" as const, id: "primary", label: "Primary" },
    { id: "one", label: "One" },
    { kind: "group-heading" as const, id: "secondary", label: "Secondary" },
    { id: "two", label: "Two" },
  ];
  assertEveryHeadingHasSpace(renderSelectCli({
    kind: "select",
    label: "Pick",
    lifecycle: { status: "active" },
    options,
    highlightedIndex: 1,
    width: 32,
  }, capabilities));
  assertEveryHeadingHasSpace(renderCheckboxCli({
    kind: "multiselect",
    label: "Pick many",
    lifecycle: { status: "active" },
    options,
    highlightedIndex: 1,
    selectedIds: [],
    width: 32,
  }, capabilities));
  assertEveryHeadingHasSpace(renderRadioCli({
    kind: "select",
    label: "Pick",
    lifecycle: { status: "active" },
    options,
    highlightedIndex: 1,
    width: 32,
  }, capabilities));
});

Deno.test("choice frames disclose hidden options in the bottom border", () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  const options = Array.from({ length: 5 }, (_, index) => ({
    id: `choice-${index}`,
    label: `Choice ${index + 1}`,
  }));
  const first = stripAnsi(renderSelectCli({
    kind: "select",
    label: "Pick",
    lifecycle: { status: "active" },
    options,
    highlightedIndex: 0,
    visibleStart: 0,
    visibleCount: 2,
    width: 32,
  }, capabilities));
  assertStringIncludes(first, "↓ 3 more");

  const middle = stripAnsi(renderSelectCli({
    kind: "select",
    label: "Pick",
    lifecycle: { status: "active" },
    options,
    highlightedIndex: 2,
    visibleStart: 2,
    visibleCount: 2,
    width: 32,
  }, capabilities));
  assertStringIncludes(middle, "↑ 2 more · ↓ 1 more");

  const ascii = testTerminalCapabilities({ columns: 32, unicode: false });
  const asciiFrame = stripAnsi(renderSelectCli({
    kind: "select",
    label: "Pick",
    lifecycle: { status: "active" },
    options,
    highlightedIndex: 0,
    visibleStart: 0,
    visibleCount: 2,
    width: 32,
  }, ascii));
  assertStringIncludes(asciiFrame, "v 3 more");

  const styled = testTerminalCapabilities({
    columns: 32,
    colorDepth: "truecolor",
  });
  const styledFrame = renderSelectCli({
    kind: "select",
    label: "Pick",
    lifecycle: { status: "active" },
    options,
    highlightedIndex: 0,
    visibleStart: 0,
    visibleCount: 2,
    width: 32,
  }, styled);
  const theme = terminalThemes.dark;
  assertStringIncludes(
    styledFrame,
    styleText(" ↓ 3 more ", {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, styled),
  );
});

Deno.test("search and search-multiselect requests retain overflow counts in their rendered state", async () => {
  const choices = Array.from({ length: 5 }, (_, index) => ({
    id: `choice-${index}`,
    label: `Choice ${index + 1}`,
    value: index,
  }));
  let io = new FakeTerminalIO(["\r", "\r"], { columns: 32 });
  await requestSearch({
    label: "Find",
    visibleCount: 2,
    search: () => choices,
  }, { io });
  assertStringIncludes(stripAnsi(io.output()), "↓ 3 more");

  io = new FakeTerminalIO(["\r"], { columns: 32 });
  await requestSearchSelections({
    label: "Find many",
    visibleCount: 2,
    search: () => choices,
  }, { io });
  assertStringIncludes(stripAnsi(io.output()), "↓ 3 more");
});

Deno.test("an active choice request expands again after a wider terminal resize", async () => {
  const io = new FakeTerminalIO([], { columns: 50, rows: 16 });
  io.enqueueResize(96);
  io.enqueueKeys("down", "enter");
  await requestSelection({
    label: "Pick",
    choices: [
      { id: "one", label: "One", value: 1 },
      { id: "two", label: "Two", value: 2 },
    ],
  }, { io });
  const activeWidths = io.writes.flatMap((write) => {
    const frame = stripAnsi(write);
    return frame.includes("[active]") ? [widestLine(frame)] : [];
  });
  assertStringIncludes(activeWidths.join(","), "96");
});
