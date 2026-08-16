import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import {
  CLI_BLOCK_MAX_DEPTH,
  type CliBlock,
  createCliBlock,
  renderCliBlock,
} from "../../src/cli/block-composition.ts";
import type { CliRenderer } from "../../src/cli/contracts.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { renderSemanticInlineContent } from "../../src/cli/semantic-inline.ts";
import { measureText } from "../../src/cli/text.ts";
import renderListCli, {
  cliExamples,
  type ListCliProps,
} from "../../src/components/editorial/list/list.cli.ts";
import renderParagraphCli from "../../src/components/editorial/paragraph/paragraph.cli.ts";

const plainItems = {
  items: [
    { content: "One short item" },
    { content: "One longer item wraps safely" },
  ],
} as const;

Deno.test("List renders exact narrow, standard, and wide hanging frames", () => {
  const frames = [
    [
      12,
      "• One short\n  item\n• One longer\n  item wraps\n  safely",
    ],
    [
      20,
      "• One short item\n• One longer item\n  wraps safely",
    ],
    [
      48,
      "• One short item\n• One longer item wraps safely",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderListCli(plainItems, capabilities),
      expected,
      capabilities,
    );
  }
  const narrowed = renderListCli(
    { ...plainItems, maxWidth: 12 },
    testTerminalCapabilities({ columns: 80 }),
  );
  assertEquals(narrowed, frames[0][1]);
});

Deno.test("List aligns ordered digit transitions against the widest marker", () => {
  const capabilities = testTerminalCapabilities({ columns: 24 });
  assertExactFrame(
    renderListCli(
      {
        kind: "ordered",
        start: 9,
        items: [
          { content: "Ninth item" },
          { content: "Tenth item with continuation" },
        ],
      },
      capabilities,
    ),
    "9.  Ninth item\n10. Tenth item with\n    continuation",
    capabilities,
  );
});

Deno.test("List task markers retain checked, unchecked, and ordinary meaning in Unicode and ASCII", () => {
  const props = {
    kind: "task",
    items: [
      { content: "Reviewed", checked: true },
      { content: "Pending", checked: false },
      { content: "Context" },
    ],
  } as const;
  const unicode = testTerminalCapabilities({ columns: 24 });
  assertExactFrame(
    renderListCli(props, unicode),
    "☑ Reviewed\n☐ Pending\n•  Context",
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderListCli(props, ascii),
    "[x] Reviewed\n[ ] Pending\n*   Context",
    ascii,
  );
});

Deno.test("List preserves rich inline styles and hyperlinks exactly at every colour depth", () => {
  const content = [
    "Keep ",
    { kind: "strong", content: "meaning" },
    " beside ",
    {
      kind: "link",
      label: "the reference",
      destination: "https://example.test/reference",
    },
    ".",
  ] as const;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    for (const unicode of [true, false]) {
      const capabilities = testTerminalCapabilities({
        columns: 80,
        colorDepth,
        unicode,
      });
      const expected = `${unicode ? "•" : "*"} ${
        renderSemanticInlineContent(content, capabilities)
      }`;
      assertExactFrame(
        renderListCli({ items: [{ content }] }, capabilities),
        expected,
        capabilities,
      );
    }
  }
});

Deno.test("List composes continuation paragraphs and recursively mixed list kinds", () => {
  const capabilities = testTerminalCapabilities({ columns: 30 });
  const nested = createCliBlock(renderListCli, {
    kind: "ordered",
    start: 2,
    items: [
      { content: "Nested first" },
      { content: "Nested second" },
    ],
  });
  const continuation = createCliBlock(renderParagraphCli, {
    content: "Continuation paragraph stays structural.",
  });
  const tight = renderListCli(
    {
      items: [
        {
          content: "Parent item",
          blocks: [continuation, nested],
        },
        { content: "Next item" },
      ],
    },
    capabilities,
  );
  assertExactFrame(
    tight,
    "• Parent item\n  Continuation paragraph stays\n  structural.\n\n  2. Nested first\n  3. Nested second\n• Next item",
    capabilities,
  );

  const loose = renderListCli(
    {
      spacing: "loose",
      items: [
        {
          content: "Parent item",
          blocks: [continuation],
        },
        { content: "Next item" },
      ],
    },
    capabilities,
  );
  assertExactFrame(
    loose,
    "• Parent item\n\n  Continuation paragraph stays\n  structural.\n\n• Next item",
    capabilities,
  );
});

Deno.test("List keeps long tokens and Unicode graphemes complete within narrow widths", () => {
  const content = "alpha😀中supercalifragilistic";
  const capabilities = testTerminalCapabilities({
    columns: 12,
    unicode: false,
  });
  const output = renderListCli({ items: [{ content }] }, capabilities);
  for (const line of output.split("\n")) {
    assert(measureText(line) <= capabilities.columns, stripAnsi(line));
  }
  const recovered = output.split("\n").map((line) => line.slice(2)).join("");
  assertEquals(recovered, content);
});

Deno.test("List rejects empty, malformed, unsafe, and impossible inputs", () => {
  const capabilities = testTerminalCapabilities({ columns: 24 });
  assertThrows(
    () => renderListCli({ items: [] }, capabilities),
    TypeError,
    "at least one item",
  );
  assertThrows(
    () => renderListCli({ items: [{ content: "" }] }, capabilities),
    TypeError,
    "must be non-empty",
  );
  assertThrows(
    () =>
      renderListCli(
        {
          kind: "unordered",
          items: [{ content: "Wrong state", checked: true }],
        },
        capabilities,
      ),
    TypeError,
    "outside a task list",
  );
  assertThrows(
    () =>
      renderListCli(
        {
          kind: "ordered",
          start: Number.MAX_SAFE_INTEGER,
          items: [{ content: "One" }, { content: "Two" }],
        },
        capabilities,
      ),
    TypeError,
    "safe integers",
  );
  assertThrows(
    () =>
      renderListCli(
        { items: [{ content: "unsafe\u001b[31m" }] },
        capabilities,
      ),
    TypeError,
    "control",
  );
  assertThrows(
    () =>
      renderListCli(
        {
          items: [{
            content: "Forged child",
            blocks: [{} as CliBlock],
          }],
        },
        capabilities,
      ),
    TypeError,
    "createCliBlock",
  );
  assertThrows(
    () =>
      renderListCli(
        {
          kind: "ordered",
          start: 123456,
          items: [{ content: "Marker cannot fit" }],
        },
        testTerminalCapabilities({ columns: 7 }),
      ),
    TypeError,
    "list marker",
  );
  assertThrows(
    () =>
      renderListCli(
        { items: [{ content: "Too narrow" }], maxWidth: 4 },
        capabilities,
      ),
    TypeError,
    "list width",
  );
  assertThrows(
    () =>
      renderListCli(
        {
          kind: "unknown",
          items: [{ content: "No" }],
        } as unknown as ListCliProps,
        capabilities,
      ),
    TypeError,
    "unknown list kind",
  );
});

Deno.test("List composition inherits the shared structural depth guard", () => {
  interface NestedProps {
    readonly child?: CliBlock;
  }
  const renderNested: CliRenderer<NestedProps> = (props, capabilities) =>
    props.child === undefined
      ? "leaf"
      : renderCliBlock(props.child, capabilities);
  let nested = createCliBlock(renderNested, {});
  for (let depth = 0; depth <= CLI_BLOCK_MAX_DEPTH; depth += 1) {
    nested = createCliBlock(renderNested, { child: nested });
  }
  assertThrows(
    () =>
      renderListCli(
        { items: [{ content: "Parent", blocks: [nested] }] },
        testTerminalCapabilities({ columns: 24 }),
      ),
    TypeError,
    `exceeds ${CLI_BLOCK_MAX_DEPTH}`,
  );
});

Deno.test("List catalogue examples render deterministically at every capability posture", () => {
  for (const example of cliExamples) {
    for (
      const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
    ) {
      for (const unicode of [true, false]) {
        const capabilities = testTerminalCapabilities({
          columns: 34,
          colorDepth,
          unicode,
        });
        const first = renderListCli(example.props, capabilities);
        assertEquals(renderListCli(example.props, capabilities), first);
        assert(!first.startsWith("\n"));
        assert(!first.endsWith("\n"));
        for (const line of first.split("\n")) {
          assert(measureText(line) <= capabilities.columns, stripAnsi(line));
        }
        assertStringIncludes(
          stripAnsi(first),
          example.name === "task-mixed" ? "Reviewed" : "meaning",
        );
      }
    }
  }
});
