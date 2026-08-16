import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import { measureText } from "../../src/cli/text.ts";
import { transitionMarkdownBrowser } from "../../src/cli/interactive/markdown-browser-machine.ts";
import { createMarkdownBrowserState } from "../../src/cli/interactive/markdown-browser-model.ts";
import {
  markdownBrowserDocumentLines,
  renderMarkdownBrowser,
} from "../../src/cli/interactive/markdown-browser-renderer.ts";
import { CompleteFramePainter } from "../../src/cli/interactive/painter.ts";
import {
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import {
  inspectTerminalLayout,
  projectTerminalSpans,
} from "../../src/cli/projection.ts";
import { markdownBrowserOptions } from "../../catalogue/markdown-browser-example.ts";

function openedState(columns: number, rows: number) {
  const capabilities = testTerminalCapabilities({
    columns,
    colorDepth: "truecolor",
    hyperlinks: true,
  });
  const initial = createMarkdownBrowserState(
    markdownBrowserOptions,
    { columns, rows },
    { theme: "dark" },
  );
  const opened = transitionMarkdownBrowser(initial, {
    kind: "key",
    key: { kind: "named", name: "enter" },
  }, capabilities).state;
  return { capabilities, state: opened };
}

Deno.test("complete Markdown browser frames fit and rerender deterministically at every review profile", () => {
  for (
    const profile of [
      { columns: 40, rows: 24 },
      { columns: 80, rows: 24 },
      { columns: 120, rows: 30 },
      { columns: 80, rows: 40 },
    ]
  ) {
    const { capabilities, state } = openedState(
      profile.columns,
      profile.rows,
    );
    const frame = renderMarkdownBrowser(state, capabilities);
    assertEquals(renderMarkdownBrowser(state, capabilities), frame);
    assertEquals(frame.split("\n").length, profile.rows);
    assert(
      frame.split("\n").every((line) => measureText(line) === profile.columns),
      `${profile.columns}x${profile.rows} frame must occupy exact cell rows`,
    );
    const inspection = inspectTerminalLayout(frame, profile);
    assertEquals(inspection.overflowRows, []);
    assertEquals(inspection.spareRows, 0);

    const io = new FakeTerminalIO([], profile);
    new CompleteFramePainter(io).replace(frame);
    assertEquals(
      io.writes.length,
      1,
      "every styled line must be self-contained",
    );
    for (const line of frame.split("\n")) projectTerminalSpans(line);
  }
});

Deno.test("the reader uses Markdown treatment, links, focus cues, and a readable wide measure", () => {
  const { capabilities, state } = openedState(120, 30);
  const document = markdownBrowserDocumentLines(state, capabilities);
  const plain = stripAnsi(document.join("\n"));
  assertStringIncludes(plain, "deliberately long guide heading");
  assertStringIncludes(plain, "Keep the selected document");
  assertStringIncludes(plain, "Search a grouped corpus");
  assertStringIncludes(plain, "Profile");
  assertStringIncludes(plain, "const state = createState(entries);");
  assertStringIncludes(plain, "Read the reference");
  assert(
    document.some((line) =>
      line.includes("\u001b]8;;https://example.com/reference")
    ),
    "the Markdown authority must retain OSC 8 links",
  );
  assert(
    document.every((line) => measureText(stripAnsi(line).trimEnd()) <= 96),
    "wide terminals must keep prose inside a readable centered measure",
  );

  const documentFocused = stripAnsi(renderMarkdownBrowser(state, capabilities));
  assertStringIncludes(
    documentFocused,
    "▶ Document · Keyboard Markdown browser",
  );
  assertStringIncludes(documentFocused, "Tab picker  Esc/q close");
  assert(!documentFocused.includes("[active]"));
  assertStringIncludes(documentFocused, "●");
  assertStringIncludes(documentFocused, "›");

  const pickerFocusedState = transitionMarkdownBrowser(state, {
    kind: "key",
    key: { kind: "named", name: "tab" },
  }, capabilities).state;
  const pickerFocused = stripAnsi(
    renderMarkdownBrowser(pickerFocusedState, capabilities),
  );
  assertNotEquals(documentFocused, pickerFocused);
  assertStringIncludes(pickerFocused, "▶ Picker");
  assertStringIncludes(pickerFocused, "Tab document");
});

Deno.test("single-pane fallback makes navigation discoverable without colour or Unicode", () => {
  const capabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "none",
    hyperlinks: false,
    unicode: false,
  });
  let state = createMarkdownBrowserState({
    ...markdownBrowserOptions,
    pickerMinimumRows: 11,
    documentMinimumRows: 12,
  }, { columns: 40, rows: 24 });
  state = transitionMarkdownBrowser(state, {
    kind: "key",
    key: { kind: "named", name: "enter" },
  }, capabilities).state;
  assertEquals(state.layout.mode, "document-only");
  const document = renderMarkdownBrowser(state, capabilities);
  assert(!document.includes("\u001b"));
  assertStringIncludes(document, "> Document");
  assertStringIncludes(document, "Tab picker  Esc/q close");
  assertStringIncludes(
    markdownBrowserDocumentLines(state, capabilities).join("\n"),
    "https://example.com/reference",
  );

  state = transitionMarkdownBrowser(state, {
    kind: "key",
    key: { kind: "named", name: "tab" },
  }, capabilities).state;
  assertEquals(state.layout.mode, "picker-only");
  const picker = renderMarkdownBrowser(state, capabilities);
  assert(!picker.includes("\u001b"));
  assertStringIncludes(picker, "> Picker");
  assertStringIncludes(picker, "Tab document");
});
