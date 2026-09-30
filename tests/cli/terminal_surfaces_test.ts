import { assert, assertEquals, assertNotEquals } from "@std/assert";
import {
  ANSI_256_FIXED_START,
  ANSI_256_RGB,
  legibleForegroundPaletteIndex,
  rankBackgroundPaletteIndexes,
  terminalContrastRatio,
  type TerminalRgbColor,
} from "../../src/cli/ansi-palette.ts";
import {
  styleText,
  terminalPaintsSurfaces,
  type TerminalTextStyle,
} from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { proveTerminalSurfaceAdmission } from "../../src/cli/surface-admission.ts";
import {
  deriveTerminalTheme,
  TERMINAL_SURFACE_ROLES,
  TERMINAL_SURFACE_SEPARATIONS,
  TERMINAL_SURFACE_TEXT_TONES,
  TERMINAL_TEXT_TONES,
  terminalSurfaceFill,
  terminalTextToneColor,
  terminalThemeColor,
  terminalThemes,
} from "../../src/cli/theme.ts";
import {
  appearanceColorRoleLaws,
  appearanceFillLaws,
  evaluateAppearance,
} from "../../src/tokens/tokens.ts";
import {
  decodeSrgbChannel,
  linearRgbToOklab,
} from "../../src/internal/oklch.ts";

const capabilities = (
  colorDepth: TerminalCapabilities["colorDepth"],
): TerminalCapabilities => ({ colorDepth, columns: 80, unicode: true });

function chroma(color: TerminalRgbColor): number {
  const lab = linearRgbToOklab(
    decodeSrgbChannel(color.red / 255),
    decodeSrgbChannel(color.green / 255),
    decodeSrgbChannel(color.blue / 255),
  );
  return Math.hypot(lab.a, lab.b);
}

function palette(index: number): TerminalRgbColor {
  const color = ANSI_256_RGB[index];
  assert(color !== undefined, `palette has no index ${index}`);
  return color;
}

Deno.test("every tone on every surface and every separated pair is admitted at each depth", () => {
  const proof = proveTerminalSurfaceAdmission();
  assert(proof.appearances > 360, "the proof sweeps the complete hue circle");
  assertEquals(
    proof.failures.slice(0, 12),
    [],
    `${proof.failures.length} terminal surface failures`,
  );
  assert(proof.accepted);
});

Deno.test("surface roles derive from the appearance fill laws and nothing else", () => {
  assertEquals(
    [...TERMINAL_SURFACE_ROLES],
    appearanceFillLaws.map((law) => law.name),
  );
  for (const theme of Object.values(terminalThemes)) {
    assertEquals(
      Object.keys(theme.surfaces).toSorted(),
      [...TERMINAL_SURFACE_ROLES].toSorted(),
    );
    assertEquals(
      Object.keys(theme.surfaceText).toSorted(),
      [...TERMINAL_SURFACE_ROLES].toSorted(),
    );
  }
  const roles = new Set<string>(["canvas", ...TERMINAL_SURFACE_ROLES]);
  for (const { first, second } of TERMINAL_SURFACE_SEPARATIONS) {
    assert(roles.has(first) && roles.has(second), `${first}/${second}`);
  }
  for (const role of TERMINAL_SURFACE_ROLES) {
    assert(TERMINAL_SURFACE_TEXT_TONES[role].includes("ink"), role);
  }
});

Deno.test("fill laws never become CSS custom properties", () => {
  const cssNames = new Set<string>(
    appearanceColorRoleLaws.map((law) => law.name),
  );
  const evaluated = Object.keys(evaluateAppearance({ darkness: 1 }));
  for (const law of appearanceFillLaws) {
    assert(!cssNames.has(law.name), law.name);
    assert(!evaluated.includes(law.name), law.name);
  }
});

Deno.test("accent fills reuse the browser washes a reader already knows", () => {
  for (const accent of [0, 137.5, 255, 300]) {
    for (const variant of ["dark", "light"] as const) {
      const theme = deriveTerminalTheme(variant, { accent });
      const rgb = (color: TerminalRgbColor) => [
        color.red,
        color.green,
        color.blue,
      ];
      assertEquals(
        rgb(theme.surfaces.selection),
        rgb(terminalThemeColor(theme, "--discern-color-accent-100")),
      );
      assertEquals(
        rgb(theme.surfaces.focusFill),
        rgb(terminalThemeColor(theme, "--discern-color-accent-200")),
      );
      assertEquals(
        rgb(theme.surfaces.dangerFill),
        rgb(terminalThemeColor(theme, "--discern-color-danger-soft")),
      );
    }
  }
});

Deno.test("monochrome fills climb one neutral ladder away from the ground", () => {
  for (const variant of ["dark", "light"] as const) {
    const theme = terminalThemes[variant];
    const canvas = terminalThemeColor(theme, "--discern-color-canvas");
    const ladder = ["surface", "raised", "selection", "control", "focusFill"]
      .map((role) =>
        terminalContrastRatio(
          terminalSurfaceFill(
            theme,
            role as (typeof TERMINAL_SURFACE_ROLES)[number],
          ),
          canvas,
        )
      );
    assertEquals(
      ladder,
      ladder.toSorted((left, right) => left - right),
      `${variant} ${ladder.join(", ")}`,
    );
    for (const role of TERMINAL_SURFACE_ROLES) {
      assert(chroma(theme.surfaces[role]) < 0.005, `${variant} ${role}`);
    }
  }
});

Deno.test("fills paint at truecolor and 256 and yield to structure below", () => {
  const theme = deriveTerminalTheme("dark", { accent: 255 });
  const style: TerminalTextStyle = {
    background: theme.surfaces.selection,
  };
  assertEquals(
    styleText("x", style, capabilities("truecolor")),
    "\x1b[48;2;38;60;87mx\x1b[0m",
  );
  assertEquals(
    styleText("x", style, capabilities("ansi256")),
    `\x1b[48;5;${theme.surfaces.selection.ansi256}mx\x1b[0m`,
  );
  assertEquals(styleText("x", style, capabilities("ansi16")), "x");
  assertEquals(styleText("x", style, capabilities("none")), "x");
  assert(terminalPaintsSurfaces(capabilities("truecolor")));
  assert(terminalPaintsSurfaces(capabilities("ansi256")));
  assert(!terminalPaintsSurfaces(capabilities("ansi16")));
  assert(!terminalPaintsSurfaces(capabilities("none")));
  const semantic = terminalThemeColor(theme, "--discern-color-surface-sunken");
  assertEquals(
    styleText("x", { background: semantic }, capabilities("ansi16")),
    `\x1b[${40 + semantic.ansi16}mx\x1b[0m`,
    "a semantic colour keeps its 16-colour background",
  );
});

Deno.test("background ranking never offers a themeable or saturated stand-in", () => {
  for (const accent of Array.from({ length: 24 }, (_, step) => step * 15)) {
    for (const variant of ["dark", "light"] as const) {
      const theme = deriveTerminalTheme(variant, { accent });
      for (
        const name of [
          "--discern-color-accent-100",
          "--discern-color-accent-200",
          "--discern-color-success-soft",
          "--discern-color-warning-soft",
          "--discern-color-danger-soft",
        ] as const
      ) {
        const wash = terminalThemeColor(theme, name);
        const ranked = rankBackgroundPaletteIndexes(wash);
        assert(ranked.every((index) => index >= ANSI_256_FIXED_START));
        const first = ranked[0];
        assert(first !== undefined);
        assert(
          chroma(palette(first)) <= Math.max(chroma(wash) * 2.5, 0.005),
          `${variant} ${accent} ${name} → ${first}`,
        );
      }
    }
  }
});

Deno.test("a dark wash without an in-family entry keeps its lightness as grey", () => {
  const theme = deriveTerminalTheme("dark", { accent: 255 });
  const selection = palette(theme.surfaces.selection.ansi256);
  assert(chroma(selection) < 0.005, "the dark selection yields its hue");
  const focus = palette(theme.surfaces.focusFill.ansi256);
  assert(chroma(focus) > 0.02, "the focus wash keeps its hue family");
  const danger = palette(theme.surfaces.dangerFill.ansi256);
  assert(chroma(danger) > 0.02, "the danger wash keeps its hue family");
});

Deno.test("text on a fill keeps its 256 index unless the pair would be illegible", () => {
  const theme = deriveTerminalTheme("light", { accent: 255 });
  const faint = terminalThemeColor(theme, "--discern-color-ink-faint");
  const onCanvas = terminalTextToneColor(theme, "faint");
  assertEquals(onCanvas, faint);
  const surface = palette(theme.surfaces.surface.ansi256);
  const onSurface = terminalTextToneColor(theme, "faint", "surface");
  assertEquals([onSurface.red, onSurface.green, onSurface.blue], [
    faint.red,
    faint.green,
    faint.blue,
  ]);
  assert(
    terminalContrastRatio(palette(onSurface.ansi256), surface) >= 4.5,
  );
  const white = { red: 255, green: 255, blue: 255 };
  assertEquals(
    legibleForegroundPaletteIndex(white, 231, palette(16), 4.5),
    231,
  );
  const lifted = legibleForegroundPaletteIndex(
    { red: 90, green: 90, blue: 90 },
    240,
    palette(16),
    4.5,
  );
  assertNotEquals(lifted, 240);
  assert(terminalContrastRatio(palette(lifted), palette(16)) >= 4.5);
});

Deno.test("surfaces raise tones they do not carry", () => {
  const theme = deriveTerminalTheme("dark", { accent: 255 });
  const rgb = (color: TerminalRgbColor) => [color.red, color.green, color.blue];
  const muted = terminalThemeColor(theme, "--discern-color-ink-muted");
  const ink = terminalThemeColor(theme, "--discern-color-ink");
  for (const surface of TERMINAL_SURFACE_ROLES) {
    for (const tone of TERMINAL_TEXT_TONES) {
      const painted = terminalTextToneColor(theme, tone, surface);
      if (TERMINAL_SURFACE_TEXT_TONES[surface].includes(tone)) continue;
      assertEquals(
        rgb(painted),
        rgb(tone === "faint" ? muted : ink),
        `${tone} on ${surface}`,
      );
    }
  }
});
