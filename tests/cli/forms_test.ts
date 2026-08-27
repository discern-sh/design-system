import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { stripAnsi, styleText } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { CliExample } from "../../src/cli/contracts.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import {
  checkboxCliExamples,
  type CheckboxCliProps,
  fieldCliExamples,
  inputCliExamples,
  radioCliExamples,
  type RadioCliProps,
  renderCheckboxCli,
  renderFieldCli,
  renderInputCli,
  renderMotifSectionRule,
  renderRadioCli,
  renderSelectCli,
  renderSwitchCli,
  renderTextareaCli,
  selectCliExamples,
  type SelectCliProps,
  switchCliExamples,
  textareaCliExamples,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import {
  type FormCliFrameOptions,
  renderFormCliFrame,
} from "../../src/components/forms/form-frame.ts";

interface WidthProps {
  readonly width?: number;
}

type Renderer<Props> = (
  props: Readonly<Props>,
  capabilities: TerminalCapabilities,
) => string;

function sectionRule(
  label: string,
  width: number,
  unicode = true,
): string {
  const capabilities = testTerminalCapabilities({ columns: width, unicode });
  return stripAnsi(
    renderMotifSectionRule(label, { width }, capabilities),
  );
}

function withWidth<Props extends WidthProps>(
  props: Readonly<Props>,
  width: number,
): Props {
  return { ...props, width } as Props;
}

function assertStateFrames<Props extends WidthProps>(
  examples: readonly CliExample<Props>[],
  render: Renderer<Props>,
  expected: readonly string[],
): void {
  const capabilities = testTerminalCapabilities({ columns: 28 });
  for (const [index, example] of examples.entries()) {
    assertExactFrame(
      render(withWidth(example.props, 28), capabilities),
      expected[index] ?? "",
      capabilities,
    );
  }
}

function assertWidthsAndCapabilities<Props extends WidthProps>(
  examples: readonly CliExample<Props>[],
  render: Renderer<Props>,
  widths: readonly [string, string, string],
  activePlaintext: string,
  ascii: string,
): void {
  const filled = examples.find((example) => example.name === "filled");
  const active = examples.find((example) => example.name === "active");
  if (filled === undefined || active === undefined) {
    throw new TypeError("form examples must include active and filled states");
  }
  for (const [index, columns] of [16, 28, 48].entries()) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      render(withWidth(filled.props, columns), capabilities),
      widths[index] ?? "",
      capabilities,
    );
  }
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 28 });
    assertStyledFrame(
      render(withWidth(active.props, 28), capabilities),
      activePlaintext,
      capabilities,
    );
  }
  const capabilities = testTerminalCapabilities({
    columns: 28,
    unicode: false,
  });
  assertExactFrame(
    render(withWidth(active.props, 28), capabilities),
    ascii,
    capabilities,
  );
}

Deno.test("Form frame balances padding and reserves default status for searching", () => {
  const capabilities = testTerminalCapabilities({ columns: 20 });
  const base = {
    label: "Project",
    control: "atlas",
    lifecycle: { status: "active" },
    width: 20,
  } as const;
  assertExactFrame(
    renderFormCliFrame(base, capabilities),
    "Project\n┌──────────────────┐\n│ atlas            │\n└──────────────────┘\n",
    capabilities,
  );
  assertExactFrame(
    renderFormCliFrame(
      { ...base, showStatus: true } as unknown as FormCliFrameOptions,
      capabilities,
    ),
    "Project [active]\n┌──────────────────┐\n│ atlas            │\n└──────────────────┘\n",
    capabilities,
  );
  assertExactFrame(
    renderFormCliFrame({ ...base, pending: true }, capabilities),
    "Project [searching]\n┌──────────────────┐\n│ atlas            │\n└──────────────────┘\n",
    capabilities,
  );
  assertExactFrame(
    renderFormCliFrame(
      { ...base, pending: true, showStatus: false },
      capabilities,
    ),
    "Project\n┌──────────────────┐\n│ atlas            │\n└──────────────────┘\n",
    capabilities,
  );
});

const checkboxFrames = [
  "Include examples\n┌──────────────────────────┐\n│ [ ] Not included         │\n└──────────────────────────┘\n",
  "Notifications\n┌──────────────────────────┐\n│                          │\n│ ━━ ▲ REGULAR ━━━━━━━━━━━ │\n│ › [✓] Email updates      │\n│   [ ] Weekly summary     │\n│       (disabled)         │\n│                          │\n│ ━━ ▲ OPTIONAL ━━━━━━━━━━ │\n│   [ ] Announcements      │\n└──────────────────────────┘\n",
  "Include examples\n┌──────────────────────────┐\n│ › [ ] Not included       │\n└──────────────────────────┘\n",
  "Include examples\n┌──────────────────────────┐\n│ [✓] Included             │\n└──────────────────────────┘\n",
  "Include examples\n┌──────────────────────────┐\n│ › [ ] Not included       │\n└──────────────────────────┘\n! Choose before continuing",
  "Include examples\n┌──────────────────────────┐\n│ [ ] Not included         │\n└──────────────────────────┘\nDisabled",
  "Include examples\n┌──────────────────────────┐\n│ [✓] Included             │\n└──────────────────────────┘\n✓ Submitted",
  "Include examples\n┌──────────────────────────┐\n│ [ ] Not included         │\n└──────────────────────────┘\n× Choice cancelled",
] as const;

Deno.test("Checkbox renders every static form state exactly", () => {
  assertStateFrames(checkboxCliExamples, renderCheckboxCli, checkboxFrames);
});

Deno.test("Checkbox covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    checkboxCliExamples,
    renderCheckboxCli,
    [
      "Include examples\n┌──────────────┐\n│ [✓] Included │\n└──────────────┘\n",
      checkboxFrames[3],
      "Include examples\n┌──────────────────────────────────────────────┐\n│ [✓] Included                                 │\n└──────────────────────────────────────────────┘\n",
    ],
    checkboxFrames[2],
    "Include examples\n+--------------------------+\n| > [ ] Not included       |\n+--------------------------+\n",
  );
});

const checkboxRendererFixtures = [
  {
    name: "search-filtered",
    props: {
      kind: "search-multiselect",
      label: "Roles",
      lifecycle: { status: "active" },
      query: "re",
      cursor: 2,
      results: [
        { id: "render", label: "Render frames" },
        { id: "inspect", label: "Inspect", disabled: true },
        { kind: "group-heading", id: "selected", label: "Selected" },
        { id: "animate", label: "Animate progress" },
      ],
      selectedIds: ["render", "animate"],
      highlightedIndex: 0,
    },
  },
  {
    name: "windowed",
    props: {
      kind: "multiselect",
      label: "Capabilities",
      lifecycle: { status: "active" },
      options: [
        { id: "render", label: "Render" },
        { id: "inspect", label: "Inspect" },
        { id: "animate", label: "Animate" },
        { id: "export", label: "Export" },
        { id: "publish", label: "Publish" },
      ],
      highlightedIndex: 0,
      selectedIds: [],
      visibleStart: 0,
      visibleCount: 2,
    },
  },
] as const satisfies readonly CliExample<CheckboxCliProps>[];

Deno.test("Checkbox keeps renderer-only search and viewport evidence", () => {
  assertStateFrames(
    checkboxRendererFixtures,
    renderCheckboxCli,
    [
      `Roles\n┌──────────────────────────┐\n│ re▌                      │\n│ › [✓] Render frames      │\n│   [ ] Inspect (disabled) │\n│                          │\n│ ${
        sectionRule("Selected", 24)
      } │\n│   [✓] Animate progress   │\n└──────────────────────────┘\n`,
      "Capabilities\n┌──────────────────────────┐\n│ › [ ] Render             │\n│   [ ] Inspect            │\n└──────── ↓ 3 more ────────┘\n",
    ],
  );
});

const fieldFrames = [
  "Environment\n┌──────────────────────────┐\n│ Choose a value           │\n└──────────────────────────┘\n",
  "Environment\n┌──────────────────────────┐\n│ staging                  │\n└──────────────────────────┘\nUse a configured environment",
  "Environment\n┌──────────────────────────┐\n│ staging                  │\n└──────────────────────────┘\n",
  "Environment\n┌──────────────────────────┐\n│ staging                  │\n└──────────────────────────┘\n! Environment is unavailable",
  "Environment\n┌──────────────────────────┐\n│ staging                  │\n└──────────────────────────┘\nDisabled",
  "Environment\n┌──────────────────────────┐\n│ staging                  │\n└──────────────────────────┘\n✓ Submitted",
  "Environment\n┌──────────────────────────┐\n│ staging                  │\n└──────────────────────────┘\n× Selection cancelled",
  "Heads up\n┌──────────────────────────┐\n│ Review the summary       │\n│ above.                   │\n└──────────────────────────┘\nPress Enter to continue.",
] as const;

Deno.test("Field renders every static form state exactly", () => {
  assertStateFrames(fieldCliExamples, renderFieldCli, fieldFrames);
});

Deno.test("Field covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    fieldCliExamples,
    renderFieldCli,
    [
      "Environment\n┌──────────────┐\n│ staging      │\n└──────────────┘\n",
      fieldFrames[2],
      "Environment\n┌──────────────────────────────────────────────┐\n│ staging                                      │\n└──────────────────────────────────────────────┘\n",
    ],
    fieldFrames[1],
    "Environment\n+--------------------------+\n| staging                  |\n+--------------------------+\nUse a configured environment",
  );
});

const inputFrames = [
  "Project name\n┌──────────────────────────┐\n│ my-project               │\n└──────────────────────────┘\n",
  "Project name\n┌──────────────────────────┐\n│ ▌my-project              │\n└──────────────────────────┘\n",
  "Project name\n┌──────────────────────────┐\n│ atlas                    │\n└──────────────────────────┘\n",
  "Project name\n┌──────────────────────────┐\n│ a▌                       │\n└──────────────────────────┘\n! Use at least three charac…",
  "Project name\n┌──────────────────────────┐\n│ atlas                    │\n└──────────────────────────┘\nDisabled",
  "Project name\n┌──────────────────────────┐\n│ atlas                    │\n└──────────────────────────┘\n✓ Submitted",
  "Project name\n┌──────────────────────────┐\n│ my-project               │\n└──────────────────────────┘\n× Input cancelled",
  "Country [searching]\n┌──────────────────────────┐\n│ can▌                     │\n└──────────────────────────┘\n",
] as const;

Deno.test("Input renders idle through cancelled states exactly", () => {
  assertStateFrames(inputCliExamples, renderInputCli, inputFrames);
});

Deno.test("Input covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    inputCliExamples,
    renderInputCli,
    [
      "Project name\n┌──────────────┐\n│ atlas        │\n└──────────────┘\n",
      inputFrames[2],
      "Project name\n┌──────────────────────────────────────────────┐\n│ atlas                                        │\n└──────────────────────────────────────────────┘\n",
    ],
    inputFrames[1],
    "Project name\n+--------------------------+\n| |my-project              |\n+--------------------------+\n",
  );
});

const radioFrames = [
  "Channel\n┌──────────────────────────┐\n│   ○ Alpha                │\n│   ○ Bravo                │\n│   ○ Charlie (disabled)   │\n└──────────────────────────┘\n",
  `Channel\n┌──────────────────────────┐\n│                          │\n│ ${
    sectionRule("Stable", 24)
  } │\n│   ○ Alpha                │\n│ › ◉ Bravo                │\n│                          │\n│ ${
    sectionRule("Preview", 24)
  } │\n│   ○ Charlie (disabled)   │\n└──────────────────────────┘\n`,
  "Channel\n┌──────────────────────────┐\n│   ○ Alpha                │\n│ › ○ Bravo                │\n│   ○ Charlie (disabled)   │\n└──────────────────────────┘\n",
  "Channel\n┌──────────────────────────┐\n│   ○ Alpha                │\n│   ◉ Bravo                │\n│   ○ Charlie (disabled)   │\n└──────────────────────────┘\n",
  "Channel\n┌──────────────────────────┐\n│ › ○ Alpha                │\n│   ○ Bravo                │\n│   ○ Charlie (disabled)   │\n└──────────────────────────┘\n! Choose a channel",
  "Channel\n┌──────────────────────────┐\n│   ◉ Alpha                │\n│   ○ Bravo                │\n│   ○ Charlie (disabled)   │\n└──────────────────────────┘\nDisabled",
  "Channel\n┌──────────────────────────┐\n│   ○ Alpha                │\n│   ◉ Bravo                │\n│   ○ Charlie (disabled)   │\n└──────────────────────────┘\n✓ Submitted",
  "Channel\n┌──────────────────────────┐\n│   ○ Alpha                │\n│   ○ Bravo                │\n│   ○ Charlie (disabled)   │\n└──────────────────────────┘\n× Selection cancelled",
] as const;

Deno.test("Radio renders every static selection state exactly", () => {
  assertStateFrames(radioCliExamples, renderRadioCli, radioFrames);
});

Deno.test("Radio search reserves its pointer column across highlight movement", () => {
  const capabilities = testTerminalCapabilities({ columns: 20 });
  const base = {
    kind: "search" as const,
    label: "Find",
    lifecycle: { status: "active" as const },
    query: "",
    cursor: 0,
    placeholder: "Search",
    results: [
      { id: "alpha", label: "Alpha" },
      { id: "bravo", label: "Bravo" },
    ],
    width: 20,
  };
  assertExactFrame(
    renderRadioCli({ ...base, highlightedIndex: 0 }, capabilities),
    "Find\n┌──────────────────┐\n│ ▌Search          │\n│ › ○ Alpha        │\n│   ○ Bravo        │\n└──────────────────┘\n",
    capabilities,
  );
  assertExactFrame(
    renderRadioCli({ ...base, highlightedIndex: 1 }, capabilities),
    "Find\n┌──────────────────┐\n│ ▌Search          │\n│   ○ Alpha        │\n│ › ○ Bravo        │\n└──────────────────┘\n",
    capabilities,
  );
});

Deno.test("pending keeps discovery frames honest without moving a row", () => {
  const capabilities = testTerminalCapabilities({ columns: 24 });
  const search = {
    kind: "search" as const,
    label: "Find",
    lifecycle: { status: "active" as const },
    query: "al",
    cursor: 2,
    results: [
      { id: "alpha", label: "Alpha" },
      { id: "album", label: "Album" },
    ],
    highlightedIndex: 0,
    width: 24,
  };
  const settled = renderRadioCli(search, capabilities);
  const pending = renderRadioCli({ ...search, pending: true }, capabilities);
  assertExactFrame(
    pending,
    "Find [searching]\n┌──────────────────────┐\n│ al▌                  │\n│ › ○ Alpha            │\n│   ○ Album            │\n└──────────────────────┘\n",
    capabilities,
  );
  assertEquals(
    settled.split("\n").length,
    pending.split("\n").length,
    "pending must never change a discovery frame's height",
  );

  const { highlightedIndex: _highlighted, ...unhighlighted } = search;
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderRadioCli(
      { ...unhighlighted, results: [], pending: true },
      ascii,
    ),
    "Find [searching]\n+----------------------+\n| al|                  |\n| Searching...         |\n+----------------------+\n",
    ascii,
  );

  const styled = testTerminalCapabilities({
    columns: 24,
    colorDepth: "truecolor",
  });
  assertStyledFrame(
    renderRadioCli({ ...search, pending: true }, styled),
    "Find [searching]\n┌──────────────────────┐\n│ al▌                  │\n│ › ○ Alpha            │\n│   ○ Album            │\n└──────────────────────┘\n",
    styled,
  );

  const autocomplete = {
    kind: "autocomplete" as const,
    label: "Token",
    lifecycle: { status: "active" as const },
    value: "ca",
    cursor: 2,
    suggestions: ["canvas"],
    highlightedIndex: 0,
    width: 24,
  };
  const autocompleteSettled = renderInputCli(autocomplete, capabilities);
  const autocompletePending = renderInputCli(
    { ...autocomplete, pending: true },
    capabilities,
  );
  assertExactFrame(
    autocompletePending,
    "Token [searching]\n┌──────────────────────┐\n│ ca▌nvas              │\n└──────────────────────┘\n",
    capabilities,
  );
  assertEquals(
    autocompleteSettled.split("\n").length,
    autocompletePending.split("\n").length,
  );
});

Deno.test("Radio covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    radioCliExamples,
    renderRadioCli,
    [
      "Channel\n┌──────────────┐\n│   ○ Alpha    │\n│   ◉ Bravo    │\n│   ○ Charlie  │\n│     (disable │\n│     d)       │\n└──────────────┘\n",
      radioFrames[3],
      "Channel\n┌──────────────────────────────────────────────┐\n│   ○ Alpha                                    │\n│   ◉ Bravo                                    │\n│   ○ Charlie (disabled)                       │\n└──────────────────────────────────────────────┘\n",
    ],
    radioFrames[2],
    "Channel\n+--------------------------+\n|   ( ) Alpha              |\n| > ( ) Bravo              |\n|   ( ) Charlie (disabled) |\n+--------------------------+\n",
  );
});

const radioRendererFixtures = [
  {
    name: "searching",
    props: {
      kind: "search",
      label: "Channel",
      lifecycle: { status: "active" },
      query: "cha",
      cursor: 3,
      results: [],
      pending: true,
    },
  },
  {
    name: "windowed",
    props: {
      kind: "select",
      label: "Channel",
      options: [
        { id: "alpha", label: "Alpha" },
        { id: "bravo", label: "Bravo" },
        { id: "charlie", label: "Charlie" },
        { id: "delta", label: "Delta" },
        { id: "echo", label: "Echo" },
      ],
      highlightedIndex: 0,
      visibleStart: 0,
      visibleCount: 2,
      lifecycle: { status: "active" },
    },
  },
] as const satisfies readonly CliExample<RadioCliProps>[];

Deno.test("Radio keeps renderer-only search and viewport evidence", () => {
  assertStateFrames(
    radioRendererFixtures,
    renderRadioCli,
    [
      "Channel [searching]\n┌──────────────────────────┐\n│ cha▌                     │\n│ Searching…               │\n└──────────────────────────┘\n",
      "Channel\n┌──────────────────────────┐\n│ › ○ Alpha                │\n│   ○ Bravo                │\n└──────── ↓ 3 more ────────┘\n",
    ],
  );
});

const selectFrames = [
  "Environment\n┌──────────────────────────┐\n│ Choose an environment ⌄  │\n└──────────────────────────┘\n",
  `Environment\n┌──────────────────────────┐\n│                          │\n│ ${
    sectionRule("Recommended", 24)
  } │\n│   [ ] Alpha              │\n│ › [●] Bravo              │\n│                          │\n│ ${
    sectionRule("Other", 24)
  } │\n│   [ ] Charlie (disabled) │\n└──────────────────────────┘\n`,
  "Environment\n┌──────────────────────────┐\n│   [ ] Alpha              │\n│ › [ ] Bravo              │\n│   [ ] Charlie (disabled) │\n└──────────────────────────┘\n",
  "Environment\n┌──────────────────────────┐\n│ Bravo ⌄                  │\n└──────────────────────────┘\n",
  "Environment\n┌──────────────────────────┐\n│ › [ ] Alpha              │\n│   [ ] Bravo              │\n│   [ ] Charlie (disabled) │\n└──────────────────────────┘\n! Choose an environment",
  "Environment\n┌──────────────────────────┐\n│ Alpha ⌄                  │\n└──────────────────────────┘\nDisabled",
  "Environment\n┌──────────────────────────┐\n│ Bravo ⌄                  │\n└──────────────────────────┘\n✓ Submitted",
  "Environment\n┌──────────────────────────┐\n│ Choose an environment ⌄  │\n└──────────────────────────┘\n× Selection cancelled",
] as const;

Deno.test("Select renders every static selection state exactly", () => {
  assertStateFrames(selectCliExamples, renderSelectCli, selectFrames);
});

Deno.test("Select covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    selectCliExamples,
    renderSelectCli,
    [
      "Environment\n┌──────────────┐\n│ Bravo ⌄      │\n└──────────────┘\n",
      selectFrames[3],
      "Environment\n┌──────────────────────────────────────────────┐\n│ Bravo ⌄                                      │\n└──────────────────────────────────────────────┘\n",
    ],
    selectFrames[2],
    "Environment\n+--------------------------+\n|   [ ] Alpha              |\n| > [ ] Bravo              |\n|   [ ] Charlie (disabled) |\n+--------------------------+\n",
  );
});

const selectRendererFixtures = [
  {
    name: "windowed",
    props: {
      kind: "select",
      label: "Environment",
      options: [
        {
          id: "alpha",
          label:
            "A deliberately long navigation choice whose continuation stays aligned beneath its label",
        },
        { id: "bravo", label: "Bravo" },
        { id: "charlie", label: "Charlie" },
        { id: "delta", label: "Delta" },
        { id: "echo", label: "Echo" },
      ],
      highlightedIndex: 0,
      visibleStart: 0,
      visibleCount: 2,
      lifecycle: { status: "active" },
    },
  },
] as const satisfies readonly CliExample<SelectCliProps>[];

Deno.test("Select keeps renderer-only viewport evidence", () => {
  assertStateFrames(
    selectRendererFixtures,
    renderSelectCli,
    [
      "Environment\n┌──────────────────────────┐\n│ › [ ] A deliberately     │\n│       long navigation    │\n│       choice whose       │\n│       continuation stays │\n│       aligned beneath    │\n│       its label          │\n│   [ ] Bravo              │\n└──────── ↓ 3 more ────────┘\n",
    ],
  );
});

Deno.test("grouped Select, Checkbox, and Radio retain structure in narrow ASCII frames", () => {
  const checkbox = checkboxCliExamples.find(({ name }) => name === "grouped");
  const radio = radioCliExamples.find(({ name }) => name === "grouped");
  const select = selectCliExamples.find(({ name }) => name === "grouped");
  if (checkbox === undefined || radio === undefined || select === undefined) {
    throw new TypeError("grouped form examples must remain enrolled");
  }
  const unicode = testTerminalCapabilities({ columns: 20 });
  const ascii = testTerminalCapabilities({ columns: 20, unicode: false });
  const expected = [
    [
      renderCheckboxCli,
      { ...checkbox.props, width: 20 },
      `Notifications\n┌──────────────────┐\n│                  │\n│ ${
        sectionRule("Regular", 16)
      } │\n│ › [✓] Email      │\n│       updates    │\n│   [ ] Weekly     │\n│       summary    │\n│       (disabled) │\n│                  │\n│ ${
        sectionRule("Optional", 16)
      } │\n│   [ ] Announceme │\n│       nts        │\n└──────────────────┘\n`,
      `Notifications\n+------------------+\n|                  |\n| ${
        sectionRule("Regular", 16, false)
      } |\n| > [x] Email      |\n|       updates    |\n|   [ ] Weekly     |\n|       summary    |\n|       (disabled) |\n|                  |\n| ${
        sectionRule("Optional", 16, false)
      } |\n|   [ ] Announceme |\n|       nts        |\n+------------------+\n`,
    ],
    [
      renderRadioCli,
      { ...radio.props, width: 20 },
      `Channel\n┌──────────────────┐\n│                  │\n│ ${
        sectionRule("Stable", 16)
      } │\n│   ○ Alpha        │\n│ › ◉ Bravo        │\n│                  │\n│ ${
        sectionRule("Preview", 16)
      } │\n│   ○ Charlie      │\n│     (disabled)   │\n└──────────────────┘\n`,
      `Channel\n+------------------+\n|                  |\n| ${
        sectionRule("Stable", 16, false)
      } |\n|   ( ) Alpha      |\n| > (*) Bravo      |\n|                  |\n| ${
        sectionRule("Preview", 16, false)
      } |\n|   ( ) Charlie    |\n|       (disabled) |\n+------------------+\n`,
    ],
    [
      renderSelectCli,
      { ...select.props, width: 20 },
      `Environment\n┌──────────────────┐\n│                  │\n│ ${
        sectionRule("Recommend", 16)
      } │\n│      ED          │\n│   [ ] Alpha      │\n│ › [●] Bravo      │\n│                  │\n│ ${
        sectionRule("Other", 16)
      } │\n│   [ ] Charlie    │\n│       (disabled) │\n└──────────────────┘\n`,
      `Environment\n+------------------+\n|                  |\n| ${
        sectionRule("Recommend", 16, false)
      } |\n|      ED          |\n|   [ ] Alpha      |\n| > [*] Bravo      |\n|                  |\n| ${
        sectionRule("Other", 16, false)
      } |\n|   [ ] Charlie    |\n|       (disabled) |\n+------------------+\n`,
    ],
  ] as const;

  for (const [render, props, unicodeFrame, asciiFrame] of expected) {
    const renderFrame = render as Renderer<typeof props>;
    assertExactFrame(renderFrame(props, unicode), unicodeFrame, unicode);
    assertExactFrame(renderFrame(props, ascii), asciiFrame, ascii);
  }
});

const switchFrames = [
  "Automatic updates\n┌──────────────────────────┐\n│ × ●──○                   │\n└──────────────────────────┘\n",
  "Automatic updates\n┌──────────────────────────┐\n│ › × ●──○                 │\n└──────────────────────────┘\n",
  "Automatic updates\n┌──────────────────────────┐\n│   ○──● ✓                 │\n└──────────────────────────┘\n",
  "Automatic updates\n┌──────────────────────────┐\n│ › × ●──○                 │\n└──────────────────────────┘\n! Setting is locked",
  "Automatic updates\n┌──────────────────────────┐\n│ × ●──○                   │\n└──────────────────────────┘\nDisabled",
  "Automatic updates\n┌──────────────────────────┐\n│   ○──● ✓                 │\n└──────────────────────────┘\n✓ Submitted",
  "Automatic updates\n┌──────────────────────────┐\n│ × ●──○                   │\n└──────────────────────────┘\n× Change cancelled",
] as const;

Deno.test("Switch renders every static binary state exactly", () => {
  assertStateFrames(switchCliExamples, renderSwitchCli, switchFrames);
});

Deno.test("Switch covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    switchCliExamples,
    renderSwitchCli,
    [
      "Automatic updat…\n┌──────────────┐\n│   ○──● ✓     │\n└──────────────┘\n",
      switchFrames[2],
      "Automatic updates\n┌──────────────────────────────────────────────┐\n│   ○──● ✓                                     │\n└──────────────────────────────────────────────┘\n",
    ],
    switchFrames[1],
    "Automatic updates\n+--------------------------+\n| > x *--o                 |\n+--------------------------+\n",
  );
});

Deno.test("Switch renders only the active cross or tick in its semantic tone", () => {
  const capabilities = testTerminalCapabilities({
    columns: 28,
    colorDepth: "truecolor",
  });
  const theme = terminalThemes.dark;
  const props = {
    kind: "confirm" as const,
    label: "Automatic updates",
    yesLabel: "On",
    noLabel: "Off",
    lifecycle: { status: "active" as const },
    width: 28,
  };
  const off = renderSwitchCli(
    { ...props, value: false, presentation: "idle" },
    capabilities,
  );
  const on = renderSwitchCli(
    { ...props, value: true, presentation: "filled" },
    capabilities,
  );
  assertStringIncludes(
    off,
    styleText("×", { color: terminalToneColor(theme, "danger") }, capabilities),
  );
  assertStringIncludes(
    on,
    styleText(
      "✓",
      { color: terminalToneColor(theme, "success") },
      capabilities,
    ),
  );
  assertEquals(stripAnsi(off).includes("✓"), false);
  assertEquals(stripAnsi(on).includes("×"), false);
});

Deno.test("Switch keeps labelled and bare tracks inside every supported narrow frame", () => {
  for (let width = 8; width <= 15; width += 1) {
    const capabilities = testTerminalCapabilities({ columns: width });
    for (const labels of [{}, { yesLabel: "On", noLabel: "Off" }]) {
      for (const value of [false, true]) {
        const output = renderSwitchCli({
          kind: "confirm",
          label: "Automatic updates",
          value,
          ...labels,
          lifecycle: { status: "active" },
          width,
        }, capabilities);
        for (const line of output.split("\n")) {
          assert(measureText(line) <= width, stripAnsi(line));
        }
      }
    }
  }
});

Deno.test("choice navigation and selected markers use Token-derived accent while disabled text stays muted", () => {
  const theme = terminalThemes.dark;
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({
      colorDepth,
      columns: 32,
    });
    const selectedElsewhere = renderSelectCli({
      kind: "select",
      label: "Environment",
      lifecycle: { status: "active" },
      options: [
        { id: "alpha", label: "Alpha" },
        { id: "bravo", label: "Bravo" },
        { id: "disabled", label: "Disabled", disabled: true },
      ],
      highlightedIndex: 1,
      selectedId: "alpha",
      width: 32,
    }, capabilities);
    assertStringIncludes(
      selectedElsewhere,
      styleText("●", {
        color: terminalToneColor(theme, "accent"),
      }, capabilities),
    );
    assertStringIncludes(
      selectedElsewhere,
      styleText("Bravo", {
        ...theme.typography.strong,
        color: terminalToneColor(theme, "accent"),
      }, capabilities),
    );
    assertStringIncludes(
      selectedElsewhere,
      styleText("Disabled (disabled)", {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      }, capabilities),
    );

    const multiselect = renderCheckboxCli({
      kind: "multiselect",
      label: "Capabilities",
      lifecycle: { status: "active" },
      options: [
        { id: "render", label: "Render" },
        { id: "inspect", label: "Inspect" },
      ],
      highlightedIndex: 1,
      selectedIds: ["render"],
      width: 32,
    }, capabilities);
    assertStringIncludes(
      multiselect,
      styleText("✓", {
        color: terminalToneColor(theme, "accent"),
      }, capabilities),
    );
  }

  const plain = testTerminalCapabilities({ columns: 32 });
  assertStringIncludes(
    renderSelectCli({
      kind: "select",
      label: "Environment",
      lifecycle: { status: "active" },
      options: [
        { id: "alpha", label: "Alpha" },
        { id: "bravo", label: "Bravo", disabled: true },
      ],
      highlightedIndex: 0,
      selectedId: "alpha",
      width: 32,
    }, plain),
    "› [●] Alpha",
  );
  const ascii = testTerminalCapabilities({ columns: 32, unicode: false });
  assertStringIncludes(
    renderCheckboxCli({
      kind: "multiselect",
      label: "Capabilities",
      lifecycle: { status: "active" },
      options: [{ id: "render", label: "Render" }],
      highlightedIndex: 0,
      selectedIds: ["render"],
      width: 32,
    }, ascii),
    "> [x] Render",
  );
});

Deno.test("Switch keeps custom yes and no labels in fixed columns across values and states", () => {
  const base = {
    kind: "confirm" as const,
    label: "Deploy",
    yesLabel: "Proceed",
    noLabel: "Keep off",
    width: 32,
  };
  const states = [
    { lifecycle: { status: "active" as const } },
    {
      lifecycle: {
        status: "validation-error" as const,
        message: "Choose deliberately",
      },
    },
    { lifecycle: { status: "submitted" as const } },
    {
      lifecycle: { status: "active" as const },
      presentation: "disabled" as const,
    },
  ];
  for (const unicode of [true, false]) {
    for (
      const colorDepth of [
        "truecolor",
        "ansi256",
        "ansi16",
        "none",
      ] as const
    ) {
      const capabilities = testTerminalCapabilities({
        colorDepth,
        columns: 32,
        unicode,
      });
      for (const state of states) {
        const off = stripAnsi(renderSwitchCli({
          ...base,
          ...state,
          value: false,
        }, capabilities));
        const on = stripAnsi(renderSwitchCli({
          ...base,
          ...state,
          value: true,
        }, capabilities));
        const offControl = off.split("\n").find((line) =>
          line.includes("Keep off")
        ) ?? "";
        const onControl = on.split("\n").find((line) =>
          line.includes("Keep off")
        ) ?? "";
        assertStringIncludes(offControl, "Proceed");
        assertStringIncludes(onControl, "Proceed");
        assertEquals(offControl.length, onControl.length);
        assertEquals(
          offControl.indexOf("Keep off"),
          onControl.indexOf("Keep off"),
        );
        assertEquals(
          offControl.indexOf("Proceed"),
          onControl.indexOf("Proceed"),
        );
        assert(
          unicode
            ? offControl.includes("●──○") && onControl.includes("○──●")
            : offControl.includes("*--o") && onControl.includes("o--*"),
        );
      }
    }
  }
});

const textareaFrames = [
  "Release notes\n┌──────────────────────────┐\n│ Describe the change      │\n│                          │\n│                          │\n└──────────────────────────┘\n",
  "Release notes\n┌──────────────────────────┐\n│ ▌Describe the change     │\n│                          │\n│                          │\n└──────────────────────────┘\n",
  "Release notes\n┌──────────────────────────┐\n│ Adds reusable examples.  │\n│                          │\n│                          │\n└──────────────────────────┘\n",
  "Release notes\n┌──────────────────────────┐\n│ Short▌                   │\n│                          │\n│                          │\n└──────────────────────────┘\n! Add more detail",
  "Release notes\n┌──────────────────────────┐\n│ Managed by policy        │\n│                          │\n│                          │\n└──────────────────────────┘\nDisabled",
  "Release notes\n┌──────────────────────────┐\n│ Adds reusable examples.  │\n│                          │\n│                          │\n└──────────────────────────┘\n✓ Submitted",
  "Release notes\n┌──────────────────────────┐\n│ Describe the change      │\n│                          │\n│                          │\n└──────────────────────────┘\n× Draft discarded",
  "Release notes\n┌──────────────────────────┐\n│ Two                      │\n│ Three                    │\n│ Four                     │\n│ Five                     │\n│ Six                      │\n│ Seven▌                   │\n└──────────────────────────┘\n",
] as const;

Deno.test("Textarea renders idle through cancelled states exactly", () => {
  assertStateFrames(textareaCliExamples, renderTextareaCli, textareaFrames);
});

Deno.test("Textarea covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    textareaCliExamples,
    renderTextareaCli,
    [
      "Release notes\n┌──────────────┐\n│ Adds         │\n│ reusable     │\n│ examples.    │\n└──────────────┘\n",
      textareaFrames[2],
      "Release notes\n┌──────────────────────────────────────────────┐\n│ Adds reusable examples.                      │\n│                                              │\n│                                              │\n└──────────────────────────────────────────────┘\n",
    ],
    textareaFrames[1],
    "Release notes\n+--------------------------+\n| |Describe the change     |\n|                          |\n|                          |\n+--------------------------+\n",
  );
});

Deno.test("Input masks secret state without exposing its value", () => {
  const capabilities = testTerminalCapabilities({ columns: 24 });
  assertExactFrame(
    renderInputCli({
      kind: "masked-input",
      label: "Token",
      lifecycle: { status: "active" },
      valueLength: 4,
      cursor: 4,
      width: 24,
    }, capabilities),
    "Token\n┌──────────────────────┐\n│ ••••▌                │\n└──────────────────────┘\n",
    capabilities,
  );
});
