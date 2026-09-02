import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { oklchToSrgb } from "../../src/internal/oklch.ts";
import {
  baseTokens,
  evaluateOpaqueField,
  fieldColorRoleLaws,
  themeTokens,
} from "../../src/tokens/tokens.ts";
import {
  deriveTerminalTheme,
  terminalThemeColor,
  terminalThemes,
} from "../../src/cli/theme.ts";

Deno.test("terminal palettes enroll every authored semantic colour Token", () => {
  const expected = themeTokens.filter((token) => token.category === "Color")
    .map((token) => token.name).toSorted();
  assertEquals(Object.keys(terminalThemes.light.colors).toSorted(), expected);
  assertEquals(Object.keys(terminalThemes.dark.colors).toSorted(), expected);
  assertNotEquals(
    terminalThemeColor(terminalThemes.light, "--discern-color-canvas"),
    terminalThemeColor(terminalThemes.dark, "--discern-color-canvas"),
  );
});

Deno.test("truecolour values carry computed 256- and 16-colour fallbacks", () => {
  for (const variant of ["light", "dark"] as const) {
    const derived = deriveTerminalTheme(variant);
    for (const color of Object.values(derived.colors)) {
      assert(color.red >= 0 && color.red <= 255);
      assert(color.green >= 0 && color.green <= 255);
      assert(color.blue >= 0 && color.blue <= 255);
      assert(color.ansi256 >= 0 && color.ansi256 <= 255);
      assert(color.ansi16 >= 0 && color.ansi16 <= 15);
    }
  }
});

Deno.test("terminal field colours are opaque pole evaluations without the blue preset", () => {
  for (const [variant, darkness] of [["light", 0], ["dark", 1]] as const) {
    const field = evaluateOpaqueField({ darkness });
    for (const law of fieldColorRoleLaws) {
      const match = field[law.name].match(
        /^oklch\(([\d.]+)%\s+([\d.]+)\s+(-?[\d.]+)\)$/,
      );
      assert(match !== null, `${variant} ${law.name} retained alpha`);
      const expected = oklchToSrgb(
        Number(match[1]) / 100,
        Number(match[2]),
        Number(match[3]),
      );
      const actual = terminalThemes[variant].colors[law.name];
      assert(actual !== undefined);
      assertEquals(
        { red: actual.red, green: actual.green, blue: actual.blue },
        expected,
      );
    }
  }
});

Deno.test("terminal spacing and type roles derive from base Token metadata", () => {
  const spacingTokens = baseTokens.filter((token) =>
    token.name.startsWith("--discern-space-")
  );
  const cellPixels = Number.parseFloat(
    baseTokens.find((token) => token.name === "--discern-space-2")?.value ??
      "0",
  );
  for (const token of spacingTokens) {
    assertEquals(
      terminalThemes.light.spacing[token.name as `--discern-space-${string}`],
      Math.max(1, Math.round(Number.parseFloat(token.value) / cellPixels)),
    );
  }
  assertEquals(terminalThemes.dark.typography.strong, { bold: true });
  assertEquals(terminalThemes.dark.typography.display, { bold: true });
  assertEquals(terminalThemes.dark.typography.muted, { dim: true });
  assertEquals(terminalThemes.dark.typography.emphasis, { italic: true });
});
