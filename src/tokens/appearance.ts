/**
 * Appearance authority for every non-series colour role. One ordered law
 * table supplies token pole emission, live browser projection, terminal-ready
 * pure evaluation, chart ramps, and package admission arithmetic.
 *
 * @module
 */

import {
  compositeOklab,
  type OklabColor,
  oklabContrast,
} from "../internal/oklch.ts";

/** The four axes that tint the two pigments; inert at their zero defaults. */
export type PigmentTintAxisName =
  | "paperTint"
  | "paperTintHue"
  | "inkTint"
  | "inkTintHue";

/** Numeric axes accepted by the appearance graph. */
export type AppearanceAxisName =
  | "darkness"
  | "structure"
  | "emphasis"
  | "density"
  | PigmentTintAxisName;

/** Documented bounds and default for one appearance axis. */
export interface AppearanceAxisDefinition {
  readonly minimum: number;
  readonly maximum: number;
  readonly default: number;
  readonly description: string;
}

/** Axis definitions shared by evaluation and the live-CSS projection. */
export const appearanceAxes = Object.freeze(
  {
    darkness: {
      minimum: 0,
      maximum: 1,
      default: 0,
      description: "Canvas position from paper (0) to ink (1).",
    },
    structure: {
      minimum: 0,
      maximum: 2,
      default: 1,
      description: "Multiplier for borders, stripes, and shadow structure.",
    },
    emphasis: {
      minimum: 0,
      maximum: 2,
      default: 1,
      description: "Multiplier for state and quiet-wash emphasis.",
    },
    density: {
      minimum: 0.5,
      maximum: 2,
      default: 1,
      description:
        "Projection-time multiplier for spacing only. It never changes font size; interface-text and component-owned touch-target floors remain unscaled.",
    },
    paperTint: {
      minimum: 0,
      maximum: 1,
      default: 0,
      description:
        "Tint strength of the paper pigment, which is the canvas at the light pole and the text at the dark pole: 0 keeps pure white, 1 reaches the deepest stock every hue can show inside sRGB.",
    },
    paperTintHue: {
      minimum: 0,
      maximum: 360,
      default: 0,
      description:
        "Hue of the paper tint from 0 through 360; inert while the paper tint is 0.",
    },
    inkTint: {
      minimum: 0,
      maximum: 1,
      default: 0,
      description:
        "Tint strength of the ink pigment, which is the text at the light pole and the canvas at the dark pole: 0 keeps pure black, 1 lifts the ink to the deepest coloured black every hue can show inside sRGB.",
    },
    inkTintHue: {
      minimum: 0,
      maximum: 360,
      default: 0,
      description:
        "Hue of the ink tint from 0 through 360; inert while the ink tint is 0.",
    },
  } as const satisfies Readonly<
    Record<AppearanceAxisName, AppearanceAxisDefinition>
  >,
);

/** Every axis name in authored order. */
export const appearanceAxisNames: readonly AppearanceAxisName[] = Object
  .freeze(Object.keys(appearanceAxes) as AppearanceAxisName[]);

/** The pigment-tint axes in authored order. */
export const pigmentTintAxisNames: readonly PigmentTintAxisName[] = Object
  .freeze(["paperTint", "paperTintHue", "inkTint", "inkTintHue"]);

/**
 * The tint coordinates that actually colour a pigment. A hue is inert while its
 * strength sits at zero, so only a strength above the default carries its hue
 * through; the result is `{}` for an untinted appearance.
 */
export function activePigmentTints(
  axes: Partial<AppearanceAxes>,
): Partial<Pick<AppearanceAxes, PigmentTintAxisName>> {
  const tints: Partial<Record<PigmentTintAxisName, number>> = {};
  for (
    const [strength, hue] of [
      ["paperTint", "paperTintHue"],
      ["inkTint", "inkTintHue"],
    ] as const
  ) {
    const value = axes[strength] ?? appearanceAxes[strength].default;
    if (value === appearanceAxes[strength].default) continue;
    tints[strength] = value;
    tints[hue] = axes[hue] ?? appearanceAxes[hue].default;
  }
  return tints;
}

/** The darkness, structure, emphasis, and density axes, in authored order. */
export const primaryAppearanceAxisNames: readonly AppearanceAxisName[] = Object
  .freeze(
    appearanceAxisNames.filter((axis) =>
      !(pigmentTintAxisNames as readonly string[]).includes(axis)
    ),
  );

/** The numeric axis coordinates of one appearance. */
export interface AppearanceAxes {
  readonly darkness: number;
  readonly structure: number;
  readonly emphasis: number;
  readonly density: number;
  readonly paperTint: number;
  readonly paperTintHue: number;
  readonly inkTint: number;
  readonly inkTintHue: number;
}

/**
 * One complete appearance: the axis coordinates plus an optional accent hue.
 * Omit `accent` for the monochrome default; supply any finite hue from `0`
 * through `360` to project the chromatic roles at that hue.
 */
export interface Appearance extends AppearanceAxes {
  readonly accent?: number | undefined;
}

/**
 * Which pigment projection a role graph consumer wants: `mono` derives every
 * role from paper and ink, `accent` projects the chromatic roles at the
 * selected hue and leaves the rest monochrome.
 */
export type AppearanceProjection = "mono" | "accent";

/** Both projections, in the order every scoped surface emits them. */
export const appearanceProjections: readonly AppearanceProjection[] = Object
  .freeze(["mono", "accent"]);

/** Name the projection one appearance selects. */
export function appearanceProjection(
  appearance: Pick<Appearance, "accent">,
): AppearanceProjection {
  return appearance.accent === undefined ? "mono" : "accent";
}

/** Hue the Catalogue names Blue; also the registered initial value of the hue primitive. */
export const DEFAULT_ACCENT_HUE = 255;

/**
 * Validate and normalise the public circular hue domain. Every finite value
 * from 0 through 360 is admitted; 360 is the same point as 0.
 */
export function normalizeAccentHue(hue: number): number {
  if (!Number.isFinite(hue) || hue < 0 || hue > 360) {
    throw new TypeError(
      `Accent hue ${hue} is outside the finite [0, 360] domain`,
    );
  }
  return hue === 360 ? 0 : hue;
}

/** Default monochrome appearance used when a coordinate is omitted. */
export const defaultAppearance: Appearance = Object.freeze(
  Object.fromEntries(
    appearanceAxisNames.map((axis) => [axis, appearanceAxes[axis].default]),
  ) as Record<AppearanceAxisName, number>,
);

/** One named scalar shared wherever the same number enters multiple laws. */
export interface AppearanceNumberExpression {
  readonly kind: "number";
  readonly name: string;
  readonly value: number;
}

/** One axis reference. */
export interface AppearanceAxisExpression {
  readonly kind: "axis";
  readonly axis: AppearanceAxisName | "accent-hue";
}

/** Minimal CSS-calc-compatible numeric expression vocabulary for appearance laws. */
export type AppearanceExpression =
  | AppearanceNumberExpression
  | AppearanceAxisExpression
  | {
    readonly kind: "add" | "subtract" | "multiply" | "divide";
    readonly left: AppearanceExpression;
    readonly right: AppearanceExpression;
  }
  | {
    readonly kind: "min" | "max";
    readonly values: readonly AppearanceExpression[];
  }
  | {
    readonly kind: "clamp";
    readonly minimum: AppearanceExpression;
    readonly value: AppearanceExpression;
    readonly maximum: AppearanceExpression;
  }
  | { readonly kind: "abs"; readonly value: AppearanceExpression }
  | {
    readonly kind: "round";
    readonly strategy?: "nearest" | "up";
    readonly value: AppearanceExpression;
    readonly interval: AppearanceExpression;
  }
  | {
    readonly kind: "lerp";
    readonly from: AppearanceExpression;
    readonly to: AppearanceExpression;
    readonly position: AppearanceExpression;
  };

const numberNodes = new Map<number, AppearanceNumberExpression>();

function numberName(value: number): string {
  if (value === 0) return "zero";
  if (value === 1) return "one";
  return `n_${String(value).replace("-", "negative_").replace(".", "_")}`;
}

function numberNode(value: number): AppearanceNumberExpression {
  const existing = numberNodes.get(value);
  if (existing !== undefined) return existing;
  const node = Object.freeze({
    kind: "number",
    name: numberName(value),
    value,
  });
  numberNodes.set(value, node);
  return node;
}

const zero: AppearanceNumberExpression = numberNode(0);
const one: AppearanceNumberExpression = numberNode(1);
const two: AppearanceNumberExpression = numberNode(2);
const quarter: AppearanceNumberExpression = numberNode(0.25);
const roundingInterval: AppearanceNumberExpression = numberNode(0.0001);
const axisNodes = Object.freeze(
  Object.fromEntries(
    appearanceAxisNames.map((axis) => [
      axis,
      Object.freeze({ kind: "axis", axis }),
    ]),
  ) as Readonly<Record<AppearanceAxisName, AppearanceAxisExpression>>,
);
const accentHueAxis: AppearanceAxisExpression = Object.freeze({
  kind: "axis",
  axis: "accent-hue",
});

const binary = (
  kind: "add" | "subtract" | "multiply" | "divide",
  left: AppearanceExpression,
  right: AppearanceExpression,
): AppearanceExpression => ({ kind, left, right });
const clamp = (value: AppearanceExpression): AppearanceExpression => ({
  kind: "clamp",
  minimum: zero,
  value,
  maximum: one,
});
const bounded = (
  minimum: number,
  value: AppearanceExpression,
  maximum: number,
): AppearanceExpression => ({
  kind: "clamp",
  minimum: numberNode(minimum),
  value,
  maximum: numberNode(maximum),
});
const rounded = (value: AppearanceExpression): AppearanceExpression => ({
  kind: "round",
  value,
  interval: roundingInterval,
});

const curveSegmentPositions = Object.freeze(
  [0, 0.25, 0.5, 0.75].map((start) =>
    clamp(binary(
      "divide",
      binary("subtract", axisNodes.darkness, numberNode(start)),
      quarter,
    ))
  ),
);

function curve(
  values: readonly [number, number, number, number, number],
): AppearanceExpression {
  if (values.every((value) => value === values[0])) {
    return numberNode(values[0]);
  }
  let expression: AppearanceExpression = numberNode(values[0]);
  for (let index = 1; index < values.length; index += 1) {
    const from = numberNode(values[index - 1] ?? 0);
    const to = numberNode(values[index] ?? 0);
    const position = curveSegmentPositions[index - 1];
    if (position === undefined) {
      throw new TypeError(`Missing curve segment ${index - 1}`);
    }
    expression = binary(
      "add",
      expression,
      binary("multiply", binary("subtract", to, from), position),
    );
  }
  return rounded(expression);
}

function scaledCurve(
  values: readonly [number, number, number, number, number],
  axis: "structure" | "emphasis",
): AppearanceExpression {
  return rounded(clamp(binary("multiply", curve(values), axisNodes[axis])));
}

function boundedScaledCurve(
  values: readonly [number, number, number, number, number],
  axis: "structure" | "emphasis",
  minimum: number,
  maximum: number,
): AppearanceExpression {
  return rounded(bounded(
    minimum,
    binary("multiply", curve(values), axisNodes[axis]),
    maximum,
  ));
}

/**
 * Reach of a full paper tint: the lightness pure white gives up and the OKLCH
 * chroma it gains at strength 1. The pair keeps every hue inside sRGB along
 * the whole strength ramp; the admission proof sweeps the circle to hold it.
 */
export const PAPER_TINT_DEPTH = 0.05;
/** OKLCH chroma of the paper pigment at full tint strength. */
export const PAPER_TINT_CHROMA = 0.02;
/** Lightness a full ink tint lifts pure black to. */
export const INK_TINT_LIFT = 0.14;
/** OKLCH chroma of the ink pigment at full tint strength. */
export const INK_TINT_CHROMA = 0.021;

/** One pigment as OKLCH expressions of the tint axes. */
export interface AppearancePigmentLaw {
  readonly lightness: AppearanceExpression;
  readonly chroma: AppearanceExpression;
  readonly hue: AppearanceExpression;
}

/**
 * Paper and ink pigments. Untinted they are pure white and pure black; the
 * tint axes move each one along a gamut-safe line towards a coloured stock or
 * a coloured black, and every derived role follows because it is these
 * pigments at an alpha.
 */
export const appearancePigmentLaws: Readonly<
  Record<"paper" | "ink", AppearancePigmentLaw>
> = Object.freeze({
  paper: Object.freeze({
    lightness: binary(
      "subtract",
      one,
      binary("multiply", axisNodes.paperTint, numberNode(PAPER_TINT_DEPTH)),
    ),
    chroma: binary(
      "multiply",
      axisNodes.paperTint,
      numberNode(PAPER_TINT_CHROMA),
    ),
    hue: axisNodes.paperTintHue,
  }),
  ink: Object.freeze({
    lightness: binary("multiply", axisNodes.inkTint, numberNode(INK_TINT_LIFT)),
    chroma: binary("multiply", axisNodes.inkTint, numberNode(INK_TINT_CHROMA)),
    hue: axisNodes.inkTintHue,
  }),
});

/** Relative-luminance crossover where black and white ink have equal contrast. */
export const APPEARANCE_POLARITY_CROSSOVER = 0.179;

/** Darkness coordinate whose untinted canvas reaches the polarity crossover. */
export const APPEARANCE_POLARITY_CROSSOVER_DARKNESS: number = 1 -
  Math.cbrt(APPEARANCE_POLARITY_CROSSOVER);

const paperLightness = appearancePigmentLaws.paper.lightness;
const inkLightness = appearancePigmentLaws.ink.lightness;

/** Canvas OKLab lightness derived from the darkness axis. */
export const appearanceCanvasLightnessExpression: AppearanceExpression = {
  kind: "lerp",
  from: paperLightness,
  to: inkLightness,
  position: axisNodes.darkness,
};

const canvasLightnessSquared = binary(
  "multiply",
  appearanceCanvasLightnessExpression,
  appearanceCanvasLightnessExpression,
);
const canvasRelativeLuminance = binary(
  "multiply",
  canvasLightnessSquared,
  appearanceCanvasLightnessExpression,
);
const polarityDelta = binary(
  "subtract",
  numberNode(APPEARANCE_POLARITY_CROSSOVER),
  canvasRelativeLuminance,
);
const positivePolarityDelta = binary(
  "divide",
  binary("add", polarityDelta, { kind: "abs", value: polarityDelta }),
  two,
);

/**
 * Zero selects ink on a light canvas; one selects paper once the canvas falls
 * below the shared relative-luminance crossover.
 */
export const appearancePolarityExpression: AppearanceExpression = {
  kind: "round",
  strategy: "up",
  value: positivePolarityDelta,
  interval: one,
};

/** Current canvas-contrast pigment lightness. */
export const appearanceActiveLightnessExpression: AppearanceExpression = {
  kind: "lerp",
  from: inkLightness,
  to: paperLightness,
  position: appearancePolarityExpression,
};

/** Pigment lightness opposite the current canvas-contrast pigment. */
export const appearanceOppositeLightnessExpression: AppearanceExpression = {
  kind: "lerp",
  from: paperLightness,
  to: inkLightness,
  position: appearancePolarityExpression,
};

/** OKLCH chroma of the current canvas-contrast pigment. */
export const appearanceActiveChromaExpression: AppearanceExpression = {
  kind: "lerp",
  from: appearancePigmentLaws.ink.chroma,
  to: appearancePigmentLaws.paper.chroma,
  position: appearancePolarityExpression,
};

/** OKLCH hue of the current canvas-contrast pigment. */
export const appearanceActiveHueExpression: AppearanceExpression = {
  kind: "lerp",
  from: appearancePigmentLaws.ink.hue,
  to: appearancePigmentLaws.paper.hue,
  position: appearancePolarityExpression,
};

/** OKLCH chroma of the pigment opposite the canvas-contrast pigment. */
export const appearanceOppositeChromaExpression: AppearanceExpression = {
  kind: "lerp",
  from: appearancePigmentLaws.paper.chroma,
  to: appearancePigmentLaws.ink.chroma,
  position: appearancePolarityExpression,
};

/** OKLCH hue of the pigment opposite the canvas-contrast pigment. */
export const appearanceOppositeHueExpression: AppearanceExpression = {
  kind: "lerp",
  from: appearancePigmentLaws.paper.hue,
  to: appearancePigmentLaws.ink.hue,
  position: appearancePolarityExpression,
};

/**
 * Numeric spacing fact retained for non-browser projections. Browser density
 * scales spacing only and never changes font size.
 */
export const APPEARANCE_SPACING_UNIT_PX = 4;

/** Pigment treatment applied to one role's scalar expression. */
export type AppearancePaint =
  | "canvas"
  | "active-ink"
  | "opposite-ink"
  | "raised-surface"
  | "owned-surface"
  | "ink-pigment"
  | "paper-pigment";

/** One chromatic projection carried beside its achromatic role law. */
export interface AccentColorProjection {
  readonly lightness: AppearanceExpression;
  readonly chroma: AppearanceExpression;
  readonly hue: AppearanceExpression;
  readonly alpha: AppearanceExpression;
}

/** One public colour role and its sole appearance expression. */
export interface AppearanceColorRoleLaw {
  readonly name: `--discern-${string}`;
  readonly description: string;
  readonly paint: AppearancePaint;
  readonly expression: AppearanceExpression;
  /** Chromatic projection under Accent, or `mono` when the role stays pigment-derived. */
  readonly accent: AccentColorProjection | "mono";
  readonly ownedSurface: boolean;
}

const role = <
  const Name extends `--discern-${string}`,
  const Accent extends AccentColorProjection | undefined,
>(
  name: Name,
  description: string,
  paint: AppearancePaint,
  expression: AppearanceExpression,
  accent: Accent,
) => ({
  name,
  description,
  paint,
  expression,
  accent: accent ?? "mono",
  ownedSurface: paint === "canvas" || paint === "raised-surface" ||
    paint === "owned-surface",
} as const);

const polaritySelection = (
  light: AppearanceExpression,
  dark: AppearanceExpression,
): AppearanceExpression => ({
  kind: "lerp",
  from: light,
  to: dark,
  position: appearancePolarityExpression,
});
const weightedMix = (
  from: AppearanceExpression,
  to: AppearanceExpression,
  toWeight: number,
): AppearanceExpression => ({
  kind: "lerp",
  from,
  to,
  position: numberNode(toWeight),
});

const lightPolarityProgress = clamp(binary(
  "divide",
  axisNodes.darkness,
  numberNode(APPEARANCE_POLARITY_CROSSOVER_DARKNESS),
));
const darkPolarityProgress = clamp(binary(
  "divide",
  binary(
    "subtract",
    axisNodes.darkness,
    numberNode(APPEARANCE_POLARITY_CROSSOVER_DARKNESS),
  ),
  numberNode(1 - APPEARANCE_POLARITY_CROSSOVER_DARKNESS),
));

function polarCurve(
  lightPole: number,
  lightCrossover: number,
  darkCrossover: number,
  darkPole: number,
): AppearanceExpression {
  return rounded(polaritySelection(
    {
      kind: "lerp",
      from: numberNode(lightPole),
      to: numberNode(lightCrossover),
      position: lightPolarityProgress,
    },
    {
      kind: "lerp",
      from: numberNode(darkCrossover),
      to: numberNode(darkPole),
      position: darkPolarityProgress,
    },
  ));
}

function accentProjection(
  lightness: readonly [number, number, number, number],
  chroma: readonly [number, number, number, number],
  hue: AppearanceExpression,
  emphasis = true,
): AccentColorProjection {
  const baseChroma = polarCurve(...chroma);
  return Object.freeze({
    lightness: polarCurve(...lightness),
    chroma: emphasis
      ? rounded(bounded(
        0,
        binary("multiply", baseChroma, axisNodes.emphasis),
        0.28,
      ))
      : baseChroma,
    hue,
    alpha: one,
  });
}

const accent100Projection = accentProjection(
  [0.962, 0.9, 0.32, 0.35],
  [0.019, 0.03, 0.065, 0.055],
  accentHueAxis,
);
const accent200Projection = accentProjection(
  [0.92, 0.84, 0.36, 0.4],
  [0.045, 0.06, 0.09, 0.08],
  accentHueAxis,
);
const accent300Projection = accentProjection(
  [0.85, 0.76, 0.42, 0.46],
  [0.082, 0.1, 0.125, 0.115],
  accentHueAxis,
);
const accent400Projection = accentProjection(
  [0.73, 0.64, 0.54, 0.58],
  [0.128, 0.14, 0.16, 0.15],
  accentHueAxis,
);
const accent500Projection = accentProjection(
  [0.55, 0.5, 0.64, 0.67],
  [0.185, 0.19, 0.175, 0.165],
  accentHueAxis,
);
const accent600Projection = accentProjection(
  [0.52, 0.44, 0.72, 0.74],
  [0.208, 0.2, 0.15, 0.14],
  accentHueAxis,
);
const accent700Projection = accentProjection(
  [0.44, 0.36, 0.82, 0.82],
  [0.185, 0.18, 0.115, 0.105],
  accentHueAxis,
);
const accent800Projection = accentProjection(
  [0.34, 0.28, 0.9, 0.9],
  [0.13, 0.13, 0.07, 0.06],
  accentHueAxis,
);
const actionProjection = accentProjection(
  [0.4, 0.34, 0.82, 0.8],
  [0.16, 0.16, 0.13, 0.13],
  accentHueAxis,
);
const successHue = numberNode(152);
const warningHue = polarCurve(74, 78, 82, 82);
const dangerHue = numberNode(28);
const successProjection = accentProjection(
  [0.64, 0.6, 0.56, 0.58],
  [0.165, 0.17, 0.17, 0.155],
  successHue,
);
const successSoftProjection = accentProjection(
  [0.95, 0.92, 0.26, 0.29],
  [0.05, 0.055, 0.065, 0.06],
  successHue,
);
const successDeepProjection = accentProjection(
  [0.37, 0.32, 0.92, 0.88],
  [0.09, 0.095, 0.105, 0.1],
  successHue,
);
const warningProjection = accentProjection(
  [0.64, 0.6, 0.58, 0.6],
  [0.14, 0.145, 0.14, 0.13],
  warningHue,
);
const warningSoftProjection = accentProjection(
  [0.96, 0.92, 0.27, 0.3],
  [0.045, 0.05, 0.06, 0.055],
  warningHue,
);
const warningDeepProjection = accentProjection(
  [0.5, 0.42, 0.9, 0.86],
  [0.12, 0.12, 0.105, 0.1],
  warningHue,
);
const dangerProjection = accentProjection(
  [0.42, 0.3, 0.84, 0.82],
  [0.19, 0.195, 0.18, 0.17],
  dangerHue,
);
const dangerSoftProjection = accentProjection(
  [0.96, 0.92, 0.26, 0.29],
  [0.035, 0.045, 0.06, 0.055],
  dangerHue,
);
const avatarFillStartProjection = accentProjection(
  [0.962, 0.9, 0.35, 0.384],
  [0.019, 0.03, 0.08, 0.072],
  accentHueAxis,
);
const avatarFillEndProjection = accentProjection(
  [0.936, 0.86, 0.4, 0.4312],
  [0.0351, 0.05, 0.105, 0.0982],
  accentHueAxis,
);

const inkExpression: AppearanceExpression = {
  kind: "max",
  values: [
    curve([0.87, 0.84, 1, 0.96, 0.92]),
    polarCurve(0.87, 1, 1, 0.92),
  ],
};
const inkMutedExpression = polarCurve(0.68, 1, 1, 0.74);
const inkFaintExpression = polarCurve(0.55, 0.72, 0.72, 0.55);
const accent100Expression = rounded(clamp(binary(
  "multiply",
  polarCurve(0.05, 0, 0, 0.06),
  axisNodes.emphasis,
)));
const accent200Expression = scaledCurve(
  [0.09, 0.12, 0.18, 0.13, 0.1],
  "emphasis",
);
const accent300Expression = scaledCurve(
  [0.17, 0.22, 0.28, 0.22, 0.18],
  "emphasis",
);
const accent500Expression = boundedScaledCurve(
  [0.52, 0.68, 0.8, 0.66, 0.55],
  "emphasis",
  0.5,
  0.9,
);
const accent600Expression = boundedScaledCurve(
  [0.82, 0.86, 0.75, 0.86, 0.85],
  "emphasis",
  0.5,
  0.86,
);
const accent700Expression = boundedScaledCurve(
  [0.93, 0.96, 1, 0.96, 0.94],
  "emphasis",
  0.82,
  1,
);
const borderStrongExpression = scaledCurve(
  [0.3, 0.34, 0.4, 0.35, 0.32],
  "structure",
);
const accent800Expression = boundedScaledCurve(
  [1, 1, 1, 1, 1],
  "emphasis",
  0.86,
  1,
);
const successExpression = boundedScaledCurve(
  [0.44, 0.38, 0.34, 0.42, 0.48],
  "emphasis",
  0.2,
  0.55,
);
const warningExpression = boundedScaledCurve(
  [0.62, 0.6, 0.58, 0.62, 0.66],
  "emphasis",
  0.35,
  0.72,
);
const dangerExpression = boundedScaledCurve(
  [1, 1, 1, 1, 1],
  "emphasis",
  0.7,
  1,
);
const warningSoftExpression = rounded(clamp(binary(
  "multiply",
  polarCurve(0.07, 0, 0, 0.09),
  axisNodes.emphasis,
)));
const dangerSoftExpression = rounded(clamp(binary(
  "multiply",
  polarCurve(0.1, 0, 0, 0.12),
  axisNodes.emphasis,
)));
const accentInkExpression = polaritySelection(
  accent600Expression,
  accent500Expression,
);
const brandArtworkMaskExpression = polaritySelection(
  zero,
  inkMutedExpression,
);
const brandArtworkInkExpression = polaritySelection(
  accent700Expression,
  inkMutedExpression,
);
const brandArtworkInkProjection: AccentColorProjection = Object.freeze({
  lightness: polaritySelection(accent700Projection.lightness, one),
  chroma: polaritySelection(accent700Projection.chroma, zero),
  hue: polaritySelection(accentHueAxis, zero),
  alpha: polaritySelection(one, inkMutedExpression),
});
/** Minimum composited OKLab separation around a hard primary-action shadow. */
export const ACTION_SHADOW_DISTANCE_FLOOR = 0.08;

const actionShadowExpression = rounded(bounded(
  0.22,
  binary(
    "multiply",
    curve([0.82, 0.78, 0.72, 0.7, 0.68]),
    axisNodes.structure,
  ),
  0.86,
));
const neutralEdgeExpression = polaritySelection(
  inkExpression,
  borderStrongExpression,
);
const neutralShadowExpression = polaritySelection(inkExpression, one);
const avatarHighlightExpression = polaritySelection(
  one,
  accent300Expression,
);
const avatarFillStartExpression = polaritySelection(
  accent100Expression,
  weightedMix(accent100Expression, accent200Expression, 0.68),
);
const avatarFillEndExpression = polaritySelection(
  weightedMix(accent100Expression, accent200Expression, 0.62),
  weightedMix(accent200Expression, accent300Expression, 0.52),
);

/**
 * Ordered appearance law population. Every non-series colour Theme Token
 * derives from this table; an Accent projection is metadata beside the monochrome
 * law, not a second role population.
 */
export const appearanceColorRoleLaws: readonly AppearanceColorRoleLaw[] = Object
  .freeze(
    [
      role(
        "--discern-color-ink",
        "Primary ink.",
        "active-ink",
        inkExpression,
        undefined,
      ),
      role(
        "--discern-color-ink-muted",
        "Secondary ink.",
        "active-ink",
        inkMutedExpression,
        undefined,
      ),
      role(
        "--discern-color-ink-faint",
        "Tertiary ink.",
        "active-ink",
        inkFaintExpression,
        undefined,
      ),
      role(
        "--discern-color-canvas",
        "Opaque page canvas.",
        "canvas",
        appearanceCanvasLightnessExpression,
        undefined,
      ),
      role(
        "--discern-color-surface",
        "Opaque raised surface, composited once over canvas.",
        "raised-surface",
        polarCurve(0.015, 0, 0, 0.07),
        undefined,
      ),
      role(
        "--discern-color-surface-sunken",
        "Translucent inset wash used only over an owned opaque canvas.",
        "active-ink",
        polarCurve(0.045, 0, 0, 0.025),
        undefined,
      ),
      role(
        "--discern-color-inverse-surface",
        "Opaque ink-pigment surface for stable light-on-dark treatments.",
        "ink-pigment",
        one,
        undefined,
      ),
      role(
        "--discern-color-inverse-ink",
        "Paper-pigment ink for a stable inverse surface.",
        "paper-pigment",
        one,
        undefined,
      ),
      role(
        "--discern-color-action",
        "Primary action fill: full active ink in monochrome.",
        "active-ink",
        one,
        actionProjection,
      ),
      role(
        "--discern-color-on-action",
        "Primary action content: the opposite pigment.",
        "opposite-ink",
        one,
        undefined,
      ),
      role(
        "--discern-color-accent-100",
        "Subtlest translucent emphasis wash.",
        "active-ink",
        accent100Expression,
        accent100Projection,
      ),
      role(
        "--discern-color-accent-200",
        "Quiet translucent emphasis wash.",
        "active-ink",
        accent200Expression,
        accent200Projection,
      ),
      role(
        "--discern-color-accent-300",
        "Soft emphasis fill.",
        "active-ink",
        accent300Expression,
        accent300Projection,
      ),
      role(
        "--discern-color-accent-400",
        "Mid emphasis fill.",
        "active-ink",
        scaledCurve([0.32, 0.39, 0.44, 0.39, 0.34], "emphasis"),
        accent400Projection,
      ),
      role(
        "--discern-color-accent-500",
        "Strong emphasis fill.",
        "active-ink",
        accent500Expression,
        accent500Projection,
      ),
      role(
        "--discern-color-accent-600",
        "Default emphasis action.",
        "active-ink",
        accent600Expression,
        accent600Projection,
      ),
      role(
        "--discern-color-accent-700",
        "Strong emphasis text.",
        "active-ink",
        accent700Expression,
        accent700Projection,
      ),
      role(
        "--discern-color-accent-800",
        "Deepest emphasis text.",
        "active-ink",
        accent800Expression,
        accent800Projection,
      ),
      role(
        "--discern-color-border",
        "Structural hairline ink.",
        "active-ink",
        scaledCurve([0.12, 0.16, 0.2, 0.16, 0.14], "structure"),
        undefined,
      ),
      role(
        "--discern-color-border-strong",
        "Emphasised structural ink.",
        "active-ink",
        borderStrongExpression,
        undefined,
      ),
      role(
        "--discern-color-stripe",
        "Decorative structural hatch ink.",
        "active-ink",
        scaledCurve([0.07, 0.1, 0.14, 0.11, 0.09], "structure"),
        undefined,
      ),
      role(
        "--discern-color-success",
        "Successful outcome hierarchy; meaning also requires a non-colour witness.",
        "active-ink",
        successExpression,
        successProjection,
      ),
      role(
        "--discern-color-success-soft",
        "Translucent successful-outcome wash.",
        "active-ink",
        accent100Expression,
        successSoftProjection,
      ),
      role(
        "--discern-color-success-deep",
        "Successful-outcome text on its wash.",
        "active-ink",
        scaledCurve([0.82, 0.86, 0.9, 0.9, 0.9], "emphasis"),
        successDeepProjection,
      ),
      role(
        "--discern-color-warning",
        "Warning hierarchy; meaning also requires a non-colour witness.",
        "active-ink",
        warningExpression,
        warningProjection,
      ),
      role(
        "--discern-color-warning-soft",
        "Translucent warning wash.",
        "active-ink",
        warningSoftExpression,
        warningSoftProjection,
      ),
      role(
        "--discern-color-warning-deep",
        "Warning text on its wash.",
        "active-ink",
        scaledCurve([0.78, 0.82, 0.86, 0.86, 0.86], "emphasis"),
        warningDeepProjection,
      ),
      role(
        "--discern-color-danger",
        "Danger hierarchy; meaning also requires a non-colour witness.",
        "active-ink",
        dangerExpression,
        dangerProjection,
      ),
      role(
        "--discern-color-danger-soft",
        "Translucent danger wash.",
        "active-ink",
        dangerSoftExpression,
        dangerSoftProjection,
      ),
      role(
        "--discern-shadow-color",
        "Active-ink shadow pigment.",
        "active-ink",
        one,
        undefined,
      ),
      role(
        "--discern-color-overlay",
        "Black overlay pigment with a darkness-dependent alpha.",
        "ink-pigment",
        curve([0.38, 0.44, 0.5, 0.56, 0.62]),
        undefined,
      ),
      role(
        "--discern-color-accent-ink",
        "Polarity-responsive accent ink for concise emphasis and data marks.",
        "active-ink",
        accentInkExpression,
        accent600Projection,
      ),
      role(
        "--discern-color-brand-artwork-mask",
        "Paper-pigment silhouette revealed only on dark-polarity canvases.",
        "paper-pigment",
        brandArtworkMaskExpression,
        undefined,
      ),
      role(
        "--discern-color-brand-artwork-ink",
        "Contrast ink for branded artwork and its monochrome silhouette.",
        "active-ink",
        brandArtworkInkExpression,
        brandArtworkInkProjection,
      ),
      role(
        "--discern-color-action-edge",
        "Polarity-responsive edge for an emphasised action.",
        "active-ink",
        accentInkExpression,
        accent700Projection,
      ),
      role(
        "--discern-color-action-shadow",
        "Structure-responsive hard shadow separated from action fill and canvas.",
        "active-ink",
        actionShadowExpression,
        undefined,
      ),
      role(
        "--discern-color-neutral-edge",
        "Polarity-responsive edge for a neutral control.",
        "active-ink",
        neutralEdgeExpression,
        undefined,
      ),
      role(
        "--discern-color-neutral-shadow",
        "Polarity-responsive hard shadow for a neutral control.",
        "active-ink",
        neutralShadowExpression,
        undefined,
      ),
      role(
        "--discern-color-avatar-highlight",
        "Paper-pigment highlight for an illustrated identity fill.",
        "paper-pigment",
        avatarHighlightExpression,
        undefined,
      ),
      role(
        "--discern-color-avatar-fill-start",
        "Opaque opening base stop of the illustrated identity fill.",
        "owned-surface",
        avatarFillStartExpression,
        avatarFillStartProjection,
      ),
      role(
        "--discern-color-avatar-fill-end",
        "Opaque closing base stop of the illustrated identity fill.",
        "owned-surface",
        avatarFillEndExpression,
        avatarFillEndProjection,
      ),
    ] as const satisfies readonly AppearanceColorRoleLaw[],
  );

/** Public colour-role name. */
export type AppearanceColorRoleName =
  typeof appearanceColorRoleLaws[number]["name"];

/** Metadata predicate enrolling every role that must own its painted backdrop. */
export function ownedSurfaceRoleNames(
  laws: readonly Pick<AppearanceColorRoleLaw, "name" | "ownedSurface">[] =
    appearanceColorRoleLaws,
): readonly `--discern-${string}`[] {
  return laws.filter((law) => law.ownedSurface).map((law) => law.name);
}

/** One shadow role whose opacity follows the structure axis. */
export interface AppearanceShadowRoleLaw {
  readonly name: `--discern-${string}`;
  readonly description: string;
  readonly offset: string;
  readonly expression: AppearanceExpression;
}

/** Shadow geometry and alpha laws retained as Shape Theme Tokens. */
export const appearanceShadowRoleLaws: readonly AppearanceShadowRoleLaw[] =
  Object.freeze(
    [
      {
        name: "--discern-shadow-card",
        description:
          "Quiet elevation for a standalone card; nested cards do not repeat it.",
        offset: "2px 2px 0",
        expression: scaledCurve([0.04, 0.06, 0.08, 0.1, 0.1], "structure"),
      },
      {
        name: "--discern-shadow-window",
        description: "Hard-offset presentation window shadow.",
        offset: "4px 5px 0",
        expression: scaledCurve([0.06, 0.09, 0.12, 0.16, 0.16], "structure"),
      },
      {
        name: "--discern-shadow-pop",
        description: "Raised overlay shadow.",
        offset: "6px 6px 0",
        expression: scaledCurve([0.12, 0.16, 0.22, 0.28, 0.28], "structure"),
      },
    ] as const satisfies readonly AppearanceShadowRoleLaw[],
  );

/** Public shadow-role name. */
export type AppearanceShadowRoleName =
  typeof appearanceShadowRoleLaws[number]["name"];

/** Darkness samples signed off by the exploratory proof of concept. */
export const APPEARANCE_CONTRAST_SAMPLE_DARKNESSES = [
  0,
  0.25,
  0.5,
  0.75,
  1,
] as const;

/** Contrast floors for the three legibility rungs. */
export const APPEARANCE_INK_CONTRAST_FLOORS = Object.freeze(
  [
    ["--discern-color-ink", 7],
    ["--discern-color-ink-muted", 4.5],
    ["--discern-color-ink-faint", 3],
  ] as const satisfies readonly (readonly [AppearanceColorRoleName, number])[],
);

/**
 * Fill omitted coordinates from the default appearance, validate every axis
 * against its documented bounds, and normalise a supplied accent hue. The
 * result carries no `accent` key at all for the monochrome projection.
 */
export function resolveAppearance(
  appearance: Partial<Appearance> = {},
): Appearance {
  const axes = Object.fromEntries(appearanceAxisNames.map((axis) => {
    const value = appearance[axis] ?? appearanceAxes[axis].default;
    const definition = appearanceAxes[axis];
    if (
      !Number.isFinite(value) || value < definition.minimum ||
      value > definition.maximum
    ) {
      throw new TypeError(
        `Appearance axis ${axis}=${value} is outside [${definition.minimum}, ${definition.maximum}]`,
      );
    }
    return [axis, value];
  })) as Record<AppearanceAxisName, number>;
  const resolved: Appearance = appearance.accent === undefined
    ? axes
    : { ...axes, accent: normalizeAccentHue(appearance.accent) };
  return Object.freeze(resolved);
}

function evaluateResolvedExpression(
  expression: AppearanceExpression,
  resolved: Appearance,
): number {
  const accentHue = resolved.accent ?? DEFAULT_ACCENT_HUE;
  const evaluate = (node: AppearanceExpression): number => {
    switch (node.kind) {
      case "number":
        return node.value;
      case "axis":
        return node.axis === "accent-hue" ? accentHue : resolved[node.axis];
      case "add":
        return evaluate(node.left) + evaluate(node.right);
      case "subtract":
        return evaluate(node.left) - evaluate(node.right);
      case "multiply":
        return evaluate(node.left) * evaluate(node.right);
      case "divide":
        return evaluate(node.left) / evaluate(node.right);
      case "min":
        return Math.min(...node.values.map(evaluate));
      case "max":
        return Math.max(...node.values.map(evaluate));
      case "clamp":
        return Math.min(
          evaluate(node.maximum),
          Math.max(evaluate(node.minimum), evaluate(node.value)),
        );
      case "abs":
        return Math.abs(evaluate(node.value));
      case "round": {
        const interval = evaluate(node.interval);
        const quotient = evaluate(node.value) / interval;
        const rounded = node.strategy === "up"
          ? Math.ceil(quotient)
          : Math.round(quotient);
        return roundDecimal(
          rounded * interval,
          12,
        );
      }
      case "lerp": {
        const position = evaluate(node.position);
        return evaluate(node.from) * (1 - position) +
          evaluate(node.to) * position;
      }
    }
  };
  return evaluate(expression);
}

/** Evaluate one shared expression at a validated appearance. */
export function evaluateAppearanceExpression(
  expression: AppearanceExpression,
  appearance: Partial<Appearance> = {},
): number {
  return evaluateResolvedExpression(expression, resolveAppearance(appearance));
}

interface EvaluatedRoleColor {
  readonly color: OklabColor;
  readonly alpha: number;
}

/** Evaluate one pigment law to an OKLab colour at a resolved appearance. */
export function evaluatePigment(
  law: AppearancePigmentLaw,
  appearance: Partial<Appearance> = {},
): OklabColor {
  const resolved = resolveAppearance(appearance);
  const chroma = evaluateResolvedExpression(law.chroma, resolved);
  const radians = evaluateResolvedExpression(law.hue, resolved) * Math.PI /
    180;
  return {
    lightness: evaluateResolvedExpression(law.lightness, resolved),
    a: chroma * Math.cos(radians),
    b: chroma * Math.sin(radians),
  };
}

interface ResolvedPigments {
  readonly paper: OklabColor;
  readonly ink: OklabColor;
  readonly canvas: OklabColor;
  readonly active: OklabColor;
  readonly opposite: OklabColor;
}

function resolvePigments(resolved: Appearance): ResolvedPigments {
  const paper = evaluatePigment(appearancePigmentLaws.paper, resolved);
  const ink = evaluatePigment(appearancePigmentLaws.ink, resolved);
  const darkness = resolved.darkness;
  const canvas: OklabColor = {
    lightness: paper.lightness * (1 - darkness) + ink.lightness * darkness,
    a: paper.a * (1 - darkness) + ink.a * darkness,
    b: paper.b * (1 - darkness) + ink.b * darkness,
  };
  const paperWins =
    evaluateResolvedExpression(appearancePolarityExpression, resolved) === 1;
  return paperWins
    ? { paper, ink, canvas, active: paper, opposite: ink }
    : { paper, ink, canvas, active: ink, opposite: paper };
}

function evaluateStructuredMono(
  resolved: Appearance,
): Readonly<Record<AppearanceColorRoleName, EvaluatedRoleColor>> {
  const { paper, ink, canvas, active, opposite } = resolvePigments(resolved);
  return Object.freeze(Object.fromEntries(appearanceColorRoleLaws.map((law) => {
    const amount = evaluateResolvedExpression(law.expression, resolved);
    let evaluated: EvaluatedRoleColor;
    switch (law.paint) {
      case "canvas":
        evaluated = { color: canvas, alpha: 1 };
        break;
      case "active-ink":
        evaluated = { color: active, alpha: amount };
        break;
      case "opposite-ink":
        evaluated = { color: opposite, alpha: amount };
        break;
      case "raised-surface":
      case "owned-surface":
        evaluated = { color: compositeOklab(active, amount, canvas), alpha: 1 };
        break;
      case "ink-pigment":
        evaluated = { color: ink, alpha: amount };
        break;
      case "paper-pigment":
        evaluated = { color: paper, alpha: amount };
        break;
    }
    return [law.name, evaluated];
  })) as Record<AppearanceColorRoleName, EvaluatedRoleColor>);
}

function evaluateStructuredAppearance(
  appearance: Partial<Appearance>,
): Readonly<Record<AppearanceColorRoleName, EvaluatedRoleColor>> {
  const resolved = resolveAppearance(appearance);
  const mono = evaluateStructuredMono(resolved);
  if (resolved.accent === undefined) return mono;

  return Object.freeze(Object.fromEntries(appearanceColorRoleLaws.map((law) => {
    if (law.accent === "mono") {
      return [law.name, mono[law.name]];
    }
    const lightness = evaluateResolvedExpression(
      law.accent.lightness,
      resolved,
    );
    const chroma = evaluateResolvedExpression(law.accent.chroma, resolved);
    const projectedHue = evaluateResolvedExpression(law.accent.hue, resolved);
    const radians = projectedHue * Math.PI / 180;
    return [law.name, {
      color: {
        lightness,
        a: chroma * Math.cos(radians),
        b: chroma * Math.sin(radians),
      },
      alpha: evaluateResolvedExpression(law.accent.alpha, resolved),
    }];
  })) as Record<AppearanceColorRoleName, EvaluatedRoleColor>);
}

function roundDecimal(value: number, places: number): number {
  const scale = 10 ** places;
  const roundedMagnitude = Math.round(Math.abs(value) * scale) / scale;
  return Math.sign(value) * roundedMagnitude;
}

function formattedNumber(value: number, places = 4): string {
  const roundedValue = roundDecimal(value, places);
  return Object.is(roundedValue, -0) ? "0" : String(roundedValue);
}

function formatOklch({ color, alpha }: EvaluatedRoleColor): string {
  const chroma = Math.hypot(color.a, color.b);
  const hue = chroma < 0.0000001
    ? 0
    : ((Math.atan2(color.b, color.a) * 180 / Math.PI) + 360) % 360;
  const base = `oklch(${formattedNumber(color.lightness * 100)}% ${
    formattedNumber(chroma)
  } ${formattedNumber(hue)}`;
  return alpha === 1 ? `${base})` : `${base} / ${formattedNumber(alpha)})`;
}

function requiredRoleValue<Value>(
  values: Readonly<Record<AppearanceColorRoleName, Value>>,
  name: AppearanceColorRoleName,
): Value {
  const value = values[name];
  if (value === undefined) {
    throw new TypeError(`Appearance did not evaluate ${name}`);
  }
  return value;
}

/**
 * Evaluate every role at one appearance, preserving alpha only for
 * backdrop-owned washes. Omitted coordinates take the default appearance.
 */
export function evaluateAppearance(
  appearance: Partial<Appearance> = {},
): Readonly<Record<AppearanceColorRoleName, string>> {
  const values = evaluateStructuredAppearance(appearance);
  return Object.freeze(Object.fromEntries(
    appearanceColorRoleLaws.map((law) => [
      law.name,
      formatOklch(requiredRoleValue(values, law.name)),
    ]),
  ) as Record<AppearanceColorRoleName, string>);
}

/** Evaluate every role composited over its inherited opaque canvas. */
export function evaluateOpaqueAppearance(
  appearance: Partial<Appearance> = {},
): Readonly<Record<AppearanceColorRoleName, string>> {
  const values = evaluateStructuredAppearance(appearance);
  const canvas = requiredRoleValue(
    values,
    "--discern-color-canvas",
  ).color;
  return Object.freeze(Object.fromEntries(appearanceColorRoleLaws.map((law) => {
    const value = requiredRoleValue(values, law.name);
    return [
      law.name,
      formatOklch({
        color: compositeOklab(value.color, value.alpha, canvas),
        alpha: 1,
      }),
    ];
  })) as Record<AppearanceColorRoleName, string>);
}

/** Density-scaled spacing unit for projections that opt into the density axis. */
export function evaluateAppearanceSpacingUnit(
  appearance: Partial<Appearance> = {},
): number {
  return APPEARANCE_SPACING_UNIT_PX * resolveAppearance(appearance).density;
}

/** Evaluate appearance-derived shadows without restating their alpha ladder. */
export function evaluateAppearanceShadows(
  appearance: Partial<Appearance> = {},
): Readonly<Record<AppearanceShadowRoleName, string>> {
  const resolved = resolveAppearance(appearance);
  return Object.freeze(
    Object.fromEntries(appearanceShadowRoleLaws.map((law) => {
      const alpha = evaluateResolvedExpression(law.expression, resolved);
      return [
        law.name,
        `${law.offset} color-mix(in oklab, var(--discern-shadow-color) ${
          formattedNumber(alpha * 100)
        }%, transparent)`,
      ];
    })) as Record<AppearanceShadowRoleName, string>,
  );
}

/** Minimum sampled contrast headroom over the three ink-rung floors. */
export function appearanceContrastMargin(): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (const darkness of APPEARANCE_CONTRAST_SAMPLE_DARKNESSES) {
    const resolved = resolveAppearance({ darkness });
    const values = evaluateStructuredMono(resolved);
    const canvas = requiredRoleValue(
      values,
      "--discern-color-canvas",
    ).color;
    const maximum = oklabContrast(resolvePigments(resolved).active, canvas);
    for (const [name, floor] of APPEARANCE_INK_CONTRAST_FLOORS) {
      const value = requiredRoleValue(values, name);
      const opaque = compositeOklab(value.color, value.alpha, canvas);
      minimum = Math.min(
        minimum,
        oklabContrast(opaque, canvas) - Math.min(floor, maximum),
      );
    }
  }
  return roundDecimal(minimum, 6);
}
