import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import {
  type MarkdownBrowserTransition,
  transitionMarkdownBrowser,
} from "../../src/cli/interactive/markdown-browser-machine.ts";
import {
  createMarkdownBrowserState,
  filterMarkdownBrowserEntries,
  MarkdownBrowserRefusalError,
  markdownBrowserResumableState,
  type MarkdownBrowserState,
} from "../../src/cli/interactive/markdown-browser-model.ts";
import {
  fitMarkdownBrowserState,
  markdownBrowserDocumentAnchor,
  markdownBrowserDocumentLines,
  markdownBrowserDocumentMaximumOffset,
  markdownBrowserOffsetForAnchor,
  markdownBrowserPickerWindow,
} from "../../src/cli/interactive/markdown-browser-renderer.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import {
  markdownBrowserEntries,
  markdownBrowserOptions,
} from "../../catalogue/markdown-browser-example.ts";

const capabilities = testTerminalCapabilities({ columns: 80 });

function key<Action>(
  state: MarkdownBrowserState<Action>,
  value:
    | { readonly kind: "text"; readonly text: string }
    | {
      readonly kind: "named";
      readonly name:
        | "enter"
        | "tab"
        | "shift-tab"
        | "down"
        | "page-up"
        | "page-down"
        | "home"
        | "end"
        | "escape"
        | "ctrl-a"
        | "ctrl-b"
        | "ctrl-e"
        | "ctrl-n"
        | "ctrl-p"
        | "backspace";
    },
): MarkdownBrowserTransition<Action> {
  return transitionMarkdownBrowser(
    state,
    { kind: "key", key: value },
    { ...capabilities, columns: state.columns },
  );
}

Deno.test("browser queries reject resumed and pasted format controls", () => {
  assertThrows(
    () =>
      createMarkdownBrowserState({
        ...markdownBrowserOptions,
        initialState: {
          query: "safe\u202Etxt",
          queryCursor: 8,
          focusedPane: "picker",
          pickerVisibleStart: 0,
          documentScrollOffset: 0,
        },
      }, { columns: 80, rows: 24 }),
    TypeError,
    "single-line text",
  );
  let state = createMarkdownBrowserState(
    markdownBrowserOptions,
    { columns: 80, rows: 24 },
  );
  state = key(state, { kind: "text", text: "safe\u202Etxt\u2066" }).state;
  assertEquals(state.query, "safetxt");
  assert(!/[\p{Cc}\p{Cf}]/u.test(state.query));
});

Deno.test("steady document scrolling advances every rendered row despite repeated anchors", () => {
  const columns = 60;
  const documentCapabilities = testTerminalCapabilities({ columns });
  const repeated = Array.from(
    { length: 24 },
    (_, index) => `Repeated landmark.\n\nDetail ${index + 1}.`,
  ).join("\n\n");
  let state = createMarkdownBrowserState({
    label: "Repeated rows",
    entries: [{
      kind: "document",
      id: "repeated",
      label: "Repeated",
      path: "guides/repeated.md",
      source: `# Repeated rows\n\n${repeated}`,
    }],
  }, { columns, rows: 18 });
  state = key(state, { kind: "named", name: "enter" }).state;
  const maximum = markdownBrowserDocumentMaximumOffset(
    state,
    documentCapabilities,
  );
  assert(maximum > 20, "fixture must exceed one document viewport");

  for (let expected = 1; expected <= maximum; expected += 1) {
    state = key(state, { kind: "named", name: "down" }).state;
    assertEquals(
      state.documentScrollOffset,
      expected,
      `down from rendered row ${expected - 1} must advance exactly one row`,
    );
  }
  state = key(state, { kind: "named", name: "down" }).state;
  assertEquals(state.documentScrollOffset, maximum, "only the end may clamp");
});

Deno.test("reflow anchors choose the repeated occurrence nearest their fallback", () => {
  const divider = "├────────────────────────────────────┤";
  assertEquals(
    markdownBrowserOffsetForAnchor(
      [divider, "first", divider, "second", divider],
      divider,
      4,
    ),
    4,
  );
});

Deno.test("Markdown browser state is immutable, grouped, searchable, and initially full-height", () => {
  const state = createMarkdownBrowserState(
    markdownBrowserOptions,
    { columns: 80, rows: 24 },
  );
  assert(Object.isFrozen(state));
  assert(Object.isFrozen(state.entries));
  assert(Object.isFrozen(state.entries[0]));
  assertEquals(state.layout, {
    mode: "picker-only",
    pickerRows: 21,
    documentRows: 0,
  });
  assertEquals(state.highlightedId, "reader-guide");

  const headingMatch = filterMarkdownBrowserEntries(
    markdownBrowserEntries,
    "DEPLOYMENT",
  );
  assertEquals(headingMatch[0]?.id, "guides");
  assertEquals(headingMatch.length, 11, "a heading match retains its group");
  const descriptionMatch = filterMarkdownBrowserEntries(
    markdownBrowserEntries,
    "restoration",
  );
  assertEquals(descriptionMatch.map(({ id }) => id), [
    "guides",
    "reader-guide",
  ]);
});

Deno.test("keyboard defaults retain grapheme editing, aliases, edges, pages, and focus semantics", () => {
  let state = createMarkdownBrowserState(
    markdownBrowserOptions,
    { columns: 80, rows: 24 },
  );
  state = key(state, { kind: "text", text: "A" }).state;
  state = key(state, { kind: "text", text: "👩‍💻" }).state;
  state = key(state, { kind: "named", name: "ctrl-b" }).state;
  state = key(state, { kind: "named", name: "backspace" }).state;
  assertEquals(state.query, "👩‍💻");
  assertEquals(state.queryCursor, 0);
  state = key(state, { kind: "named", name: "ctrl-e" }).state;
  state = key(state, { kind: "named", name: "backspace" }).state;
  assertEquals(state.query, "");

  state = key(state, { kind: "named", name: "ctrl-n" }).state;
  assertEquals(state.highlightedId, "note-1");
  state = key(state, { kind: "named", name: "ctrl-p" }).state;
  assertEquals(state.highlightedId, "reader-guide");
  state = key(state, { kind: "named", name: "end" }).state;
  assertEquals(state.highlightedId, "quit");
  state = key(state, { kind: "named", name: "home" }).state;
  assertEquals(state.highlightedId, "reader-guide");
  state = key(state, { kind: "named", name: "page-down" }).state;
  assert(state.highlightedId !== "reader-guide");
  state = key(state, { kind: "named", name: "page-up" }).state;
  state = key(state, { kind: "named", name: "home" }).state;

  state = key(state, { kind: "named", name: "enter" }).state;
  state = key(state, { kind: "named", name: "end" }).state;
  assert(state.documentScrollOffset > 0);
  state = key(state, { kind: "named", name: "page-up" }).state;
  assert(state.documentScrollOffset > 0);
  state = key(state, { kind: "named", name: "home" }).state;
  assertEquals(state.documentScrollOffset, 0);
  state = key(state, { kind: "named", name: "shift-tab" }).state;
  assertEquals(state.focusedPane, "picker");
  state = key(state, { kind: "named", name: "tab" }).state;
  assertEquals(state.focusedPane, "document");
  state = key(state, { kind: "named", name: "escape" }).state;
  assertEquals(state.openedDocumentId, undefined);
  assertEquals(state.focusedPane, "picker");
});

Deno.test("opening starts at the top and picker and document offsets move independently", () => {
  let state = createMarkdownBrowserState(
    markdownBrowserOptions,
    { columns: 80, rows: 24 },
  );
  state = key(state, { kind: "named", name: "enter" }).state;
  assertEquals(state.openedDocumentId, "reader-guide");
  assertEquals(state.focusedPane, "document");
  assertEquals(state.documentScrollOffset, 0);
  assertEquals(state.layout.mode, "split");
  assertStringIncludes(
    stripAnsi(markdownBrowserDocumentLines(state, capabilities)[0] ?? ""),
    "deliberately long guide heading",
  );

  const pickerStart = state.pickerVisibleStart;
  state = key(state, { kind: "named", name: "page-down" }).state;
  assert(state.documentScrollOffset > 0);
  assertEquals(state.pickerVisibleStart, pickerStart);
  const documentOffset = state.documentScrollOffset;

  state = key(state, { kind: "named", name: "tab" }).state;
  assertEquals(state.focusedPane, "picker");
  const previousHighlight = state.highlightedId;
  state = key(state, { kind: "named", name: "page-down" }).state;
  assert(state.highlightedId !== previousHighlight);
  assert(state.pickerVisibleStart > pickerStart);
  assertEquals(state.documentScrollOffset, documentOffset);

  const retainedHighlight = state.highlightedId;
  state = key(state, { kind: "named", name: "tab" }).state;
  state = key(state, { kind: "text", text: "q" }).state;
  assertEquals(state.openedDocumentId, undefined);
  assertEquals(state.layout.mode, "picker-only");
  assertEquals(state.highlightedId, retainedHighlight);
  assertEquals(state.query, "");

  state = key(state, { kind: "text", text: "q" }).state;
  assertEquals(state.query, "q", "q remains query input in the picker");
});

Deno.test("browser actions return an exact state that reconstructs cleanly", () => {
  const state = createMarkdownBrowserState({
    ...markdownBrowserOptions,
    initialState: {
      query: "docs online",
      queryCursor: 11,
      highlightedId: "read-online",
      focusedPane: "picker",
      pickerVisibleStart: 0,
      documentScrollOffset: 0,
    },
  }, { columns: 80, rows: 24 });
  const transition = key(state, { kind: "named", name: "enter" });
  const result = transition.result;
  if (result?.kind !== "action") throw new Error("expected action result");
  assertEquals(transition.result, {
    kind: "action",
    id: "read-online",
    value: "online",
    state: markdownBrowserResumableState(state),
  });
  assert(Object.isFrozen(transition.result));

  const resumed = createMarkdownBrowserState({
    ...markdownBrowserOptions,
    initialState: result.state,
  }, { columns: 80, rows: 24 });
  assertEquals(
    markdownBrowserResumableState(resumed),
    result.state,
  );
});

Deno.test("resizes preserve the open document and nearest meaningful row", () => {
  let state = createMarkdownBrowserState(
    markdownBrowserOptions,
    { columns: 80, rows: 24 },
  );
  state = key(state, { kind: "named", name: "enter" }).state;
  const semanticLandmark = "Paragraph 11";
  const landmarkRow = markdownBrowserDocumentLines(state, capabilities)
    .findIndex((line) => stripAnsi(line).includes(semanticLandmark));
  assert(landmarkRow > 0, "fixture must contain a reflowable semantic row");
  while (state.documentScrollOffset < landmarkRow) {
    state = key(state, { kind: "named", name: "down" }).state;
  }
  const currentAnchor = (
    browser: MarkdownBrowserState<string>,
    browserCapabilities: ReturnType<typeof testTerminalCapabilities>,
  ) =>
    markdownBrowserDocumentAnchor(
      markdownBrowserDocumentLines(browser, browserCapabilities),
      browser.documentScrollOffset,
    ) ?? "";
  assertStringIncludes(currentAnchor(state, capabilities), semanticLandmark);

  const narrowCapabilities = testTerminalCapabilities({ columns: 40 });
  state = transitionMarkdownBrowser(state, {
    kind: "resize",
    columns: 40,
    rows: 24,
  }, narrowCapabilities).state;
  assertEquals(state.openedDocumentId, "reader-guide");
  assertEquals(state.focusedPane, "document");
  assertStringIncludes(
    currentAnchor(state, narrowCapabilities),
    semanticLandmark,
  );

  const wideCapabilities = testTerminalCapabilities({ columns: 120 });
  state = transitionMarkdownBrowser(state, {
    kind: "resize",
    columns: 120,
    rows: 30,
  }, wideCapabilities).state;
  assertEquals(state.columns, 120);
  assertEquals(state.rows, 30);
  assertStringIncludes(
    currentAnchor(state, wideCapabilities),
    semanticLandmark,
  );
});

Deno.test("adaptive budgets cover required profiles, single panes, and refusal", () => {
  for (
    const { columns, rows } of [
      { columns: 40, rows: 24 },
      { columns: 80, rows: 24 },
      { columns: 120, rows: 30 },
      { columns: 80, rows: 40 },
    ]
  ) {
    const profileCapabilities = testTerminalCapabilities({ columns });
    let state = createMarkdownBrowserState(
      markdownBrowserOptions,
      { columns, rows },
    );
    const fullHeightCount = markdownBrowserPickerWindow(
      state,
      profileCapabilities,
    ).selectableCount;
    state = key(state, { kind: "named", name: "enter" }).state;
    assertEquals(state.layout.mode, "split");
    assertEquals(
      state.layout.pickerRows + state.layout.documentRows,
      rows - 3,
    );
    if (rows === 40) {
      const ordinary = createMarkdownBrowserState(
        markdownBrowserOptions,
        { columns, rows: 24 },
      );
      assert(
        fullHeightCount > markdownBrowserPickerWindow(
          ordinary,
          profileCapabilities,
        ).selectableCount,
        "the initial picker must consume added viewport height",
      );
    }
  }

  let single = createMarkdownBrowserState({
    ...markdownBrowserOptions,
    pickerMinimumRows: 11,
    documentMinimumRows: 12,
  }, { columns: 80, rows: 24 });
  single = key(single, { kind: "named", name: "enter" }).state;
  assertEquals(single.layout.mode, "document-only");
  single = key(single, { kind: "named", name: "tab" }).state;
  assertEquals(single.layout.mode, "picker-only");

  const refusal = assertThrows(
    () =>
      createMarkdownBrowserState(
        markdownBrowserOptions,
        { columns: 31, rows: 24 },
      ),
    MarkdownBrowserRefusalError,
  );
  assertEquals(refusal.reason, "terminal-too-small");
  assertThrows(
    () =>
      fitMarkdownBrowserState(
        createMarkdownBrowserState(
          markdownBrowserOptions,
          { columns: 40, rows: 9 },
        ),
        testTerminalCapabilities({ columns: 40 }),
      ),
    MarkdownBrowserRefusalError,
  );
});
