import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderButtonCli,
  renderIconButtonCli,
  renderThemeToggleCli,
} from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

function assertCapabilityLevels(
  render: (capabilities: TerminalCapabilities) => string,
  expectedUnicode: string,
  expectedAscii: string,
): void {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 24 });
    assertStyledFrame(render(capabilities), expectedUnicode, capabilities);
  }
  const plain = testCapabilities({ columns: 24 });
  assertExactFrame(render(plain), expectedUnicode, plain);
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(render(ascii), expectedAscii, ascii);
}

Deno.test("Button renders exact narrow, standard, wide, and colour-degraded actions", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderButtonCli({ label: "Continue" }, capabilities);
  for (
    const [columns, expected] of [
      [8, "[  C…  ]"],
      [24, "[  Continue  ]"],
      [48, "[  Continue  ]"],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(render, "[  Continue  ]", "[  Continue  ]");
});

Deno.test("Icon button renders exact narrow, standard, wide, and ASCII actions", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderIconButtonCli(
      { icon: "✦", asciiIcon: "*", label: "Generate", variant: "outline" },
      capabilities,
    );
  for (
    const [columns, expected] of [
      [8, "[ ✦ G… ]"],
      [24, "[ ✦ Generate ]"],
      [48, "[ ✦ Generate ]"],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(render, "[ ✦ Generate ]", "[ * Generate ]");
});

Deno.test("Theme toggle renders exact narrow, standard, wide, and degraded destination actions", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderThemeToggleCli({ theme: "dark" }, capabilities);
  for (
    const [columns, expected] of [
      [8, "[ ☀ … ]"],
      [24, "[ ☀ Switch to the li… ]"],
      [48, "[ ☀ Switch to the light theme ]"],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(
    render,
    "[ ☀ Switch to the li… ]",
    "[ * Switch to the lig. ]",
  );
});
