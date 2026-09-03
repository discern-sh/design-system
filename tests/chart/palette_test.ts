import { assert, assertEquals } from "@std/assert";
import {
  type OklabColor,
  oklabContrast,
  oklchToSrgb,
  type SrgbColor,
} from "../../src/internal/oklch.ts";
import { terminalThemes } from "../../src/cli/theme.ts";
import {
  APPEARANCE_CONTRAST_SAMPLE_DARKNESSES,
  evaluateAppearance,
  themeTokens,
} from "../../src/tokens/tokens.ts";
import { resolveChartPaletteAtDarkness } from "../../src/chart/palette.ts";

/**
 * Minimum adjacent-series distance under the package's severe dichromacy
 * simulation. Colour never carries identity alone, but an edit may not
 * collapse neighbouring colours below this deliberately rounded floor.
 */
const CVD_SEPARATION_FLOOR = 0.09;
const SERIES_CANVAS_CONTRAST_FLOOR = 1.25;

const SERIES_SLOTS = [1, 2, 3, 4, 5, 6] as const;

/**
 * The exact literal shape the terminal theme derivation parses. The series
 * tokens are the palette's single source of truth, so each authored value
 * must stay byte-compatible with this parser.
 */
const TOKEN_OKLCH =
  /^oklch\(\s*([0-9]+(?:\.[0-9]+)?)%\s+([0-9]+(?:\.[0-9]+)?)\s+(-?[0-9]+(?:\.[0-9]+)?)\s*\)$/u;

interface SeriesOklch {
  readonly lightnessPercent: number;
  readonly chroma: number;
  readonly hue: number;
}

function seriesTokenName(slot: number): `--discern-${string}` {
  return `--discern-color-series-${slot}`;
}

function seriesOklch(slot: number, variant: "light" | "dark"): SeriesOklch {
  const token = themeTokens.find(({ name }) => name === seriesTokenName(slot));
  assert(token !== undefined, `missing series token for slot ${slot}`);
  assertEquals(token.category, "Color");
  const match = token[variant].match(TOKEN_OKLCH);
  assert(
    match !== null,
    `slot ${slot} ${variant} literal ${
      token[variant]
    } must parse in the terminal derivation's oklch() form`,
  );
  return {
    lightnessPercent: Number(match[1]),
    chroma: Number(match[2]),
    hue: Number(match[3]),
  };
}

function asOklab(value: SeriesOklch): OklabColor {
  const radians = value.hue * Math.PI / 180;
  return {
    lightness: value.lightnessPercent / 100,
    a: value.chroma * Math.cos(radians),
    b: value.chroma * Math.sin(radians),
  };
}

function fieldCanvas(darkness: number): OklabColor {
  const value = evaluateAppearance({ darkness })["--discern-color-canvas"];
  assert(value !== undefined, `field ${darkness} has no canvas`);
  const match = value.match(/^oklch\(([\d.]+)%\s+0\s+0\)$/);
  assert(match !== null, `field canvas ${value} is not opaque neutral OKLCH`);
  return { lightness: Number(match[1]) / 100, a: 0, b: 0 };
}

function toVariant(value: SeriesOklch): SrgbColor {
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

/**
 * The selected medium-contrast reference in sRGB. Light mode is Paul Tol's
 * published sequence; dark mode is the package-authored lighter counterpart.
 */
const EXPECTED_SERIES_RGB = {
  light: [
    { red: 102, green: 153, blue: 204 },
    { red: 0, green: 68, blue: 136 },
    { red: 238, green: 204, blue: 102 },
    { red: 153, green: 68, blue: 85 },
    { red: 153, green: 119, blue: 0 },
    { red: 238, green: 153, blue: 170 },
  ],
  dark: [
    { red: 141, green: 184, blue: 227 },
    { red: 93, green: 155, blue: 211 },
    { red: 240, green: 214, blue: 123 },
    { red: 212, green: 138, blue: 160 },
    { red: 196, green: 168, blue: 74 },
    { red: 242, green: 184, blue: 194 },
  ],
} as const satisfies Readonly<
  Record<
    (typeof VARIANTS)[number],
    readonly SrgbColor[]
  >
>;

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

Deno.test("the authored OKLCH values reproduce the selected medium-contrast palette", () => {
  for (const variant of VARIANTS) {
    for (const slot of SERIES_SLOTS) {
      assertEquals(
        toVariant(seriesOklch(slot, variant)),
        EXPECTED_SERIES_RGB[variant][slot - 1],
        `${variant} slot ${slot} drifted from the selected palette`,
      );
    }
  }
});

Deno.test("every authored series colour clears every sampled field canvas", () => {
  assert(
    oklabContrast(fieldCanvas(0.25), fieldCanvas(0.25)) <
      SERIES_CANVAS_CONTRAST_FLOOR,
    "the detector control no longer rejects an indistinguishable future colour",
  );
  for (const darkness of APPEARANCE_CONTRAST_SAMPLE_DARKNESSES) {
    const canvas = fieldCanvas(darkness);
    const palette = resolveChartPaletteAtDarkness(darkness);
    for (const slot of SERIES_SLOTS) {
      const selected = palette[`series-${slot}`];
      const match = selected.match(TOKEN_OKLCH);
      assert(match !== null, `field ${darkness} series ${slot} is not OKLCH`);
      const ratio = oklabContrast(
        asOklab({
          lightnessPercent: Number(match[1]),
          chroma: Number(match[2]),
          hue: Number(match[3]),
        }),
        canvas,
      );
      assert(
        ratio >= SERIES_CANVAS_CONTRAST_FLOOR,
        `field ${darkness} series ${slot} measures ${ratio}:1, below ${SERIES_CANVAS_CONTRAST_FLOOR}:1`,
      );
    }
  }
});

Deno.test("the sequential chart ramp is the field's ordered ink-alpha ladder", () => {
  for (const darkness of APPEARANCE_CONTRAST_SAMPLE_DARKNESSES) {
    const palette = resolveChartPaletteAtDarkness(darkness);
    const alphas = ([1, 2, 3, 4] as const).map((step) => {
      const value = palette[`ramp-${step}`];
      const match = value.match(
        /^oklch\((?:0|100)%\s+0\s+0(?:\s+\/\s+([\d.]+))?\)$/,
      );
      assert(match !== null, `field ${darkness} ramp ${step} is not neutral`);
      return match[1] === undefined ? 1 : Number(match[1]);
    });
    assertEquals(alphas, alphas.toSorted((left, right) => left - right));
  }
});

Deno.test("adjacent slots stay separated under severe protan and deutan simulation", () => {
  for (const variant of VARIANTS) {
    for (
      const [name, matrix] of [
        ["protan", PROTAN_SEVERE],
        ["deutan", DEUTAN_SEVERE],
      ] as const
    ) {
      const simulated = SERIES_SLOTS.map((slot) =>
        linearToOklab(
          simulate(toLinear(toVariant(seriesOklch(slot, variant))), matrix),
        )
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
          } measure ${distance}, below the ${CVD_SEPARATION_FLOOR} floor`,
        );
      }
    }
  }
});

Deno.test("the derived terminal themes enrol every series token automatically", () => {
  for (const variant of VARIANTS) {
    for (const slot of SERIES_SLOTS) {
      const color = terminalThemes[variant].colors[seriesTokenName(slot)];
      assert(
        color !== undefined,
        `${variant} terminal theme has no derived slot ${slot} colour`,
      );
      const authored = toVariant(seriesOklch(slot, variant));
      assertEquals(
        { red: color.red, green: color.green, blue: color.blue },
        authored,
        `${variant} slot ${slot} RGB must derive from the authored token`,
      );
    }
  }
});

Deno.test("the six slots stay pairwise distinct through the ANSI 256 derivation", () => {
  const expected = {
    light: [68, 24, 221, 95, 100, 211],
    dark: [110, 68, 222, 175, 179, 217],
  } as const;
  for (const variant of VARIANTS) {
    const indices = SERIES_SLOTS.map((slot) =>
      terminalThemes[variant].colors[seriesTokenName(slot)]?.ansi256
    );
    assertEquals(indices, [...expected[variant]]);
    assertEquals(
      new Set(indices).size,
      6,
      `${variant} ANSI 256 indices must be pairwise distinct`,
    );
  }
});

Deno.test("the ANSI 16 collapse is pinned", () => {
  // Sixteen colours cannot honour this restrained six-colour palette. Identity
  // at this depth is guaranteed by each slot's separately guarded marker and
  // fill glyph, never by colour alone; this records the accepted collapse.
  const expected = {
    light: [8, 6, 7, 8, 3, 7],
    dark: [7, 8, 7, 7, 8, 7],
  } as const;
  for (const variant of VARIANTS) {
    const indices = SERIES_SLOTS.map((slot) =>
      terminalThemes[variant].colors[seriesTokenName(slot)]?.ansi16
    );
    assertEquals(indices, [...expected[variant]]);
  }
});
