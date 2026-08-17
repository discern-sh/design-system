import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  transitionMarkdownBrowser,
} from "../../src/cli/interactive/markdown-browser-machine.ts";
import {
  createMarkdownBrowserState,
  type MarkdownBrowserEntry,
  type MarkdownBrowserOptions,
  type MarkdownBrowserState,
} from "../../src/cli/interactive/markdown-browser-model.ts";
import { requestMarkdownBrowser } from "../../src/cli/interactive/markdown-browser-request.ts";
import {
  markdownBrowserLinkOccurrences,
  markdownBrowserPickerWindow,
  renderMarkdownBrowser,
} from "../../src/cli/interactive/markdown-browser-renderer.ts";
import {
  DISABLE_TERMINAL_MOUSE_BUTTON_TRACKING,
  DISABLE_TERMINAL_MOUSE_SGR_MODE,
  ENABLE_TERMINAL_MOUSE_BUTTON_TRACKING,
  ENABLE_TERMINAL_MOUSE_SGR_MODE,
} from "../../src/cli/interactive/lifecycle.ts";
import {
  encodeTerminalKeys,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const pointerSource = `# Pointer guide

[External destination](https://example.test/pointer)

${
  Array.from({ length: 24 }, (_, index) => `Paragraph ${index + 1}.`).join(
    "\n\n",
  )
}`;

const entries = [
  { kind: "group-heading", id: "group", label: "Guides" },
  {
    kind: "document",
    id: "first",
    label: "First",
    path: "guides/first.md",
    source: pointerSource,
  },
  ...Array.from({ length: 6 }, (_, index) => ({
    kind: "document" as const,
    id: `other-${index + 1}`,
    label: `Other ${index + 1}`,
    path: `guides/other-${index + 1}.md`,
    source: `# Other ${index + 1}`,
  })),
] satisfies readonly MarkdownBrowserEntry<never>[];

const pointerOptions = {
  label: "Pointer browser",
  entries,
  mouse: true,
} satisfies MarkdownBrowserOptions<never>;

function opened(
  capabilities: TerminalCapabilities,
  rows = 24,
): MarkdownBrowserState<never> {
  const initial = createMarkdownBrowserState<never>(
    pointerOptions,
    { columns: capabilities.columns, rows },
  );
  return transitionMarkdownBrowser(initial, {
    kind: "key",
    key: { kind: "named", name: "enter" },
  }, capabilities).state;
}

function pickerEntryRow(
  state: MarkdownBrowserState<never>,
  capabilities: TerminalCapabilities,
  id: string,
): number {
  let row = 4;
  for (
    const rendered of markdownBrowserPickerWindow(state, capabilities).entries
  ) {
    if (rendered.entry.id === id) return row;
    row += rendered.lines.length;
  }
  throw new Error(`picker entry ${id} is not visible`);
}

function documentTop(state: MarkdownBrowserState<never>): number {
  return state.layout.mode === "split" ? 2 + state.layout.pickerRows : 2;
}

const noModifiers = { shift: false, alt: false, control: false } as const;

Deno.test("pointer clicks focus panes, select choices, and activate cell-projected links", () => {
  for (
    const profile of [
      { colorDepth: "truecolor" as const, unicode: true },
      { colorDepth: "none" as const, unicode: false },
    ]
  ) {
    const capabilities = testTerminalCapabilities({
      columns: 80,
      hyperlinks: profile.colorDepth !== "none",
      mouseTracking: true,
      ...profile,
    });
    let state = opened(capabilities, 30);
    const originalHighlight = state.highlightedId;

    state = transitionMarkdownBrowser(state, {
      kind: "mouse",
      action: "press",
      button: "left",
      column: 4,
      row: pickerEntryRow(state, capabilities, "group"),
      modifiers: noModifiers,
    }, capabilities).state;
    assertEquals(state.focusedPane, "picker");
    assertEquals(state.highlightedId, originalHighlight);

    const selectable = markdownBrowserPickerWindow(state, capabilities).entries
      .find(({ entry }) =>
        entry.kind !== "group-heading" && entry.id !== originalHighlight
      )?.entry;
    assert(selectable !== undefined, "expected a second visible picker choice");
    state = transitionMarkdownBrowser(state, {
      kind: "mouse",
      action: "press",
      button: "left",
      column: 4,
      row: pickerEntryRow(state, capabilities, selectable.id),
      modifiers: noModifiers,
    }, capabilities).state;
    assertEquals(state.highlightedId, selectable.id);
    assertStringIncludes(
      stripAnsi(renderMarkdownBrowser(state, capabilities)),
      profile.unicode ? "▶ Picker" : "> Picker",
    );

    state = transitionMarkdownBrowser(state, {
      kind: "mouse",
      action: "press",
      button: "left",
      column: 2,
      row: documentTop(state) + 1,
      modifiers: noModifiers,
    }, capabilities).state;
    assertEquals(state.focusedPane, "document");
    assertEquals(state.linkFocus, undefined);

    const link = markdownBrowserLinkOccurrences(state, capabilities)[0];
    const region = link?.regions[0];
    if (link === undefined || region === undefined) {
      throw new Error("expected a visible pointer link");
    }
    const clicked = transitionMarkdownBrowser(state, {
      kind: "mouse",
      action: "press",
      button: "left",
      column: region.startColumn + 1,
      row: documentTop(state) + region.row,
      modifiers: { shift: true, alt: true, control: true },
    }, capabilities);
    assertEquals(clicked.linkRequest?.destination, link.destination);
    assertEquals(clicked.state.linkFocus, {
      id: link.id,
      origin: "pointer",
    });
    assertStringIncludes(
      stripAnsi(renderMarkdownBrowser(clicked.state, capabilities)),
      profile.unicode ? "◆External" : "*External",
    );

    const released = transitionMarkdownBrowser(state, {
      kind: "mouse",
      action: "release",
      button: "left",
      column: region.startColumn + 1,
      row: documentTop(state) + region.row,
      modifiers: noModifiers,
    }, capabilities);
    assertEquals(released.linkRequest, undefined);
    assertEquals(released.state.linkFocus, undefined);

    for (
      const [column, row] of [
        [1, documentTop(state) + 1],
        [4, documentTop(state)],
        [4, state.rows - 1],
        [state.columns + 1, documentTop(state) + 1],
      ] as const
    ) {
      const ignored = transitionMarkdownBrowser(state, {
        kind: "mouse",
        action: "press",
        button: "left",
        column,
        row,
        modifiers: noModifiers,
      }, capabilities);
      assertEquals(ignored.state, state);
      assertEquals(ignored.linkRequest, undefined);
    }
  }
});

Deno.test("wheel input scrolls the pane under the pointer without changing keyboard focus", () => {
  const capabilities = testTerminalCapabilities({
    columns: 80,
    colorDepth: "truecolor",
    mouseTracking: true,
  });
  let state = opened(capabilities);
  state = transitionMarkdownBrowser(state, {
    kind: "key",
    key: { kind: "named", name: "tab" },
  }, capabilities).state;
  assertEquals(state.focusedPane, "picker");
  state = transitionMarkdownBrowser(state, {
    kind: "mouse",
    action: "wheel",
    direction: "down",
    column: 4,
    row: documentTop(state) + 2,
    modifiers: noModifiers,
  }, capabilities).state;
  assertEquals(state.focusedPane, "picker");
  assertEquals(state.documentScrollOffset, 3);

  state = transitionMarkdownBrowser(state, {
    kind: "key",
    key: { kind: "named", name: "tab" },
  }, capabilities).state;
  assertEquals(state.focusedPane, "document");
  const before = state.highlightedId;
  state = transitionMarkdownBrowser(state, {
    kind: "mouse",
    action: "wheel",
    direction: "down",
    column: 4,
    row: 3,
    modifiers: noModifiers,
  }, capabilities).state;
  assertEquals(state.focusedPane, "document");
  assertNotEquals(state.highlightedId, before);

  const border = transitionMarkdownBrowser(state, {
    kind: "mouse",
    action: "wheel",
    direction: "down",
    column: 1,
    row: 3,
    modifiers: noModifiers,
  }, capabilities).state;
  assertEquals(border, state);
});

Deno.test("real mouse clicks use resized geometry and remain independent from OSC 8", async () => {
  const capabilities80 = testTerminalCapabilities({
    columns: 80,
    colorDepth: "none",
    hyperlinks: false,
    mouseTracking: true,
  });
  let resized = opened(capabilities80);
  const capabilities40 = { ...capabilities80, columns: 40 };
  resized = transitionMarkdownBrowser(resized, {
    kind: "resize",
    columns: 40,
    rows: 24,
  }, capabilities40).state;
  const region = markdownBrowserLinkOccurrences(resized, capabilities40)[0]
    ?.regions[0];
  if (region === undefined) throw new Error("expected resized link region");

  const io = new FakeTerminalIO([], {
    columns: 80,
    rows: 24,
    colorDepth: "none",
    hyperlinks: false,
    mouseTracking: true,
  });
  io.enqueueKeys("enter");
  io.enqueueResize(40, 24);
  io.enqueueMouse({
    kind: "mouse",
    action: "press",
    button: "left",
    column: region.startColumn + 1,
    row: documentTop(resized) + region.row,
    modifiers: noModifiers,
  });
  const result = await requestMarkdownBrowser(pointerOptions, { io });
  assertEquals(result.kind, "external-link");
  if (result.kind !== "external-link") throw new Error("expected link action");
  assertEquals(result.state.linkFocus?.origin, "pointer");
  assertEquals(result.destination, "https://example.test/pointer");
  assertEquals(io.writes.includes(ENABLE_TERMINAL_MOUSE_BUTTON_TRACKING), true);
  assertEquals(io.writes.includes(ENABLE_TERMINAL_MOUSE_SGR_MODE), true);
  assertEquals(io.writes.includes(DISABLE_TERMINAL_MOUSE_SGR_MODE), true);
  assertEquals(
    io.writes.includes(DISABLE_TERMINAL_MOUSE_BUTTON_TRACKING),
    true,
  );
  assert(!io.output().includes("\x1b]8;;https://example.test/pointer"));
});

Deno.test("hyperlink-only, refused-mouse, and fully degraded terminals keep keyboard link access", async () => {
  for (
    const terminal of [
      { hyperlinks: true, mouseTracking: true, mouse: false },
      { hyperlinks: true, mouseTracking: false, mouse: true },
      { hyperlinks: false, mouseTracking: false, mouse: false },
    ] as const
  ) {
    const capabilities = testTerminalCapabilities({
      columns: 80,
      colorDepth: terminal.hyperlinks ? "ansi16" : "none",
      hyperlinks: terminal.hyperlinks,
      mouseTracking: terminal.mouseTracking,
    });
    const state = opened(capabilities);
    const region = markdownBrowserLinkOccurrences(state, capabilities)[0]
      ?.regions[0];
    if (region === undefined) throw new Error("expected keyboard link region");
    const io = new FakeTerminalIO([], {
      columns: 80,
      rows: 24,
      colorDepth: capabilities.colorDepth,
      hyperlinks: terminal.hyperlinks,
      mouseTracking: terminal.mouseTracking,
    });
    io.enqueueKeys("enter");
    io.enqueueMouse({
      kind: "mouse",
      action: "press",
      button: "left",
      column: region.startColumn + 1,
      row: documentTop(state) + region.row,
      modifiers: noModifiers,
    });
    io.enqueue(`]${encodeTerminalKeys("enter")}`);
    const result = await requestMarkdownBrowser({
      ...pointerOptions,
      mouse: terminal.mouse,
    }, { io });
    assertEquals(result.kind, "external-link");
    if (result.kind !== "external-link") {
      throw new Error("expected link action");
    }
    assertEquals(result.state.linkFocus?.origin, "keyboard");
    assertEquals(io.writes.includes(ENABLE_TERMINAL_MOUSE_SGR_MODE), false);
    assertEquals(io.writes.includes(DISABLE_TERMINAL_MOUSE_SGR_MODE), false);
  }
});
