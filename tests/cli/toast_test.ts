import { renderToastCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const frames = {
  narrow: "┌ Success ───┐\n│ Saved.  ×  │\n└────────────┘",
  standard:
    "┌ Success ─────────────────┐\n│ Saved.  ×                │\n└──────────────────────────┘",
  wide:
    "┌ Success ─────────────────────────────────────┐\n│ Saved.  ×                                    │\n└──────────────────────────────────────────────┘",
} as const;

Deno.test("Toast renders exact narrow, standard, and wide notifications", () => {
  for (
    const [columns, expected] of [[14, frames.narrow], [28, frames.standard], [
      48,
      frames.wide,
    ]] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderToastCli({
        message: "Saved.",
        tone: "success",
        dismissible: true,
        width: columns,
      }, capabilities),
      expected,
      capabilities,
    );
  }
});

Deno.test("Toast preserves semantic tone through every capability level", () => {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 28 });
    assertStyledFrame(
      renderToastCli({
        message: "Saved.",
        tone: "success",
        dismissible: true,
        width: 28,
      }, capabilities),
      frames.standard,
      capabilities,
    );
  }
  const capabilities = testTerminalCapabilities({
    columns: 20,
    unicode: false,
  });
  assertExactFrame(
    renderToastCli({
      message: "Saved.",
      tone: "success",
      dismissible: true,
      width: 20,
    }, capabilities),
    "+ Success ---------+\n| Saved.  x        |\n+------------------+",
    capabilities,
  );
});
