import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderBrandCli,
  renderIconCli,
  renderLogoCli,
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
    const capabilities = testCapabilities({ colorDepth, columns: 20 });
    assertStyledFrame(render(capabilities), expectedUnicode, capabilities);
  }
  const plain = testCapabilities({ columns: 20 });
  assertExactFrame(render(plain), expectedUnicode, plain);
  const ascii = testCapabilities({ columns: 20, unicode: false });
  assertExactFrame(render(ascii), expectedAscii, ascii);
}

Deno.test("Icon renders exact narrow, standard, wide, and degraded glyph frames", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderIconCli({ glyph: "spark", label: "Generate" }, capabilities);
  for (
    const [columns, expected] of [
      [8, "✦ Gener…"],
      [20, "✦ Generate"],
      [40, "✦ Generate"],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(render, "✦ Generate", "* Generate");
});

Deno.test("Logo renders exact narrow, standard, wide, and degraded wordmarks", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderLogoCli({ text: "discern" }, capabilities);
  for (
    const [columns, expected] of [
      [8, "◮⧩ disc…"],
      [20, "◮⧩ discern"],
      [40, "◮⧩ discern"],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(render, "◮⧩ discern", ">v discern");
});

Deno.test("Brand renders exact narrow, standard, wide, and degraded lockups", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderBrandCli({
      name: "discern",
      tagline: "Tools that remember the rules",
    }, capabilities);
  for (
    const [columns, expected] of [
      [8, "◮⧩ disc…\nTools t…"],
      [20, "◮⧩ discern\nTools that remember…"],
      [40, "◮⧩ discern\nTools that remember the rules"],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  assertCapabilityLevels(
    render,
    "◮⧩ discern\nTools that remember…",
    ">v discern\nTools that remember.",
  );
});
