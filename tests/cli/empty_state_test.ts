import { renderEmptyStateCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const props = {
  title: "No items",
  description: "Create one.",
  action: "Create",
} as const;
const frames = {
  narrow:
    "┌ Empty ─────┐\n│ ◇ No items │\n│            │\n│ Create     │\n│ one.       │\n│            │\n│ → Create   │\n└────────────┘",
  standard:
    "┌ Empty ───────────────────┐\n│ ◇ No items               │\n│                          │\n│ Create one.              │\n│                          │\n│ → Create                 │\n└──────────────────────────┘",
  wide:
    "┌ Empty ───────────────────────────────────────┐\n│ ◇ No items                                   │\n│                                              │\n│ Create one.                                  │\n│                                              │\n│ → Create                                     │\n└──────────────────────────────────────────────┘",
} as const;

Deno.test("Empty state renders exact narrow, standard, and wide placeholders", () => {
  for (
    const [columns, expected] of [[14, frames.narrow], [28, frames.standard], [
      48,
      frames.wide,
    ]] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderEmptyStateCli({ ...props, width: columns }, capabilities),
      expected,
      capabilities,
    );
  }
});

Deno.test("Empty state degrades its mark and action intentionally", () => {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 28 });
    assertStyledFrame(
      renderEmptyStateCli({ ...props, width: 28 }, capabilities),
      frames.standard,
      capabilities,
    );
  }
  const capabilities = testTerminalCapabilities({
    columns: 20,
    unicode: false,
  });
  assertExactFrame(
    renderEmptyStateCli(
      { title: "No items", action: "Create", width: 20 },
      capabilities,
    ),
    "+ Empty -----------+\n| * No items       |\n|                  |\n| -> Create        |\n+------------------+",
    capabilities,
  );
});
