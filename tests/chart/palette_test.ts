import { assert, assertEquals } from "@std/assert";
import {
  ANSI_16_RGB,
  ANSI_256_RGB,
  nearestPaletteIndex,
} from "../../src/cli/ansi-palette.ts";
import { oklchToSrgb, type SrgbColor } from "../../src/internal/oklch.ts";
import {
  CHART_SERIES_SLOTS,
  type ChartSeriesOklch,
  chartSeriesOklchLiteral,
} from "../../src/chart/series-palette.ts";
import {
  baseTokens,
  discernThemeTokens,
  themeTokens,
} from "../../src/tokens/tokens.ts";

/**
 * Colour-vision-deficiency separation floor in OKLab distance, measured
 * 0.1697 when the palette was authored and pinned just beneath it. This is
 * a hard limit the palette must keep, never an aspiration: a slot edit that
 * lowers any deficiency-simulated adjacent-pair distance below it fails.
 */
const CVD_SEPARATION_FLOOR = 0.169;

/** Minimum hue distance from every reserved semantic hue, in degrees. */
const RESERVED_HUE_CLEARANCE = 18;

function toVariant(value: ChartSeriesOklch): SrgbColor {
  return oklchToSrgb(value.lightnessPercent / 100, value.chroma, value.hue);
}

function linearChannel(encoded: number): number {
  const scaled = encoded / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

interface LinearRgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

function toLinear(color: SrgbColor): LinearRgb {
  return {
    r: linearChannel(color.red),
    g: linearChannel(color.green),
    b: linearChannel(color.blue),
  };
}

/**
 * Dichromacy simulation matrices at severity 1.0, applied in linear RGB.
 * Provenance: Machado, G. M., Oliveira, M. M., and Fernandes, L. A. F.,
 * "A Physiologically-based Model for Simulation of Color Vision
 * Deficiency", IEEE TVCG 15(6), 2009 — coefficients transcribed from the
 * published severity table and implemented independently.
 */
const PROTAN_SEVERE: readonly (readonly [number, number, number])[] = [
  [0.152286, 1.052583, -0.204868],
  [0.114503, 0.786281, 0.099216],
  [-0.003882, -0.048116, 1.051998],
];
const DEUTAN_SEVERE: readonly (readonly [number, number, number])[] = [
  [0.367322, 0.860646, -0.227968],
  [0.280085, 0.672501, 0.047413],
  [-0.011820, 0.042940, 0.968881],
];

function simulate(
  color: LinearRgb,
  matrix: readonly (readonly [number, number, number])[],
): LinearRgb {
  const [top, middle, bottom] = matrix;
  if (top === undefined || middle === undefined || bottom === undefined) {
    throw new TypeError("simulation matrix must have three rows");
  }
  return {
    r: top[0] * color.r + top[1] * color.g + top[2] * color.b,
    g: middle[0] * color.r + middle[1] * color.g + middle[2] * color.b,
    b: bottom[0] * color.r + bottom[1] * color.g + bottom[2] * color.b,
  };
}

interface Oklab {
  readonly lightness: number;
  readonly a: number;
  readonly b: number;
}

function signedCbrt(value: number): number {
  return value < 0 ? -Math.cbrt(-value) : Math.cbrt(value);
}

function linearToOklab(color: LinearRgb): Oklab {
  const l = signedCbrt(
    0.4122214708 * color.r + 0.5363325363 * color.g + 0.0514459929 * color.b,
  );
  const m = signedCbrt(
    0.2119034982 * color.r + 0.6806995451 * color.g + 0.1073969566 * color.b,
  );
  const s = signedCbrt(
    0.0883024619 * color.r + 0.2817188376 * color.g + 0.6299787005 * color.b,
  );
  return {
    lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabDistance(left: Oklab, right: Oklab): number {
  return Math.hypot(
    left.lightness - right.lightness,
    left.a - right.a,
    left.b - right.b,
  );
}

const VARIANTS = ["light", "dark"] as const;

Deno.test("the OKLab forward transform inverts the package conversion", () => {
  const probe = { lightnessPercent: 60, chroma: 0.1, hue: 200 };
  const lab = linearToOklab(toLinear(toVariant(probe)));
  const chroma = Math.hypot(lab.a, lab.b);
  const hue = ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360;
  assert(
    Math.abs(lab.lightness - 0.6) < 0.005,
    `round-trip L ${lab.lightness}`,
  );
  assert(Math.abs(chroma - 0.1) < 0.005, `round-trip C ${chroma}`);
  assert(Math.abs(hue - 200) < 1, `round-trip H ${hue}`);
});

Deno.test("adjacent slots stay separated under severe protan and deutan simulation", () => {
  for (const variant of VARIANTS) {
    for (
      const [name, matrix] of [
        ["protan", PROTAN_SEVERE],
        ["deutan", DEUTAN_SEVERE],
      ] as const
    ) {
      const simulated = CHART_SERIES_SLOTS.map((slot) =>
        linearToOklab(simulate(toLinear(toVariant(slot[variant])), matrix))
      );
      for (let index = 0; index < simulated.length - 1; index += 1) {
        const left = simulated[index];
        const right = simulated[index + 1];
        assert(left !== undefined && right !== undefined);
        const distance = oklabDistance(left, right);
        assert(
          distance >= CVD_SEPARATION_FLOOR,
          `${variant} ${name} slots ${index + 1}-${
            index + 2
          } measure ${distance}, below the pinned floor ${CVD_SEPARATION_FLOOR}`,
        );
      }
    }
  }
});

Deno.test("series hues keep clearance from every reserved semantic hue", () => {
  const reserved = new Set<number>();
  for (const token of [...baseTokens, ...discernThemeTokens]) {
    if (
      token.name === "--discern-ink-hue" ||
      token.name === "--discern-accent-hue"
    ) {
      reserved.add(Number(token.value));
    }
  }
  for (const token of themeTokens) {
    if (!/-(?:success|warning|danger)/u.test(token.name)) continue;
    for (const value of [token.light, token.dark]) {
      const match = value.match(
        /oklch\([0-9.]+%\s+[0-9.]+\s+(-?[0-9.]+)\s*\)/u,
      );
      if (match !== null) reserved.add(Number(match[1]));
    }
  }
  for (const hue of [28, 74, 82, 152, 255, 285]) {
    assert(
      reserved.has(hue),
      `premise: reserved hue ${hue} should derive from the Token authority`,
    );
  }
  const hueDistance = (left: number, right: number): number => {
    const difference = Math.abs(left - right) % 360;
    return Math.min(difference, 360 - difference);
  };
  for (const slot of CHART_SERIES_SLOTS) {
    for (const variant of VARIANTS) {
      for (const hue of reserved) {
        const distance = hueDistance(slot[variant].hue, hue);
        assert(
          distance >= RESERVED_HUE_CLEARANCE,
          `slot ${slot.slot} ${variant} hue ${
            slot[variant].hue
          } sits ${distance}° from reserved hue ${hue}`,
        );
      }
    }
  }
});

Deno.test("the six slots stay pairwise distinct through the ANSI 256 derivation", () => {
  const expected = {
    light: [30, 94, 31, 107, 60, 133],
    dark: [37, 131, 74, 149, 133, 212],
  } as const;
  for (const variant of VARIANTS) {
    const indices = CHART_SERIES_SLOTS.map((slot) =>
      nearestPaletteIndex(toVariant(slot[variant]), ANSI_256_RGB)
    );
    assertEquals(indices, [...expected[variant]]);
    assertEquals(
      new Set(indices).size,
      6,
      `${variant} ANSI 256 indices must be pairwise distinct`,
    );
  }
});

Deno.test("the ANSI 16 collapse is pinned and adjacent slots never collide", () => {
  // Sixteen colours cannot honour six muted hues: in light mode teal and sky
  // share cyan while olive and pink share gray; in dark mode olive and pink
  // share silver. Identity at this depth is guaranteed by each slot's paired
  // marker and fill glyph, never by colour alone — the collapse recorded
  // here is the accepted cost, and adjacent slots still never collide.
  const expected = {
    light: [6, 1, 6, 8, 5, 8],
    dark: [6, 3, 14, 7, 8, 7],
  } as const;
  for (const variant of VARIANTS) {
    const indices = CHART_SERIES_SLOTS.map((slot) =>
      nearestPaletteIndex(toVariant(slot[variant]), ANSI_16_RGB)
    );
    assertEquals(indices, [...expected[variant]]);
    for (let index = 0; index < indices.length - 1; index += 1) {
      assert(
        indices[index] !== indices[index + 1],
        `${variant} ANSI 16 slots ${index + 1} and ${
          index + 2
        } collapsed together`,
      );
    }
  }
});

Deno.test("authored literals serialize in the Token layer's oklch() form", () => {
  // The shape the terminal theme derivation parses today; the 3A move into
  // tokens.ts must stay byte-compatible with it.
  const tokenOklch =
    /^oklch\(\s*([0-9]+(?:\.[0-9]+)?)%\s+([0-9]+(?:\.[0-9]+)?)\s+(-?[0-9]+(?:\.[0-9]+)?)\s*\)$/u;
  for (const slot of CHART_SERIES_SLOTS) {
    for (const variant of VARIANTS) {
      const literal = chartSeriesOklchLiteral(slot[variant]);
      assert(
        tokenOklch.test(literal),
        `slot ${slot.slot} ${variant} literal ${literal} must parse as an authored Token`,
      );
    }
  }
  assertEquals(
    chartSeriesOklchLiteral({ lightnessPercent: 58, chroma: 0.11, hue: 195 }),
    "oklch(58% 0.11 195)",
  );
});
