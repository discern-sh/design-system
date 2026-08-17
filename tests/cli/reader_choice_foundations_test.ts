import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  renderCheckboxCli,
  renderRadioCli,
  renderSelectCli,
  stripAnsi,
} from "../../src/cli/mod.ts";
import {
  filterInteractionEntries,
  requestSearch,
  requestSearchSelections,
  requestSelection,
} from "../../src/cli/interactive/mod.ts";
import type {
  InteractionEntry,
  SearchRequestOptions,
} from "../../src/cli/interactive/mod.ts";
import { inspectTerminalLayout } from "../../src/cli/projection.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const documentEntries = [
  {
    kind: "group-heading",
    id: "orientation",
    label: "Orientation",
    description: "00-orientation/",
  },
  {
    id: "design",
    label: "Design principles",
    description: "design-principles.md",
    value: "design",
  },
  {
    id: "testing",
    label: "Testing",
    description: "testing.md",
    value: "testing",
  },
  {
    kind: "group-heading",
    id: "decisions",
    label: "Decisions",
    description: "_adr/",
  },
  {
    id: "legacy",
    label: "Legacy terminal contract",
    description: "0002-react-free-cli-renderer-contract.md",
    value: "legacy",
    disabled: true,
  },
] as const satisfies readonly InteractionEntry<string>[];

const staticSearchOptions = {
  label: "Documents",
  search: documentEntries,
} satisfies SearchRequestOptions<string>;

Deno.test("choice descriptions and static search remain additive public types", () => {
  assertEquals(
    staticSearchOptions.search[1]?.description,
    "design-principles.md",
  );
});

Deno.test("the static matcher searches descriptions and retains semantic groups", () => {
  assertEquals(
    filterInteractionEntries(documentEntries, " design-principles.md "),
    [documentEntries[0], documentEntries[1]],
    "a filename match retains its governing heading",
  );
  assertEquals(
    filterInteractionEntries(documentEntries, "00-ORIENTATION/"),
    documentEntries.slice(0, 3),
    "a heading description match retains its complete group",
  );
  assertEquals(
    filterInteractionEntries(documentEntries, "renderer-contract"),
    [documentEntries[3], documentEntries[4]],
    "disabled entries remain searchable and structurally grouped",
  );
  assertEquals(
    filterInteractionEntries(documentEntries, "   "),
    documentEntries,
  );
});

const describedFrameEntries = [
  {
    kind: "group-heading" as const,
    id: "orientation",
    label: "Orientation",
    description: "00-orientation/",
  },
  {
    id: "design",
    label: "Design principles",
    description: "design-principles.md",
  },
  {
    id: "legacy",
    label: "Legacy",
    description: "legacy.md",
    disabled: true,
  },
] as const;

const describedSelectState = {
  kind: "select" as const,
  label: "Documents",
  lifecycle: { status: "active" as const },
  options: describedFrameEntries,
  highlightedIndex: 1,
  selectedId: "design",
  width: 32,
};

const describedSelectPlain =
  "Documents [active]\n┌──────────────────────────────┐\n│                              │\n│━━ ▲ ORIENTATION ━━━━━━━━━━━━━│\n│     00-orientation/          │\n│› [●] Design principles       │\n│      design-principles.md    │\n│  [ ] Legacy (disabled)       │\n│      legacy.md               │\n└──────────────────────────────┘\n";

Deno.test("Select renders descriptions exactly in Unicode and ASCII", () => {
  const unicode = testTerminalCapabilities({ columns: 32 });
  assertExactFrame(
    renderSelectCli(describedSelectState, unicode),
    describedSelectPlain,
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 32, unicode: false });
  assertExactFrame(
    renderSelectCli(describedSelectState, ascii),
    "Documents [active]\n+------------------------------+\n|                              |\n|== ^ ORIENTATION =============|\n|     00-orientation/          |\n|> [*] Design principles       |\n|      design-principles.md    |\n|  [ ] Legacy (disabled)       |\n|      legacy.md               |\n+------------------------------+\n",
    ascii,
  );
  assertExactFrame(
    renderSelectCli({
      ...describedSelectState,
      lifecycle: { status: "submitted" },
    }, unicode),
    "Documents [submitted]\n┌──────────────────────────────┐\n│Design principles ⌄           │\n│design-principles.md          │\n└──────────────────────────────┘\n✓ Submitted",
    unicode,
  );
});

Deno.test("every choice family shares description geometry and Token styling", () => {
  const renderers = [
    (capabilities: ReturnType<typeof testTerminalCapabilities>) =>
      renderSelectCli(describedSelectState, capabilities),
    (capabilities: ReturnType<typeof testTerminalCapabilities>) =>
      renderRadioCli(describedSelectState, capabilities),
    (capabilities: ReturnType<typeof testTerminalCapabilities>) =>
      renderCheckboxCli({
        ...describedSelectState,
        kind: "multiselect",
        selectedIds: ["design"],
      }, capabilities),
  ] as const;
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ columns: 32, colorDepth });
    for (const render of renderers) {
      const frame = render(capabilities);
      const plain = stripAnsi(frame);
      assertStyledFrame(frame, plain, capabilities);
      assertStringIncludes(plain, "Design principles");
      assertStringIncludes(plain, "design-principles.md");
      assertStringIncludes(plain, "Legacy (disabled)");
      assertStringIncludes(plain, "legacy.md");
      const descriptionAt = frame.indexOf("design-principles.md");
      const styleAt = frame.lastIndexOf("\x1b[", descriptionAt);
      assert(
        descriptionAt >= 0 && styleAt >= 0 &&
          frame.slice(styleAt, descriptionAt).endsWith("m"),
        `${colorDepth} description did not use a package style run`,
      );
    }
  }
});

Deno.test("long descriptions wrap beneath semantic text through every choice family", () => {
  const capabilities = testTerminalCapabilities({ columns: 24 });
  const options = [{
    id: "long",
    label: "A deliberately long document title",
    description: "a-deliberately-long-document-filename.md",
  }] as const;
  const frames = [
    renderSelectCli({
      kind: "select",
      label: "Documents",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 0,
      selectedId: "long",
      width: 24,
    }, capabilities),
    renderRadioCli({
      kind: "select",
      label: "Documents",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 0,
      selectedId: "long",
      width: 24,
    }, capabilities),
    renderCheckboxCli({
      kind: "multiselect",
      label: "Documents",
      lifecycle: { status: "active" },
      options,
      highlightedIndex: 0,
      selectedIds: ["long"],
      width: 24,
    }, capabilities),
  ];
  for (const frame of frames) {
    assertExactFrame(frame, frame, capabilities);
    const semanticLines = stripAnsi(frame).split("\n").filter((line) =>
      line.includes("document") || line.includes("filename") ||
      line.includes("deliberately")
    );
    assert(semanticLines.length >= 4, "long semantic content did not wrap");
    assert(
      semanticLines.slice(1).every((line) => /^│ {4,6}/u.test(line)),
      "continuations did not stay under the semantic text column",
    );
  }
});

Deno.test("narrow group headings wrap losslessly beneath the motif lead", () => {
  const state = {
    kind: "select" as const,
    label: "Documents",
    lifecycle: { status: "active" as const },
    options: [
      {
        kind: "group-heading" as const,
        id: "long-group",
        label: "Orientation and development",
        description: "00-orientation-and-development/",
      },
      { id: "open", label: "Open", description: "open.md" },
    ],
    highlightedIndex: 1,
    selectedId: "open",
    width: 24,
  };
  const unicode = testTerminalCapabilities({ columns: 24 });
  const unicodeFrame = renderSelectCli(state, unicode);
  assertExactFrame(
    unicodeFrame,
    "Documents [active]\n┌──────────────────────┐\n│                      │\n│━━ ▲ ORIENTATION AND ━│\n│     DEVELOPMENT      │\n│     00-orientation-an│\n│     d-development/   │\n│› [●] Open            │\n│      open.md         │\n└──────────────────────┘\n",
    unicode,
  );
  const inspection = inspectTerminalLayout(unicodeFrame, {
    columns: 24,
    rows: 12,
  });
  assertEquals(inspection.overflowRows, []);
  assertEquals(inspection.rowsBelowFold, 0);
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderSelectCli(state, ascii),
    "Documents [active]\n+----------------------+\n|                      |\n|== ^ ORIENTATION AND =|\n|     DEVELOPMENT      |\n|     00-orientation-an|\n|     d-development/   |\n|> [*] Open            |\n|      open.md         |\n+----------------------+\n",
    ascii,
  );
});

Deno.test("description geometry survives grouped windowing and overflow facts", () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  const frame = renderSelectCli({
    kind: "select",
    label: "Documents",
    lifecycle: { status: "active" },
    options: [
      describedFrameEntries[0],
      describedFrameEntries[1],
      { id: "testing", label: "Testing", description: "testing.md" },
      { id: "cli", label: "CLI", description: "70-cli/README.md" },
      { id: "tokens", label: "Tokens", description: "tokens.md" },
    ],
    highlightedIndex: 2,
    selectedId: "testing",
    visibleStart: 2,
    visibleCount: 1,
    width: 32,
  }, capabilities);
  assertStringIncludes(frame, "ORIENTATION");
  assertStringIncludes(frame, "00-orientation/");
  assertStringIncludes(frame, "Testing");
  assertStringIncludes(frame, "testing.md");
  assertStringIncludes(frame, "↑ 1 more · ↓ 2 more");
  assert(!frame.includes("design-principles.md"));
  assert(!frame.includes("70-cli/README.md"));
  assertExactFrame(frame, frame, capabilities);
});

Deno.test("choice descriptions reject terminal controls before mutation and in pure frames", async () => {
  for (
    const entry of [
      { id: "bad", label: "Bad", description: "bad\u001b[31m", value: 1 },
      {
        kind: "group-heading" as const,
        id: "bad-group",
        label: "Bad group",
        description: "bad\u0007",
      },
    ]
  ) {
    const io = new FakeTerminalIO(["\r"]);
    await assertRejects(
      () =>
        requestSelection({
          label: "Invalid",
          choices: [entry] as readonly InteractionEntry<number>[],
          required: false,
        }, { io }),
      TypeError,
      "invalid description",
    );
    assertEquals(io.rawTransitions, []);
    assertEquals(io.writes, []);
  }

  assertThrows(
    () =>
      renderSelectCli({
        kind: "select",
        label: "Invalid",
        lifecycle: { status: "active" },
        options: [{ id: "bad", label: "Bad", description: "\u001b[2m" }],
        highlightedIndex: 0,
      }, testTerminalCapabilities()),
    TypeError,
    "choice description",
  );
});

Deno.test("static search finds a filename absent from its title for single and multiselect", async () => {
  const single = new FakeTerminalIO(["design-principles.md\r"], {
    columns: 40,
  });
  assertEquals(
    await requestSearch({
      label: "Documents",
      search: documentEntries,
      initialId: "design",
    }, { io: single }),
    "design",
  );
  assertStringIncludes(single.output(), "design-principles.md");
  assertStringIncludes(single.output(), "ORIENTATION");

  const multiple = new FakeTerminalIO(["testing.md\r"], { columns: 40 });
  assertEquals(
    await requestSearchSelections({
      label: "Documents",
      search: documentEntries,
      initialIds: ["testing"],
    }, { io: multiple }),
    ["testing"],
  );
  assertStringIncludes(multiple.output(), "testing.md");
});

Deno.test("caller-owned search providers remain unfiltered", async () => {
  const calls: string[] = [];
  const io = new FakeTerminalIO(["local-filename.md\r"], { columns: 40 });
  assertEquals(
    await requestSearch({
      label: "Remote search",
      initialId: "remote",
      search: (query) => {
        calls.push(query);
        return [{
          id: "remote",
          label: "Server-ranked result",
          description: "provider-owned-score",
          value: "remote",
        }];
      },
    }, { io }),
    "remote",
  );
  assertEquals(calls.at(-1), "local-filename.md");
  assertStringIncludes(io.output(), "Server-ranked result");
  assertStringIncludes(io.output(), "provider-owned-score");
});
