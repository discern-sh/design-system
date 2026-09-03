import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import { oklchToSrgb } from "../../src/internal/oklch.ts";
import {
  appearanceColorRoleLaws,
  baseTokens,
  evaluateOpaqueAppearance,
  themeTokens,
} from "../../src/tokens/tokens.ts";
import {
  deriveTerminalTheme,
  resolveTerminalTheme,
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
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

Deno.test("only categorical series colours bypass the appearance evaluator", () => {
  const appearanceRoles = new Set(
    appearanceColorRoleLaws.map(({ name }) => name),
  );
  const independentRoles = themeTokens
    .filter((token) =>
      token.category === "Color" && !appearanceRoles.has(token.name)
    )
    .map(({ name }) => name)
    .toSorted();
  assertEquals(independentRoles, [
    "--discern-color-series-1",
    "--discern-color-series-2",
    "--discern-color-series-3",
    "--discern-color-series-4",
    "--discern-color-series-5",
    "--discern-color-series-6",
  ]);

  for (const variant of ["light", "dark"] as const) {
    const accent = resolveTerminalTheme({
      theme: variant,
      appearance: { accent: 137.5 },
    });
    for (const name of independentRoles) {
      assertEquals(
        accent.colors[name],
        terminalThemes[variant].colors[name],
        `${variant} ${name} must keep ADR 0032's fixed projection`,
      );
    }
  }
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
    const field = evaluateOpaqueAppearance({ darkness });
    for (const law of appearanceColorRoleLaws) {
      const value = field[law.name];
      assert(value !== undefined, `${variant} ${law.name} was not evaluated`);
      const match = value.match(
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

Deno.test("terminal palette authority projects the complete Accent hue domain", () => {
  const hues = [
    ...Array.from({ length: 361 }, (_, hue) => hue),
    0.25,
    74.5,
    151.75,
    335.5,
    359.75,
  ];
  for (const [variant, darkness] of [["light", 0], ["dark", 1]] as const) {
    for (const hue of hues) {
      const appearance = { accent: hue };
      const expected = evaluateOpaqueAppearance({ darkness, ...appearance });
      const actual = resolveTerminalTheme({ theme: variant, appearance });
      for (const law of appearanceColorRoleLaws) {
        const value = expected[law.name];
        assert(value !== undefined, `${law.name} was not evaluated`);
        const match = value.match(
          /^oklch\(([\d.]+)%\s+([\d.]+)\s+(-?[\d.]+)\)$/,
        );
        assert(match !== null, `${variant} ${hue} ${law.name} retained alpha`);
        const rgb = oklchToSrgb(
          Number(match[1]) / 100,
          Number(match[2]),
          Number(match[3]),
        );
        assertEquals(
          {
            red: actual.colors[law.name]?.red,
            green: actual.colors[law.name]?.green,
            blue: actual.colors[law.name]?.blue,
          },
          rgb,
          `${variant} Accent(${hue}) ${law.name}`,
        );
      }
    }
  }
});

Deno.test("Accent semantic roles keep the strongest finite-palette distinction", () => {
  const expected = {
    light: {
      ansi256: { accent: 5, success: 22, warning: 94, danger: 88 },
      ansi16: { accent: 5, success: 2, warning: 3, danger: 1 },
    },
    dark: {
      ansi256: { accent: 218, success: 151, warning: 222, danger: 210 },
      ansi16: { accent: 13, success: 10, warning: 11, danger: 9 },
    },
  } as const;
  for (const variant of ["light", "dark"] as const) {
    const palette = resolveTerminalTheme({
      theme: variant,
      appearance: { accent: 335 },
    });
    for (const tone of ["accent", "success", "warning", "danger"] as const) {
      const color = terminalToneColor(palette, tone);
      assertEquals(color.ansi256, expected[variant].ansi256[tone]);
      assertEquals(color.ansi16, expected[variant].ansi16[tone]);
    }
    assertEquals(
      new Set(
        (["success", "warning", "danger"] as const).map((tone) =>
          terminalToneColor(palette, tone).ansi256
        ),
      ).size,
      3,
    );
    assertEquals(
      new Set(
        (["success", "warning", "danger"] as const).map((tone) =>
          terminalToneColor(palette, tone).ansi16
        ),
      ).size,
      3,
    );
  }
});

Deno.test("finite-palette collisions stay local to matching semantic hue families", () => {
  const cases = [
    { hue: 28, variant: "light", depth: "ansi16", tone: "danger" },
    { hue: 28, variant: "dark", depth: "ansi16", tone: "danger" },
    { hue: 74, variant: "light", depth: "ansi256", tone: "warning" },
    { hue: 74, variant: "dark", depth: "ansi16", tone: "warning" },
    { hue: 152, variant: "light", depth: "ansi256", tone: "success" },
    { hue: 152, variant: "light", depth: "ansi16", tone: "success" },
    { hue: 152, variant: "dark", depth: "ansi16", tone: "success" },
  ] as const;
  for (const { hue, variant, depth, tone } of cases) {
    const palette = resolveTerminalTheme({
      theme: variant,
      appearance: { accent: hue },
    });
    assertEquals(
      terminalToneColor(palette, "accent")[depth],
      terminalToneColor(palette, tone)[depth],
      `${variant} Accent(${hue}) should share ${tone}'s ${depth} family`,
    );
  }
});

Deno.test("terminal appearance defaults to cached Field poles and validates Accent", () => {
  assertStrictEquals(resolveTerminalTheme(), terminalThemes.dark);
  assertStrictEquals(
    resolveTerminalTheme({ theme: "light", appearance: {} }),
    terminalThemes.light,
  );
  assertEquals(
    resolveTerminalTheme({ appearance: { accent: 360 } }).colors,
    resolveTerminalTheme({ appearance: { accent: 0 } }).colors,
  );
  for (const hue of [-0.01, 360.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertThrows(
      () =>
        resolveTerminalTheme({
          appearance: { accent: hue },
        }),
      TypeError,
      "outside the finite [0, 360] domain",
    );
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
