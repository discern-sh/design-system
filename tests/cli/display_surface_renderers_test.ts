import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderCardCli,
  renderTerminalCli,
  renderWindowCli,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

function assertCapabilityLevels(
  render: (capabilities: TerminalCapabilities) => string,
  expectedUnicode: string,
  expectedAscii: string,
): void {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 24 });
    assertStyledFrame(render(capabilities), expectedUnicode, capabilities);
  }
  const plain = testTerminalCapabilities({ columns: 24 });
  assertExactFrame(render(plain), expectedUnicode, plain);
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(render(ascii), expectedAscii, ascii);
}

Deno.test("Card renders exact narrow, standard, wide, and ASCII boxes", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderCardCli(
      { title: "Note", body: "One two three", width: capabilities.columns },
      capabilities,
    );
  const frames = [
    [
      12,
      "┌ Note ────┐\n│ One two  │\n│ three    │\n└──────────┘",
    ],
    [
      24,
      "┌ Note ────────────────┐\n│ One two three        │\n└──────────────────────┘",
    ],
    [
      40,
      "┌ Note ────────────────────────────────┐\n│ One two three                        │\n└──────────────────────────────────────┘",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(
    render,
    "┌ Note ────────────────┐\n│ One two three        │\n└──────────────────────┘",
    "+ Note ----------------+\n| One two three        |\n+----------------------+",
  );
});

Deno.test("Window renders exact narrow, standard, wide, and degraded motif frames", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderWindowCli(
      {
        title: "Preview",
        body: "Product interface",
        width: capabilities.columns,
      },
      capabilities,
    );
  const frames = [
    [
      12,
      "┌ ◮⧩◭ P… ──┐\n│ Product  │\n│ interfac │\n│ e        │\n└──────────┘",
    ],
    [
      24,
      "┌ ◮⧩◭ Preview ─────────┐\n│ Product interface    │\n└──────────────────────┘",
    ],
    [
      40,
      "┌ ◮⧩◭ Preview ─────────────────────────┐\n│ Product interface                    │\n└──────────────────────────────────────┘",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(
    render,
    "┌ ◮⧩◭ Preview ─────────┐\n│ Product interface    │\n└──────────────────────┘",
    "+ >v^ Preview ---------+\n| Product interface    |\n+----------------------+",
  );
});

Deno.test("Terminal renders exact narrow, standard, wide, and degraded session frames", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderTerminalCli(
      { title: "Shell", body: "$ verify\npassed", width: capabilities.columns },
      capabilities,
    );
  const frames = [
    [
      12,
      "┌ ⧨◭⧩ S… ──┐\n│ $ verify │\n│ passed   │\n└──────────┘",
    ],
    [
      24,
      "┌ ⧨◭⧩ Shell ───────────┐\n│ $ verify             │\n│ passed               │\n└──────────────────────┘",
    ],
    [
      40,
      "┌ ⧨◭⧩ Shell ───────────────────────────┐\n│ $ verify                             │\n│ passed                               │\n└──────────────────────────────────────┘",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(
    render,
    "┌ ⧨◭⧩ Shell ───────────┐\n│ $ verify             │\n│ passed               │\n└──────────────────────┘",
    "+ <^v Shell -----------+\n| $ verify             |\n| passed               |\n+----------------------+",
  );
});
