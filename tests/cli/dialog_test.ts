import { renderDialogCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const props = {
  title: "Confirm",
  body: "Continue now?",
  actions: ["No", "Yes"],
} as const;
const frames = {
  narrow:
    "┌ Confirm ───┐\n│ Continue   │\n│ now?       │\n│            │\n│ [No] [Yes] │\n└────────────┘",
  standard:
    "┌ Confirm ─────────────────┐\n│ Continue now?            │\n│                          │\n│ [No]  [Yes]              │\n└──────────────────────────┘",
  wide:
    "┌ Confirm ─────────────────────────────────────┐\n│ Continue now?                                │\n│                                              │\n│ [No]  [Yes]                                  │\n└──────────────────────────────────────────────┘",
} as const;

Deno.test("Dialog renders exact narrow, standard, and wide modal blocks", () => {
  for (
    const [columns, expected] of [[14, frames.narrow], [28, frames.standard], [
      48,
      frames.wide,
    ]] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderDialogCli({ ...props, width: columns }, capabilities),
      expected,
      capabilities,
    );
  }
});

Deno.test("Dialog preserves hierarchy across capability levels", () => {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 28 });
    assertStyledFrame(
      renderDialogCli({ ...props, width: 28 }, capabilities),
      frames.standard,
      capabilities,
    );
  }
  const capabilities = testTerminalCapabilities({
    columns: 28,
    unicode: false,
  });
  assertExactFrame(
    renderDialogCli({
      title: "Published",
      body: "The release is live.",
      status: "submitted",
      width: 28,
    }, capabilities),
    "+ Published ---------------+\n| The release is live.     |\n|                          |\n| OK Submitted             |\n+--------------------------+",
    capabilities,
  );
});
