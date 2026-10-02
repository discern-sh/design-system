import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { styleText } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  resolveTerminalTheme,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import {
  DEFAULT_MARKDOWN_BROWSER_COPY,
  type MarkdownBrowserCopy,
  type MarkdownBrowserExitResult,
  type MarkdownBrowserLinkResolution,
  type MarkdownBrowserOptions,
  type MarkdownBrowserResult,
} from "../../src/cli/interactive/mod.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { markdownBrowserApplication } from "../../src/cli/interactive/markdown-browser-request.ts";
import type {
  MarkdownBrowserController,
  MarkdownBrowserStep,
} from "../../src/cli/interactive/markdown-browser-view.ts";
import { ApplicationPreview } from "../../catalogue/application-preview.ts";
import { markdownBrowserOptions } from "../../catalogue/markdown-browser-example.ts";
import { APPLICATION_REVIEW_SIZES } from "../../scripts/playground/application.ts";

interface Browse {
  readonly preview: ApplicationPreview<MarkdownBrowserStep>;
  readonly controller: MarkdownBrowserController<string>;
  readonly results: MarkdownBrowserResult<string>[];
  readonly closed: () =>
    | { readonly exit?: MarkdownBrowserExitResult }
    | undefined;
}

function browse(
  options: MarkdownBrowserOptions<string> = markdownBrowserOptions,
  capabilities: Partial<TerminalCapabilities> = {},
  rows = 24,
  presentation = {},
): Browse {
  const results: MarkdownBrowserResult<string>[] = [];
  let closed: { exit?: MarkdownBrowserExitResult } | undefined;
  const { application, controller } = markdownBrowserApplication(options, {
    respond: (result) => {
      results.push(result);
    },
    closing: (exit) => {
      closed = exit === undefined ? {} : { exit };
    },
  });
  const preview = new ApplicationPreview(
    application,
    testTerminalCapabilities({
      columns: 80,
      colorDepth: "truecolor",
      hyperlinks: true,
      ...capabilities,
    }),
    rows,
    presentation,
  );
  return { preview, controller, results, closed: () => closed };
}

/** The rows of the screen with their trailing padding trimmed. */
function rows(preview: Browse["preview"]): string[] {
  return preview.text.split("\n").map((row) => row.trimEnd());
}

Deno.test("the contents list every entry by group and preview the selection beside it", () => {
  const { preview } = browse(markdownBrowserOptions, { columns: 100 }, 40);
  const text = preview.text;
  for (const title of ["Guides", "Reference", "Actions"]) {
    assertStringIncludes(text, title);
  }
  // A document carries no mark an application gives a state.
  assertStringIncludes(text, "  Keyboard Markdown browser");
  assert(!/[○●▲]/u.test(text), text);
  assertStringIncludes(text, "↗ Read the docs online");
  assertStringIncludes(text, "× Quit");
  // Paths show only on request.
  assert(!text.includes("guides/keyboard-markdown-browser.md"), text);
  const paths = browse(
    { ...markdownBrowserOptions, showPaths: true },
    { columns: 100 },
    40,
  ).preview;
  assertStringIncludes(paths.text, "guides/keyboard-markdown-browser.md");
  assertStringIncludes(text, "Search, focus, resize, and restoration");
  assertStringIncludes(text, "A deliberately long guide heading");
  assertEquals(preview.state.focusedControlId, "contents");
  assertStringIncludes(rows(preview).at(-1) ?? "", "/ Search");
});

Deno.test("a narrow contents screen describes the selection in its strip", () => {
  const { preview } = browse(markdownBrowserOptions, { columns: 60 });
  assertStringIncludes(preview.text, "Search, focus, resize, and restoration");
  assertEquals(preview.state.focusedControlId, "contents");
});

Deno.test("a preview shows a document's title once and its Markdown at the title's column", async (t) => {
  const document = (id: string, label: string, heading: string) => ({
    kind: "document" as const,
    id,
    label,
    description: `Summary of ${id}`,
    path: `${id}.md`,
    source: `# ${heading}\n\nBody of ${id} begins here.\n\n## Later\n\nMore.`,
  });
  const options: MarkdownBrowserOptions<string> = {
    label: "Library",
    entries: [
      // The same words in another case and spacing are the same title.
      document("same", "Getting started", "Getting  Started"),
      document("other", "Troubleshooting", "When something fails"),
    ],
  };
  for (const { columns, rows: height } of APPLICATION_REVIEW_SIZES) {
    await t.step(`${columns}x${height}`, () => {
      const { preview } = browse(options, { columns }, height);
      // Below the split the preview is the zoomed detail.
      if (!preview.text.includes("Body of same")) preview.key("space");
      // Once in the list or breadcrumb, once as the preview's title.
      assertEquals(
        preview.text.toLowerCase().split("getting started").length - 1,
        2,
        preview.text,
      );
      assertEquals(
        preview.find("Body of same").column,
        preview.find("Summary of same").column,
        preview.text,
      );
      // A different opening title stays: it says something the label
      // does not.
      preview.key("down");
      let seen = preview.text;
      for (let line = 0; line < 8 && !seen.includes("Body of other"); line++) {
        preview.key("shift-down");
        seen += preview.text;
      }
      assertStringIncludes(seen, "When something fails");
    });
  }
});

Deno.test("Enter opens a document at its top, and Back returns with it selected and read", () => {
  const { preview, closed } = browse();
  preview.key("down", "enter");
  assertEquals(preview.state.focusedControlId, "document:note-1");
  assertStringIncludes(rows(preview)[0] ?? "", "Reference note 1");
  assertStringIncludes(preview.text, "Esc Back");
  preview.key("backspace");
  assertEquals(preview.state.lists.contents?.selectedId, "note-1");
  assertStringIncludes(preview.text, "  Reference note 1");
  preview.key("escape");
  assertEquals(closed(), {}, "Escape where the reader started closes");
});

Deno.test("links push documents and Back returns through them to the followed link", () => {
  const { preview } = browse();
  preview.key("enter", "tab", "tab", "enter");
  assertEquals(preview.state.focusedControlId, "document:note-1");
  assertStringIncludes(preview.text, "Details");
  preview.key("backspace");
  assertEquals(
    preview.state.focusedControlId,
    "document:reader-guide:link:link-1",
    "the document comes back with the link that was followed",
  );
  preview.key("escape");
  assertEquals(preview.state.focusedControlId, "document:reader-guide");
  preview.key("escape");
  assertEquals(preview.state.focusedControlId, "contents");
});

Deno.test("c shows the contents above the document, and Back returns to it", () => {
  const { preview } = browse();
  preview.key("enter", "page-down", "c");
  assertEquals(preview.state.focusedControlId, "contents");
  assertEquals(preview.state.lists.contents?.selectedId, "reader-guide");
  preview.key("backspace");
  assertEquals(preview.state.focusedControlId, "document:reader-guide");
  assert(
    (preview.state.readingScroll["document:reader-guide"] ?? 0) > 0,
    "the document keeps its place",
  );
});

Deno.test("q closes from anywhere", () => {
  const { preview, closed } = browse();
  preview.key("enter", "tab", "enter", "q");
  assertEquals(closed(), {});
});

Deno.test("search ranks every entry, opens the choice, and closes on Escape or Ctrl+K", () => {
  const { preview } = browse();
  preview.key("/");
  assertEquals(preview.state.topLayerId, "search");
  assertStringIncludes(preview.text, "Search titles and descriptions");
  preview.type("note 1");
  assertEquals(preview.state.layers.search?.highlightedId, "note-1");
  preview.key("enter");
  assertEquals(preview.state.topLayerId, undefined);
  assertEquals(preview.state.focusedControlId, "document:note-1");
  preview.key("ctrl-k");
  assertEquals(preview.state.topLayerId, "search");
  preview.key("ctrl-k");
  assertEquals(preview.state.topLayerId, undefined);
  preview.key("/", "escape");
  assertEquals(preview.state.topLayerId, undefined, "an empty query closes");
  assertEquals(preview.state.focusedControlId, "document:note-1");
});

Deno.test("search lists a document once however many groups list it, and paths only on request", () => {
  const document = (id: string) => ({
    kind: "document" as const,
    id,
    label: "Shared page",
    path: "guides/shared.md",
    source: "# Shared page\n\nOne document listed twice.",
  });
  const options: MarkdownBrowserOptions<string> = {
    label: "Manual",
    entries: [
      { kind: "group-heading", id: "start", label: "Start here" },
      document("shared-start"),
      { kind: "group-heading", id: "reference", label: "Reference" },
      document("shared-reference"),
    ],
  };
  const { preview } = browse(options);
  preview.key("/");
  // Rows above the footer, whose Enter hint names the highlight too.
  const shown = (text: string) =>
    text.split("\n").slice(0, -1).join("\n").split("Shared page").length - 1;
  // The contents list it twice; search ranks it once.
  assertEquals(preview.state.layers.search?.query, "");
  assertEquals(shown(preview.text), 1, preview.text);
  preview.type("shared");
  assertEquals(shown(preview.text), 1, preview.text);
  // Paths do not match unless they show.
  preview.key("escape");
  preview.type("guides");
  assert(!preview.text.includes("Shared page"), preview.text);
  const paths = browse({ ...options, showPaths: true }).preview;
  paths.key("/");
  paths.type("guides");
  assertStringIncludes(paths.text, "Shared page");
});

Deno.test("an action returns its value with where the reader was", () => {
  const { preview, results, closed } = browse();
  preview.key("end", "up", "enter");
  assertEquals(results, [{
    kind: "action",
    id: "read-online",
    value: "online",
    state: { history: [{ kind: "contents" }], selectedId: "read-online" },
  }]);
  assertEquals(closed(), undefined, "an action leaves the browser open");
});

Deno.test("an exit entry closes with its result", () => {
  const { preview, closed } = browse();
  preview.key("end", "enter");
  assertEquals(closed()?.exit?.kind, "exit");
  assertEquals(closed()?.exit?.id, "quit");
});

Deno.test("a fragment scrolls within the document", () => {
  const { preview } = browse();
  preview.key("enter", "tab", "enter");
  const heading = rows(preview).findIndex((row) =>
    row.includes("Navigation details")
  );
  assert(heading >= 1 && heading <= 3, `heading at row ${heading}`);
  assertEquals(preview.state.focusedControlId, "document:reader-guide");
});

Deno.test("an external link returns with the resolver's facts", () => {
  const { preview, results } = browse();
  preview.key("enter", "tab", "tab", "tab", "enter");
  assertEquals(results.length, 1);
  const result = results[0];
  assert(result?.kind === "external-link");
  assertEquals(result.destination, "https://example.com/reference");
  assertEquals(result.id, "reader-guide:link-2");
  assertEquals(result.sourcePath, "guides/keyboard-markdown-browser.md");
  assertEquals(result.state.history, [
    { kind: "contents" },
    { kind: "document", id: "reader-guide" },
  ]);
  assertEquals(result.state.links, { "reader-guide": "link-2" });
});

/** A two-document corpus whose links reach a resolver. */
function linked(
  resolveLink?: MarkdownBrowserOptions<string>["resolveLink"],
  copy?: Partial<MarkdownBrowserCopy>,
): MarkdownBrowserOptions<string> {
  return {
    label: "Notes",
    entries: [
      {
        kind: "document",
        id: "first",
        label: "First",
        path: "first.md",
        source:
          "# First\n\nSee [second](second.md#missing) and [else](else.md).",
      },
      {
        kind: "document",
        id: "second",
        label: "Second",
        path: "second.md",
        source: "# Second\n\n## Present\n\nHere.",
      },
    ],
    ...(resolveLink === undefined ? {} : { resolveLink }),
    ...(copy === undefined ? {} : { copy }),
  };
}

Deno.test("links that cannot be followed say why and leave the reader in place", () => {
  const toSecond = (): MarkdownBrowserLinkResolution => ({
    kind: "document",
    documentId: "second",
    fragment: "missing",
  });
  const missing = browse(linked(toSecond)).preview;
  missing.key("enter", "tab", "enter");
  assertStringIncludes(missing.text, "That heading is not in this document.");
  assertEquals(missing.state.focusedControlId, "document:first:link:link-0");

  const unresolved = browse(linked()).preview;
  unresolved.key("enter", "tab", "enter");
  assertStringIncludes(unresolved.text, "This link could not be followed.");

  const said = browse(linked(() => ({
    kind: "unresolved",
    message: "Not in this set.",
  }))).preview;
  said.key("enter", "tab", "tab", "enter");
  assertStringIncludes(said.text, "Not in this set.");
  said.key("down");
  assert(!said.text.includes("Not in this set."), "the next key dismisses it");

  const elsewhere = browse(linked(() => ({
    kind: "document",
    documentId: "nowhere",
  }))).preview;
  elsewhere.key("enter", "tab", "tab", "enter");
  assertStringIncludes(elsewhere.text, "That document is not available here.");
});

Deno.test("a resolver must answer at once", () => {
  const { preview } = browse(
    linked((() => Promise.resolve({ kind: "unresolved" })) as never),
  );
  assertThrows(
    () => preview.key("enter", "tab", "enter"),
    TypeError,
    "answers at once",
  );
});

Deno.test("a resumable state reopens the same place", () => {
  const first = browse();
  first.preview.key("enter", "page-down", "tab");
  const state = first.controller.resumable(first.preview.state);
  assertEquals(state.history.at(-1), { kind: "document", id: "reader-guide" });
  const again = browse({ ...markdownBrowserOptions, initialState: state });
  assertEquals(
    again.preview.state.focusedControlId,
    first.preview.state.focusedControlId,
  );
  assertEquals(
    again.preview.state.readingScroll["document:reader-guide"],
    first.preview.state.readingScroll["document:reader-guide"],
  );
  again.preview.key("backspace");
  assertEquals(again.preview.state.lists.contents?.selectedId, "reader-guide");
});

Deno.test("an initial state that names something the corpus lacks is refused", () => {
  for (
    const initialState of [
      { history: [] },
      { history: [{ kind: "document" as const, id: "read-online" }] },
      { history: [{ kind: "contents" as const }], selectedId: "absent" },
      {
        history: [{ kind: "contents" as const }],
        positions: { "reader-guide": -1 },
      },
    ]
  ) {
    assertThrows(
      () => browse({ ...markdownBrowserOptions, initialState }),
      TypeError,
    );
  }
});

Deno.test("a corpus that breaks a rule is refused", () => {
  const document = {
    kind: "document" as const,
    id: "one",
    label: "One",
    path: "one.md",
    source: "# One",
  };
  for (
    const options of [
      { label: "", entries: [document] },
      { label: "Notes", entries: [document, document] },
      { label: "Notes", entries: [{ ...document, path: "../one.md" }] },
      { label: "Notes", entries: [document], documentMeasure: 8 },
      { label: "Notes", entries: [] },
    ]
  ) {
    assertThrows(() => browse(options), TypeError);
  }
});

Deno.test("every word the browser writes comes from its copy", () => {
  const marked = Object.fromEntries(
    Object.entries(DEFAULT_MARKDOWN_BROWSER_COPY).flatMap(([name, value]) =>
      typeof value === "string" ? [[name, `<${name}>`]] : []
    ),
  ) as Partial<MarkdownBrowserCopy>;
  const seen = new Set<string>();
  const collect = (text: string) => {
    for (const match of text.matchAll(/<(\w+)>/gu)) {
      if (match[1] !== undefined) seen.add(match[1]);
    }
    const bare = text.replace(/<\w+>/gu, "");
    for (const word of ["Search", "Contents", "Back", "Close", "Open"]) {
      assert(!bare.includes(word), `${word} was written without copy\n${text}`);
    }
  };
  // The first link reaches a heading the resolver's document lacks, and
  // the second a document the browser was not given.
  const scene = browse(
    linked(
      (input) =>
        input.destination.startsWith("second")
          ? { kind: "document", documentId: "second", fragment: "missing" }
          : { kind: "document", documentId: "nowhere" },
      marked,
    ),
  ).preview;
  collect(scene.text);
  scene.key("/");
  collect(scene.text);
  scene.key("escape", "enter");
  collect(scene.text);
  scene.key("tab", "enter");
  collect(scene.text);
  scene.key("tab", "enter");
  collect(scene.text);
  const unresolved = browse(linked(undefined, marked)).preview;
  unresolved.key("enter", "tab", "enter");
  collect(unresolved.text);
  for (
    const name of [
      "search",
      "contents",
      "searchPlaceholder",
      "unresolvedLink",
      "headingNotFound",
      "documentNotFound",
      "open",
      "back",
      "close",
    ]
  ) assert(seen.has(name), `${name} is never shown`);
});

Deno.test("clicks select a contents row, open it on a second click, and follow links", () => {
  const { preview, results } = browse({
    ...markdownBrowserOptions,
    mouse: true,
  });
  const row = preview.find("Reference note 2");
  preview.clickAt(row);
  assertEquals(preview.state.lists.contents?.selectedId, "note-2");
  preview.clickAt(row);
  assertEquals(preview.state.focusedControlId, "document:note-2");
  preview.key("backspace", "home", "enter");
  for (
    let page = 0;
    page < 30 && !preview.text.includes("external reference");
    page += 1
  ) {
    preview.key("down");
  }
  preview.click("external reference");
  assertEquals(results.map((result) => result.kind), ["external-link"]);
});

Deno.test("the reader carries Accent and degrades to plain ASCII", () => {
  const appearance = { accent: 245 };
  const { preview } = browse(
    markdownBrowserOptions,
    { hyperlinks: false },
    24,
    {
      theme: "light",
      appearance,
    },
  );
  // The reading's headings are quiet, so the accent marks the footer's
  // primary key, the one thing on screen it should.
  preview.key("enter");
  const palette = resolveTerminalTheme({ theme: "light", appearance });
  const probe = styleText(
    "x",
    { color: terminalToneColor(palette, "accent") },
    testTerminalCapabilities({ colorDepth: "truecolor" }),
  );
  const accent = probe.slice(probe.indexOf("38;"), probe.indexOf("m"));
  assertStringIncludes(preview.frame, accent);

  const plain = browse(markdownBrowserOptions, {
    colorDepth: "none",
    hyperlinks: false,
    unicode: false,
  }, 40).preview;
  assertStringIncludes(plain.text, "  Keyboard Markdown browser");
  assertStringIncludes(plain.text, "/ Read the docs online");
  assertStringIncludes(plain.text, "x Quit");
  plain.key("enter", "tab");
  assert(!plain.frame.includes("\u001b]"), "no hyperlink without support");
  // The chrome is ASCII; the document's own text is the author's.
  const lines = plain.text.split("\n");
  for (const chrome of [lines[0] ?? "", lines.at(-1) ?? ""]) {
    assert(/^[\x20-\x7e]*$/u.test(chrome), chrome);
  }
  assertStringIncludes(lines.at(-1) ?? "", "Enter Open");
});
