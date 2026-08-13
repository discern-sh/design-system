import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { CliExample } from "../../src/cli/contracts.ts";
import {
  checkboxCliExamples,
  fieldCliExamples,
  inputCliExamples,
  radioCliExamples,
  renderCheckboxCli,
  renderFieldCli,
  renderInputCli,
  renderRadioCli,
  renderSelectCli,
  renderSwitchCli,
  renderTextareaCli,
  selectCliExamples,
  switchCliExamples,
  textareaCliExamples,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

interface WidthProps {
  readonly width?: number;
}

type Renderer<Props> = (
  props: Readonly<Props>,
  capabilities: TerminalCapabilities,
) => string;

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
  const capabilities = testCapabilities({ columns: 28 });
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
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      render(withWidth(filled.props, columns), capabilities),
      widths[index] ?? "",
      capabilities,
    );
  }
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 28 });
    assertStyledFrame(
      render(withWidth(active.props, 28), capabilities),
      activePlaintext,
      capabilities,
    );
  }
  const capabilities = testCapabilities({ columns: 28, unicode: false });
  assertExactFrame(
    render(withWidth(active.props, 28), capabilities),
    ascii,
    capabilities,
  );
}

const checkboxFrames = [
  "Include examples [idle]\n┌──────────────────────────┐\n│[ ] Not included          │\n└──────────────────────────┘",
  "Include examples [active]\n┌──────────────────────────┐\n│› [ ] Not included        │\n└──────────────────────────┘",
  "Include examples [filled]\n┌──────────────────────────┐\n│[✓] Included              │\n└──────────────────────────┘",
  "Include examples [error]\n┌──────────────────────────┐\n│› [ ] Not included        │\n└──────────────────────────┘\n! Choose before continuing",
  "Include examples [disabled]\n┌──────────────────────────┐\n│[ ] Not included          │\n└──────────────────────────┘\nDisabled",
  "Include examples [submitted]\n┌──────────────────────────┐\n│[✓] Included              │\n└──────────────────────────┘\n✓ Submitted",
  "Include examples [cancelled]\n┌──────────────────────────┐\n│[ ] Not included          │\n└──────────────────────────┘\n× Choice cancelled",
  "Capabilities [active]\n┌──────────────────────────┐\n│◮⧩◭⧨◮⧩◭⧨◮⧩ Core ⧩◮⧨◭⧩◮⧨◭⧩◮│\n│› [✓] Render frames       │\n│[ ] Inspect output        │\n│(disabled)                │\n│◮⧩◭⧨◮⧩◭⧨ Optional ⧨◭⧩◮⧨◭⧩◮│\n│[ ] Animate progress      │\n└──────────────────────────┘",
] as const;

Deno.test("Checkbox renders every static form state exactly", () => {
  assertStateFrames(checkboxCliExamples, renderCheckboxCli, checkboxFrames);
});

Deno.test("Checkbox covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    checkboxCliExamples,
    renderCheckboxCli,
    [
      "Include example…\n┌──────────────┐\n│[✓] Included  │\n└──────────────┘",
      checkboxFrames[2],
      "Include examples [filled]\n┌──────────────────────────────────────────────┐\n│[✓] Included                                  │\n└──────────────────────────────────────────────┘",
    ],
    checkboxFrames[1],
    "Include examples [active]\n+--------------------------+\n|> [ ] Not included        |\n+--------------------------+",
  );
});

const fieldFrames = [
  "Environment [idle]\n┌──────────────────────────┐\n│Choose a value            │\n└──────────────────────────┘",
  "Environment [active]\n┌──────────────────────────┐\n│staging                   │\n└──────────────────────────┘\nUse a configured environment",
  "Environment [filled]\n┌──────────────────────────┐\n│staging                   │\n└──────────────────────────┘",
  "Environment [error]\n┌──────────────────────────┐\n│staging                   │\n└──────────────────────────┘\n! Environment is unavailable",
  "Environment [disabled]\n┌──────────────────────────┐\n│staging                   │\n└──────────────────────────┘\nDisabled",
  "Environment [submitted]\n┌──────────────────────────┐\n│staging                   │\n└──────────────────────────┘\n✓ Submitted",
  "Environment [cancelled]\n┌──────────────────────────┐\n│staging                   │\n└──────────────────────────┘\n× Selection cancelled",
] as const;

Deno.test("Field renders every static form state exactly", () => {
  assertStateFrames(fieldCliExamples, renderFieldCli, fieldFrames);
});

Deno.test("Field covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    fieldCliExamples,
    renderFieldCli,
    [
      "Environment [fi…\n┌──────────────┐\n│staging       │\n└──────────────┘",
      fieldFrames[2],
      "Environment [filled]\n┌──────────────────────────────────────────────┐\n│staging                                       │\n└──────────────────────────────────────────────┘",
    ],
    fieldFrames[1],
    "Environment [active]\n+--------------------------+\n|staging                   |\n+--------------------------+\nUse a configured environment",
  );
});

const inputFrames = [
  "Project name [idle]\n┌──────────────────────────┐\n│my-project                │\n└──────────────────────────┘",
  "Project name [active]\n┌──────────────────────────┐\n│▌my-project               │\n└──────────────────────────┘",
  "Project name [filled]\n┌──────────────────────────┐\n│atlas                     │\n└──────────────────────────┘",
  "Project name [error]\n┌──────────────────────────┐\n│a▌                        │\n└──────────────────────────┘\n! Use at least three charac…",
  "Project name [disabled]\n┌──────────────────────────┐\n│atlas                     │\n└──────────────────────────┘\nDisabled",
  "Project name [submitted]\n┌──────────────────────────┐\n│atlas                     │\n└──────────────────────────┘\n✓ Submitted",
  "Project name [cancelled]\n┌──────────────────────────┐\n│my-project                │\n└──────────────────────────┘\n× Input cancelled",
] as const;

Deno.test("Input renders idle through cancelled states exactly", () => {
  assertStateFrames(inputCliExamples, renderInputCli, inputFrames);
});

Deno.test("Input covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    inputCliExamples,
    renderInputCli,
    [
      "Project name [f…\n┌──────────────┐\n│atlas         │\n└──────────────┘",
      inputFrames[2],
      "Project name [filled]\n┌──────────────────────────────────────────────┐\n│atlas                                         │\n└──────────────────────────────────────────────┘",
    ],
    inputFrames[1],
    "Project name [active]\n+--------------------------+\n||my-project               |\n+--------------------------+",
  );
});

const radioFrames = [
  "Channel [idle]\n┌──────────────────────────┐\n│○ Alpha                   │\n│○ Bravo                   │\n│○ Charlie (disabled)      │\n└──────────────────────────┘",
  "Channel [active]\n┌──────────────────────────┐\n│○ Alpha                   │\n│› ○ Bravo                 │\n│○ Charlie (disabled)      │\n└──────────────────────────┘",
  "Channel [filled]\n┌──────────────────────────┐\n│○ Alpha                   │\n│◉ Bravo                   │\n│○ Charlie (disabled)      │\n└──────────────────────────┘",
  "Channel [error]\n┌──────────────────────────┐\n│› ○ Alpha                 │\n│○ Bravo                   │\n│○ Charlie (disabled)      │\n└──────────────────────────┘\n! Choose a channel",
  "Channel [disabled]\n┌──────────────────────────┐\n│◉ Alpha                   │\n│○ Bravo                   │\n│○ Charlie (disabled)      │\n└──────────────────────────┘\nDisabled",
  "Channel [submitted]\n┌──────────────────────────┐\n│○ Alpha                   │\n│◉ Bravo                   │\n│○ Charlie (disabled)      │\n└──────────────────────────┘\n✓ Submitted",
  "Channel [cancelled]\n┌──────────────────────────┐\n│○ Alpha                   │\n│○ Bravo                   │\n│○ Charlie (disabled)      │\n└──────────────────────────┘\n× Selection cancelled",
  "Channel [active]\n┌──────────────────────────┐\n│◮⧩◭⧨◮⧩◭⧨◮ Stable ◮⧨◭⧩◮⧨◭⧩◮│\n│○ Alpha                   │\n│› ◉ Bravo                 │\n│◮⧩◭⧨◮⧩◭⧨ Preview ⧨◭⧩◮⧨◭⧩◮⧨│\n│○ Charlie (disabled)      │\n└──────────────────────────┘",
] as const;

Deno.test("Radio renders every static selection state exactly", () => {
  assertStateFrames(radioCliExamples, renderRadioCli, radioFrames);
});

Deno.test("Radio covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    radioCliExamples,
    renderRadioCli,
    [
      "Channel [filled]\n┌──────────────┐\n│○ Alpha       │\n│◉ Bravo       │\n│○ Charlie     │\n│(disabled)    │\n└──────────────┘",
      radioFrames[2],
      "Channel [filled]\n┌──────────────────────────────────────────────┐\n│○ Alpha                                       │\n│◉ Bravo                                       │\n│○ Charlie (disabled)                          │\n└──────────────────────────────────────────────┘",
    ],
    radioFrames[1],
    "Channel [active]\n+--------------------------+\n|( ) Alpha                 |\n|> ( ) Bravo               |\n|( ) Charlie (disabled)    |\n+--------------------------+",
  );
});

const selectFrames = [
  "Environment [idle]\n┌──────────────────────────┐\n│Choose an environment ⌄   │\n└──────────────────────────┘",
  "Environment [active]\n┌──────────────────────────┐\n│[ ] Alpha                 │\n│› [ ] Bravo               │\n│[ ] Charlie (disabled)    │\n└──────────────────────────┘",
  "Environment [filled]\n┌──────────────────────────┐\n│Bravo ⌄                   │\n└──────────────────────────┘",
  "Environment [error]\n┌──────────────────────────┐\n│› [ ] Alpha               │\n│[ ] Bravo                 │\n│[ ] Charlie (disabled)    │\n└──────────────────────────┘\n! Choose an environment",
  "Environment [disabled]\n┌──────────────────────────┐\n│Alpha ⌄                   │\n└──────────────────────────┘\nDisabled",
  "Environment [submitted]\n┌──────────────────────────┐\n│Bravo ⌄                   │\n└──────────────────────────┘\n✓ Submitted",
  "Environment [cancelled]\n┌──────────────────────────┐\n│Choose an option ⌄        │\n└──────────────────────────┘\n× Selection cancelled",
  "Environment [active]\n┌──────────────────────────┐\n│◮⧩◭⧨◮⧩ Recommended ⧩◮⧨◭⧩◮⧨│\n│[ ] Alpha                 │\n│› [●] Bravo               │\n│◮⧩◭⧨◮⧩◭⧨◮ Other ◮⧨◭⧩◮⧨◭⧩◮⧨│\n│[ ] Charlie (disabled)    │\n└──────────────────────────┘",
] as const;

Deno.test("Select renders every static selection state exactly", () => {
  assertStateFrames(selectCliExamples, renderSelectCli, selectFrames);
});

Deno.test("Select covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    selectCliExamples,
    renderSelectCli,
    [
      "Environment [fi…\n┌──────────────┐\n│Bravo ⌄       │\n└──────────────┘",
      selectFrames[2],
      "Environment [filled]\n┌──────────────────────────────────────────────┐\n│Bravo ⌄                                       │\n└──────────────────────────────────────────────┘",
    ],
    selectFrames[1],
    "Environment [active]\n+--------------------------+\n|[ ] Alpha                 |\n|> [ ] Bravo               |\n|[ ] Charlie (disabled)    |\n+--------------------------+",
  );
});

Deno.test("grouped Select, Checkbox, and Radio retain structure in narrow ASCII frames", () => {
  const checkbox = checkboxCliExamples.find(({ name }) => name === "grouped");
  const radio = radioCliExamples.find(({ name }) => name === "grouped");
  const select = selectCliExamples.find(({ name }) => name === "grouped");
  if (checkbox === undefined || radio === undefined || select === undefined) {
    throw new TypeError("grouped form examples must remain enrolled");
  }
  const unicode = testCapabilities({ columns: 20 });
  const ascii = testCapabilities({ columns: 20, unicode: false });
  const expected = [
    [
      renderCheckboxCli,
      { ...checkbox.props, width: 20 },
      "Capabilities [activ…\n┌──────────────────┐\n│◮⧩◭⧨◮⧩ Core ⧩◮⧨◭⧩◮│\n│› [✓] Render      │\n│frames            │\n│[ ] Inspect output│\n│(disabled)        │\n│◮⧩◭⧨ Optional ⧨◭⧩◮│\n│[ ] Animate       │\n│progress          │\n└──────────────────┘",
      "Capabilities [activ.\n+------------------+\n|>v^<>v Core v><^v>|\n|> [x] Render      |\n|frames            |\n|[ ] Inspect output|\n|(disabled)        |\n|>v^< Optional <^v>|\n|[ ] Animate       |\n|progress          |\n+------------------+",
    ],
    [
      renderRadioCli,
      { ...radio.props, width: 20 },
      "Channel [active]\n┌──────────────────┐\n│◮⧩◭⧨◮ Stable ◮⧨◭⧩◮│\n│○ Alpha           │\n│› ◉ Bravo         │\n│◮⧩◭⧨ Preview ⧨◭⧩◮⧨│\n│○ Charlie         │\n│(disabled)        │\n└──────────────────┘",
      "Channel [active]\n+------------------+\n|>v^<> Stable ><^v>|\n|( ) Alpha         |\n|> (*) Bravo       |\n|>v^< Preview <^v><|\n|( ) Charlie       |\n|(disabled)        |\n+------------------+",
    ],
    [
      renderSelectCli,
      { ...select.props, width: 20 },
      "Environment [active]\n┌──────────────────┐\n│◮⧩ Recommended ⧩◮⧨│\n│[ ] Alpha         │\n│› [●] Bravo       │\n│◮⧩◭⧨◮ Other ◮⧨◭⧩◮⧨│\n│[ ] Charlie       │\n│(disabled)        │\n└──────────────────┘",
      "Environment [active]\n+------------------+\n|>v Recommended v><|\n|[ ] Alpha         |\n|> [*] Bravo       |\n|>v^<> Other ><^v><|\n|[ ] Charlie       |\n|(disabled)        |\n+------------------+",
    ],
  ] as const;

  for (const [render, props, unicodeFrame, asciiFrame] of expected) {
    const renderFrame = render as Renderer<typeof props>;
    assertExactFrame(renderFrame(props, unicode), unicodeFrame, unicode);
    assertExactFrame(renderFrame(props, ascii), asciiFrame, ascii);
  }
});

const switchFrames = [
  "Automatic updates [idle]\n┌──────────────────────────┐\n│OFF ●▶ Off               │\n└──────────────────────────┘",
  "Automatic updates [active]\n┌──────────────────────────┐\n│› OFF ●▶ Off             │\n└──────────────────────────┘",
  "Automatic updates [filled]\n┌──────────────────────────┐\n│◀● ON On                 │\n└──────────────────────────┘",
  "Automatic updates [error]\n┌──────────────────────────┐\n│› OFF ●▶ Off             │\n└──────────────────────────┘\n! Setting is locked",
  "Automatic updates [disabled]\n┌──────────────────────────┐\n│OFF ●▶ Off               │\n└──────────────────────────┘\nDisabled",
  "Automatic updates [submitte…\n┌──────────────────────────┐\n│◀● ON On                 │\n└──────────────────────────┘\n✓ Submitted",
  "Automatic updates [cancelle…\n┌──────────────────────────┐\n│OFF ●▶ Off               │\n└──────────────────────────┘\n× Change cancelled",
] as const;

Deno.test("Switch renders every static binary state exactly", () => {
  assertStateFrames(switchCliExamples, renderSwitchCli, switchFrames);
});

Deno.test("Switch covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    switchCliExamples,
    renderSwitchCli,
    [
      "Automatic updat…\n┌──────────────┐\n│◀● ON On     │\n└──────────────┘",
      switchFrames[2],
      "Automatic updates [filled]\n┌──────────────────────────────────────────────┐\n│◀● ON On                                     │\n└──────────────────────────────────────────────┘",
    ],
    switchFrames[1],
    "Automatic updates [active]\n+--------------------------+\n|> [ OFF] Off              |\n+--------------------------+",
  );
});

const textareaFrames = [
  "Release notes [idle]\n┌──────────────────────────┐\n│Describe the change       │\n│                          │\n│                          │\n└──────────────────────────┘",
  "Release notes [active]\n┌──────────────────────────┐\n│▌Describe the change      │\n│                          │\n│                          │\n└──────────────────────────┘",
  "Release notes [filled]\n┌──────────────────────────┐\n│Adds CLI frames.          │\n│                          │\n│                          │\n└──────────────────────────┘",
  "Release notes [error]\n┌──────────────────────────┐\n│Short▌                    │\n│                          │\n│                          │\n└──────────────────────────┘\n! Add more detail",
  "Release notes [disabled]\n┌──────────────────────────┐\n│Managed by policy         │\n│                          │\n│                          │\n└──────────────────────────┘\nDisabled",
  "Release notes [submitted]\n┌──────────────────────────┐\n│Adds CLI frames.          │\n│                          │\n│                          │\n└──────────────────────────┘\n✓ Submitted",
  "Release notes [cancelled]\n┌──────────────────────────┐\n│Describe the change       │\n│                          │\n│                          │\n└──────────────────────────┘\n× Draft discarded",
] as const;

Deno.test("Textarea renders idle through cancelled states exactly", () => {
  assertStateFrames(textareaCliExamples, renderTextareaCli, textareaFrames);
});

Deno.test("Textarea covers narrow, standard, wide, colour, and ASCII frames", () => {
  assertWidthsAndCapabilities(
    textareaCliExamples,
    renderTextareaCli,
    [
      "Release notes […\n┌──────────────┐\n│Adds CLI      │\n│frames.       │\n│              │\n└──────────────┘",
      textareaFrames[2],
      "Release notes [filled]\n┌──────────────────────────────────────────────┐\n│Adds CLI frames.                              │\n│                                              │\n│                                              │\n└──────────────────────────────────────────────┘",
    ],
    textareaFrames[1],
    "Release notes [active]\n+--------------------------+\n||Describe the change      |\n|                          |\n|                          |\n+--------------------------+",
  );
});

Deno.test("Input masks secret state without exposing its value", () => {
  const capabilities = testCapabilities({ columns: 24 });
  assertExactFrame(
    renderInputCli({
      kind: "masked-input",
      label: "Token",
      lifecycle: { status: "active" },
      valueLength: 4,
      cursor: 4,
      width: 24,
    }, capabilities),
    "Token [active]\n┌──────────────────────┐\n│••••▌                 │\n└──────────────────────┘",
    capabilities,
  );
});
