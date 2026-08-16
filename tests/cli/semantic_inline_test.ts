import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import {
  renderSemanticInlineContent,
  SEMANTIC_INLINE_MAX_DEPTH,
  type SemanticInlineContent,
  semanticInlineText,
  validateSemanticInlineContent,
  wrapSemanticInlineContent,
} from "../../src/cli/semantic-inline.ts";
import { measureText, wrapStyledText } from "../../src/cli/text.ts";
import {
  projectTerminalHtml,
  projectTerminalSpans,
} from "../../src/cli/projection.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";

const RICH_CONTENT = [
  "Nested ",
  {
    kind: "strong",
    content: [
      "bold and ",
      {
        kind: "emphasis",
        content: [
          "emphasised ",
          { kind: "strikethrough", content: "retired" },
        ],
      },
    ],
  },
  ", then ",
  { kind: "code", text: "git status" },
  "; read ",
  {
    kind: "link",
    label: ["the ", { kind: "strong", content: "guide" }],
    destination: "https://example.test/guide",
    title: "Reading guide",
  },
  "; ",
  {
    kind: "image",
    alt: "Pattern chart",
    source: "https://example.test/pattern.png",
    title: "A measured pattern",
  },
  "; ",
  {
    kind: "footnote-reference",
    identifier: "note-1",
  },
  { kind: "hard-break" },
  { kind: "literal", text: "Escaped <tag> & decoded." },
] as const satisfies SemanticInlineContent;

const PLAIN_RICH =
  "Nested **bold and _emphasised ~~retired~~_**, then `git status`; read the **guide** (https://example.test/guide); Image: Pattern chart (https://example.test/pattern.png); [^note-1]\nEscaped <tag> & decoded.";

Deno.test("semantic inline projection is one lossless no-colour fallback", () => {
  assertEquals(semanticInlineText(RICH_CONTENT), PLAIN_RICH);
  const capabilities = testTerminalCapabilities({
    columns: 200,
    colorDepth: "none",
    unicode: false,
  });
  assertEquals(
    renderSemanticInlineContent(RICH_CONTENT, capabilities),
    PLAIN_RICH,
  );
});

Deno.test("nested semantic styles and hyperlink targets survive styled rendering", () => {
  const capabilities = testTerminalCapabilities({
    columns: 200,
    colorDepth: "truecolor",
  });
  const output = renderSemanticInlineContent(RICH_CONTENT, capabilities);
  const spans = projectTerminalSpans(output);
  const retired = spans.find((span) => span.text.includes("retired"));
  assert(retired !== undefined);
  assert(retired.style !== undefined);
  assertEquals(retired.style.bold, true);
  assertEquals(retired.style.italic, true);
  assertEquals(retired.style.strikethrough, true);

  const linked = spans.filter((span) =>
    span.link === "https://example.test/guide"
  );
  assertEquals(linked.map((span) => span.text).join(""), "the guide");
  assert(linked.every((span) => span.style?.underline === true));
  assertEquals(
    spans.find((span) => span.link === "https://example.test/pattern.png")
      ?.text,
    "https://example.test/pattern.png",
  );
  assertStringIncludes(stripAnsi(output), "`git status`");
  assertStringIncludes(stripAnsi(output), "[^note-1]");
  assertStringIncludes(stripAnsi(output), "Escaped <tag> & decoded.");
});

Deno.test("semantic wrapping keeps every line width-bounded and independently valid", () => {
  const capabilities = testTerminalCapabilities({
    columns: 18,
    colorDepth: "truecolor",
  });
  const first = wrapSemanticInlineContent(RICH_CONTENT, 18, capabilities);
  const second = wrapSemanticInlineContent(RICH_CONTENT, 18, capabilities);
  assertEquals(first, second);
  assert(first.length > 4);
  for (const line of first) {
    assert(measureText(line) <= 18, stripAnsi(line));
    assertEquals(wrapStyledText(line, 18), [line]);
  }
  assertEquals(stripAnsi(first.join("\n")).includes("\nEscaped"), true);
});

Deno.test("nested style, code, and link runs retain exact semantics across wraps", () => {
  const nested = [
    {
      kind: "strong",
      content: [{
        kind: "emphasis",
        content: [{
          kind: "strikethrough",
          content: "alpha beta gamma delta",
        }],
      }],
    },
    " ",
    { kind: "code", text: "tool check" },
    " ",
    {
      kind: "link",
      label: [{ kind: "strong", content: "linked guide" }],
      destination: "https://example.test/guide",
    },
  ] as const satisfies SemanticInlineContent;
  const lines = wrapSemanticInlineContent(
    nested,
    7,
    testTerminalCapabilities({ columns: 7, colorDepth: "ansi16" }),
  );
  assertEquals(lines.map(stripAnsi), [
    "alpha",
    "beta",
    "gamma",
    "delta",
    "`tool",
    "check`",
    "linked",
    "guide",
  ]);
  for (const line of lines.slice(0, 4)) {
    const spans = projectTerminalSpans(line);
    assertEquals(spans.length, 1);
    assertEquals(spans[0]?.style?.bold, true);
    assertEquals(spans[0]?.style?.italic, true);
    assertEquals(spans[0]?.style?.strikethrough, true);
  }
  for (const line of lines.slice(4, 6)) {
    assertEquals(projectTerminalSpans(line)[0]?.style?.bold, true);
  }
  for (const line of lines.slice(6)) {
    const spans = projectTerminalSpans(line);
    assertEquals(spans[0]?.link, "https://example.test/guide");
    assertEquals(spans[0]?.style?.bold, true);
    assertEquals(spans[0]?.style?.underline, true);
  }
});

Deno.test("colour depth, theme, and character repertoire preserve semantic content", () => {
  const styledPlain = stripAnsi(
    renderSemanticInlineContent(
      RICH_CONTENT,
      testTerminalCapabilities({ colorDepth: "truecolor", columns: 200 }),
    ),
  );
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    for (const theme of ["light", "dark"] as const) {
      const capabilities = testTerminalCapabilities({
        colorDepth,
        columns: 200,
        unicode: false,
      });
      const first = renderSemanticInlineContent(
        RICH_CONTENT,
        capabilities,
        { theme },
      );
      assertEquals(
        renderSemanticInlineContent(RICH_CONTENT, capabilities, { theme }),
        first,
      );
      assertEquals(stripAnsi(first), styledPlain);
    }
  }
  for (const unicode of [true, false]) {
    const capabilities = testTerminalCapabilities({
      colorDepth: "none",
      columns: 200,
      unicode,
    });
    assertEquals(
      renderSemanticInlineContent(RICH_CONTENT, capabilities),
      PLAIN_RICH,
    );
  }

  const styledWithoutLinks = renderSemanticInlineContent(
    RICH_CONTENT,
    testTerminalCapabilities({
      colorDepth: "truecolor",
      hyperlinks: false,
      columns: 200,
    }),
  );
  assertStringIncludes(
    stripAnsi(styledWithoutLinks),
    "the guide (https://example.test/guide)",
  );
});

Deno.test("soft and hard breaks retain distinct projection and wrapping", () => {
  const content = [
    "first",
    { kind: "soft-break" },
    "second",
    { kind: "hard-break" },
    "third",
  ] as const satisfies SemanticInlineContent;
  assertEquals(semanticInlineText(content), "first second\nthird");
  assertEquals(
    wrapSemanticInlineContent(
      content,
      80,
      testTerminalCapabilities({ columns: 80 }),
    ),
    ["first second", "third"],
  );
});

Deno.test("Unicode graphemes and CJK wrap without splitting or overflowing", () => {
  const content = [
    { kind: "strong", content: "Cafe\u0301" },
    " ",
    { kind: "emphasis", content: "界界界" },
    " 🙂",
  ] as const satisfies SemanticInlineContent;
  const capabilities = testTerminalCapabilities({
    columns: 6,
    colorDepth: "ansi256",
  });
  const lines = wrapSemanticInlineContent(content, 6, capabilities);
  assertEquals(lines.map(stripAnsi), ["Cafe\u0301", "界界界", "🙂"]);
  for (const line of lines) assert(measureText(line) <= 6);
});

Deno.test("inline code contents remain literal behind an unambiguous fence", () => {
  const content = [{
    kind: "code",
    text: "`literal * punctuation`",
  }] as const satisfies SemanticInlineContent;
  assertEquals(
    semanticInlineText(content),
    "`` `literal * punctuation` ``",
  );
  assertEquals(
    renderSemanticInlineContent(content, testTerminalCapabilities()),
    "`` `literal * punctuation` ``",
  );
});

Deno.test("safe absolute and relative destinations share one validation policy", () => {
  for (
    const destination of [
      "https://example.test/docs",
      "http://example.test/docs",
      "mailto:reader@example.test",
      "file:///tmp/guide.txt",
      "/docs/start",
      "../guide",
      "./guide",
      "#note-1",
      "?surface=cli",
      "//example.test/docs",
    ]
  ) {
    const content = [{
      kind: "link",
      label: "guide",
      destination,
    }] as const;
    validateSemanticInlineContent(content);
  }

  for (
    const destination of [
      "",
      "javascript:alert(1)",
      "data:text/html,unsafe",
      "ftp://example.test/file",
      "https://example.test/a b",
      "https://example.test\\escape",
      "https://example.test/%0dnext",
      "https://[",
      "https://example.test/界",
    ]
  ) {
    const content = [{
      kind: "link",
      label: "guide",
      destination,
    }];
    assertThrows(
      () => validateSemanticInlineContent(content),
      TypeError,
      "semantic inline content",
    );
  }
});

Deno.test("malformed and impossible semantic trees fail at the boundary", () => {
  const malformed: readonly unknown[] = [
    "",
    [],
    [null],
    [{ kind: "html", value: "<strong>unsafe</strong>" }],
    [{ kind: "text" }],
    [{ kind: "text", text: "safe", position: { line: 1 } }],
    [{ kind: "strong", content: [] }],
    [{ kind: "link", label: "", destination: "https://example.test" }],
    [{
      kind: "link",
      label: [{
        kind: "link",
        label: "nested",
        destination: "https://example.test/nested",
      }],
      destination: "https://example.test",
    }],
    [{
      kind: "link",
      label: [{ kind: "image", alt: "plot", source: "/plot.png" }],
      destination: "/report",
    }],
    [{
      kind: "link",
      label: [{ kind: "hard-break" }],
      destination: "/report",
    }],
    [{ kind: "image", alt: " ", source: "/plot.png" }],
    [{ kind: "footnote-reference", identifier: "has spaces" }],
    [{ kind: "soft-break" }],
    new Array(1),
  ];
  for (const value of malformed) {
    assertThrows(
      () => validateSemanticInlineContent(value),
      TypeError,
      "semantic inline content",
    );
  }

  const accessor = Object.defineProperty(
    { kind: "text" },
    "text",
    { enumerable: true, get: () => "unsafe" },
  );
  assertThrows(
    () => validateSemanticInlineContent([accessor]),
    TypeError,
    "must store",
  );
});

Deno.test("cycles and depth exhaustion fail deterministically", () => {
  const cycle: unknown[] = [];
  cycle.push({ kind: "strong", content: cycle });
  assertThrows(
    () => validateSemanticInlineContent(cycle),
    TypeError,
    "cycle",
  );

  let accepted: SemanticInlineContent = "leaf";
  for (let depth = 0; depth < SEMANTIC_INLINE_MAX_DEPTH; depth += 1) {
    accepted = [{ kind: "strong", content: accepted }];
  }
  validateSemanticInlineContent(accepted);
  const exhausted: SemanticInlineContent = [{
    kind: "emphasis",
    content: accepted,
  }];
  assertThrows(
    () => validateSemanticInlineContent(exhausted),
    TypeError,
    "nesting limit",
  );
});

Deno.test("terminal controls, bidi formats, and unsafe metadata stay inert", () => {
  const escape = String.fromCharCode(27);
  for (
    const value of [
      "line\nmove",
      "tab\tmove",
      "cursor" + escape + "[2J",
      "bidi\u202Eoverride",
      "isolate\u2066text",
    ]
  ) {
    assertThrows(
      () => validateSemanticInlineContent([{ kind: "text", text: value }]),
      TypeError,
      "control and format",
    );
  }
  assertThrows(
    () =>
      validateSemanticInlineContent([{
        kind: "image",
        alt: "plot\u202E",
        source: "/plot.png",
      }]),
    TypeError,
    "control and format",
  );
  assertThrows(
    () =>
      validateSemanticInlineContent([{
        kind: "link",
        label: "guide",
        destination: "/guide",
        title: "\u2066hidden",
      }]),
    TypeError,
    "control and format",
  );

  const literal = [{
    kind: "literal",
    text: "<script>alert(1)</script>",
  }] as const;
  assertEquals(
    renderSemanticInlineContent(literal, testTerminalCapabilities()),
    "<script>alert(1)</script>",
  );
  const html = projectTerminalHtml(
    renderSemanticInlineContent(
      literal,
      testTerminalCapabilities({ colorDepth: "truecolor" }),
    ),
  );
  assert(!html.includes("<script>"));
  assertStringIncludes(html, "&lt;script&gt;alert(1)&lt;/script&gt;");
});

Deno.test("semantic width validation is capability-bounded", () => {
  const capabilities = testTerminalCapabilities({ columns: 5 });
  assertEquals(
    wrapSemanticInlineContent("alpha beta", 20, capabilities),
    ["alpha", "beta"],
  );
  assertThrows(
    () => wrapSemanticInlineContent("alpha", 0, capabilities),
    TypeError,
    "positive safe integer",
  );
  assertThrows(
    () =>
      wrapSemanticInlineContent(
        "alpha",
        5,
        testTerminalCapabilities({ columns: 0 }),
      ),
    TypeError,
    "terminal columns",
  );
});
