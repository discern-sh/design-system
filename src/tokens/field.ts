/**
 * Field/Accent authority for every non-series colour role. One ordered law
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

/** Numeric axes accepted by the monochrome field. */
export type FieldAxisName =
  | "darkness"
  | "structure"
  | "emphasis"
  | "density";

/** Documented bounds and default for one field axis. */
export interface FieldAxisDefinition {
  readonly minimum: number;
  readonly maximum: number;
  readonly default: number;
  readonly description: string;
}

/** Axis definitions shared by evaluation and the later live-CSS projection. */
export const fieldAxes = Object.freeze(
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
  } as const satisfies Readonly<Record<FieldAxisName, FieldAxisDefinition>>,
);

/** A fully resolved point in the monochrome field. */
export interface FieldPoint {
  readonly darkness: number;
  readonly structure: number;
  readonly emphasis: number;
  readonly density: number;
}

/** Public browser and terminal vocabulary for one appearance identity. */
export type AppearanceName = "field" | "accent";

/** Achromatic appearance identity. */
export interface FieldAppearance {
  readonly name: "field";
}

/** Hue-parameterised chromatic appearance identity. */
export interface AccentAppearance {
  readonly name: "accent";
  readonly hue: number;
}

/** Explicit appearance input shared by every pure projection. */
export type Appearance = FieldAppearance | AccentAppearance;

/** Default achromatic appearance. */
export const fieldAppearance: FieldAppearance = Object.freeze({
  name: "field",
});

/** Default hue retained by the named Blue compatibility projection. */
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

/** Construct one validated chromatic appearance input. */
export function accentAppearance(hue: number): AccentAppearance {
  return Object.freeze({ name: "accent", hue: normalizeAccentHue(hue) });
}

/** Default field point used when an axis is omitted. */
export const defaultFieldPoint: FieldPoint = Object.freeze({
  darkness: fieldAxes.darkness.default,
  structure: fieldAxes.structure.default,
  emphasis: fieldAxes.emphasis.default,
  density: fieldAxes.density.default,
});

/** One named scalar shared wherever the same number enters multiple laws. */
export interface FieldNumberExpression {
  readonly kind: "number";
  readonly name: string;
  readonly value: number;
}

/** One field-axis reference. */
export interface FieldAxisExpression {
  readonly kind: "axis";
  readonly axis: FieldAxisName | "accent-hue";
}

/** Minimal CSS-calc-compatible numeric expression vocabulary for field laws. */
export type FieldExpression =
  | FieldNumberExpression
  | FieldAxisExpression
  | {
    readonly kind: "add" | "subtract" | "multiply" | "divide";
    readonly left: FieldExpression;
    readonly right: FieldExpression;
  }
  | {
    readonly kind: "min" | "max";
    readonly values: readonly FieldExpression[];
  }
  | {
    readonly kind: "clamp";
    readonly minimum: FieldExpression;
    readonly value: FieldExpression;
    readonly maximum: FieldExpression;
  }
  | { readonly kind: "abs"; readonly value: FieldExpression }
  | {
    readonly kind: "round";
    readonly strategy?: "nearest" | "up";
    readonly value: FieldExpression;
    readonly interval: FieldExpression;
  }
  | {
    readonly kind: "lerp";
    readonly from: FieldExpression;
    readonly to: FieldExpression;
    readonly position: FieldExpression;
  };

const numberNodes = new Map<number, FieldNumberExpression>();

function numberName(value: number): string {
  if (value === 0) return "zero";
  if (value === 1) return "one";
  return `n_${String(value).replace("-", "negative_").replace(".", "_")}`;
}

function numberNode(value: number): FieldNumberExpression {
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

const zero: FieldNumberExpression = numberNode(0);
const one: FieldNumberExpression = numberNode(1);
const two: FieldNumberExpression = numberNode(2);
const quarter: FieldNumberExpression = numberNode(0.25);
const roundingInterval: FieldNumberExpression = numberNode(0.0001);
const axisNodes = Object.freeze(
  {
    darkness: { kind: "axis", axis: "darkness" },
    structure: { kind: "axis", axis: "structure" },
    emphasis: { kind: "axis", axis: "emphasis" },
    density: { kind: "axis", axis: "density" },
  } as const satisfies Readonly<Record<FieldAxisName, FieldAxisExpression>>,
);
const accentHueAxis: FieldAxisExpression = Object.freeze({
  kind: "axis",
  axis: "accent-hue",
});

const binary = (
  kind: "add" | "subtract" | "multiply" | "divide",
  left: FieldExpression,
  right: FieldExpression,
): FieldExpression => ({ kind, left, right });
const clamp = (value: FieldExpression): FieldExpression => ({
  kind: "clamp",
  minimum: zero,
  value,
  maximum: one,
});
const bounded = (
  minimum: number,
  value: FieldExpression,
  maximum: number,
): FieldExpression => ({
  kind: "clamp",
  minimum: numberNode(minimum),
  value,
  maximum: numberNode(maximum),
});
const rounded = (value: FieldExpression): FieldExpression => ({
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
): FieldExpression {
  if (values.every((value) => value === values[0])) {
    return numberNode(values[0]);
  }
  let expression: FieldExpression = numberNode(values[0]);
  for (let index = 1; index < values.length; index += 1) {
    const from = numberNode(values[index - 1] ?? 0);
    const to = numberNode(values[index] ?? 0);
    const position = curveSegmentPositions[index - 1];
    if (position === undefined) {
      throw new TypeError(`Missing field curve segment ${index - 1}`);
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
): FieldExpression {
  return rounded(clamp(binary("multiply", curve(values), axisNodes[axis])));
}

function boundedScaledCurve(
  values: readonly [number, number, number, number, number],
  axis: "structure" | "emphasis",
  minimum: number,
  maximum: number,
): FieldExpression {
  return rounded(bounded(
    minimum,
    binary("multiply", curve(values), axisNodes[axis]),
    maximum,
  ));
}

/** Paper and ink pigments authored once in OKLab. */
export const fieldPigments = Object.freeze(
  {
    paper: { lightness: 1, a: 0, b: 0 },
    ink: { lightness: 0, a: 0, b: 0 },
  } as const satisfies Readonly<Record<"paper" | "ink", OklabColor>>,
);

/** Relative-luminance crossover where black and white ink have equal contrast. */
export const FIELD_POLARITY_CROSSOVER = 0.179;

/** Darkness coordinate whose neutral canvas reaches the polarity crossover. */
export const FIELD_POLARITY_CROSSOVER_DARKNESS: number = 1 -
  Math.cbrt(FIELD_POLARITY_CROSSOVER);

const paperLightness = numberNode(fieldPigments.paper.lightness);
const inkLightness = numberNode(fieldPigments.ink.lightness);

/** Canvas OKLab lightness derived from the field darkness axis. */
export const fieldCanvasLightnessExpression: FieldExpression = {
  kind: "lerp",
  from: paperLightness,
  to: inkLightness,
  position: axisNodes.darkness,
};

const canvasLightnessSquared = binary(
  "multiply",
  fieldCanvasLightnessExpression,
  fieldCanvasLightnessExpression,
);
const canvasRelativeLuminance = binary(
  "multiply",
  canvasLightnessSquared,
  fieldCanvasLightnessExpression,
);
const polarityDelta = binary(
  "subtract",
  numberNode(FIELD_POLARITY_CROSSOVER),
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
export const fieldPolarityExpression: FieldExpression = {
  kind: "round",
  strategy: "up",
  value: positivePolarityDelta,
  interval: one,
};

/** Current canvas-contrast pigment lightness. */
export const fieldActiveLightnessExpression: FieldExpression = {
  kind: "lerp",
  from: inkLightness,
  to: paperLightness,
  position: fieldPolarityExpression,
};

/** Pigment lightness opposite the current canvas-contrast pigment. */
export const fieldOppositeLightnessExpression: FieldExpression = {
  kind: "lerp",
  from: paperLightness,
  to: inkLightness,
  position: fieldPolarityExpression,
};

/**
 * Numeric spacing fact retained for non-browser projections. Browser density
 * scales spacing only and never changes font size.
 */
export const FIELD_SPACING_UNIT_PX = 4;

/** Pigment treatment applied to one field role's scalar expression. */
export type FieldPaint =
  | "canvas"
  | "active-ink"
  | "opposite-ink"
  | "raised-surface"
  | "owned-surface"
  | "ink-pigment"
  | "paper-pigment";

/** One chromatic projection carried beside its achromatic role law. */
export interface AccentColorProjection {
  readonly lightness: FieldExpression;
  readonly chroma: FieldExpression;
  readonly hue: FieldExpression;
  readonly alpha: FieldExpression;
}

/** One public colour role and its sole field expression. */
export interface FieldColorRoleLaw {
  readonly name: `--discern-${string}`;
  readonly description: string;
  readonly paint: FieldPaint;
  readonly expression: FieldExpression;
  readonly accent: AccentColorProjection | "field";
  readonly ownedSurface: boolean;
}

const role = <
  const Name extends `--discern-${string}`,
  const Accent extends AccentColorProjection | undefined,
>(
  name: Name,
  description: string,
  paint: FieldPaint,
  expression: FieldExpression,
  accent: Accent,
) => ({
  name,
  description,
  paint,
  expression,
  accent: accent ?? "field",
  ownedSurface: paint === "canvas" || paint === "raised-surface" ||
    paint === "owned-surface",
} as const);

const polaritySelection = (
  light: FieldExpression,
  dark: FieldExpression,
): FieldExpression => ({
  kind: "lerp",
  from: light,
  to: dark,
  position: fieldPolarityExpression,
});
const weightedMix = (
  from: FieldExpression,
  to: FieldExpression,
  toWeight: number,
): FieldExpression => ({
  kind: "lerp",
  from,
  to,
  position: numberNode(toWeight),
});

const lightPolarityProgress = clamp(binary(
  "divide",
  axisNodes.darkness,
  numberNode(FIELD_POLARITY_CROSSOVER_DARKNESS),
));
const darkPolarityProgress = clamp(binary(
  "divide",
  binary(
    "subtract",
    axisNodes.darkness,
    numberNode(FIELD_POLARITY_CROSSOVER_DARKNESS),
  ),
  numberNode(1 - FIELD_POLARITY_CROSSOVER_DARKNESS),
));

function polarCurve(
  lightPole: number,
  lightCrossover: number,
  darkCrossover: number,
  darkPole: number,
): FieldExpression {
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
  hue: FieldExpression,
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

const inkExpression: FieldExpression = {
  kind: "max",
  values: [
    curve([0.87, 0.84, 1, 0.96, 0.92]),
    polarCurve(0.87, 1, 1, 0.92),
  ],
};
const inkMutedExpression = polarCurve(0.66, 1, 1, 0.72);
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
  0.55,
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
  [0.38, 0.36, 0.3, 0.36, 0.42],
  "emphasis",
  0.2,
  0.55,
);
const warningExpression = boundedScaledCurve(
  [0.62, 0.6, 0.58, 0.62, 0.66],
  "emphasis",
  0.35,
  0.74,
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
const actionShadowExpression = polaritySelection(accent600Expression, one);
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
 * derives from this table; an Accent projection is metadata beside the Field
 * law, not a second role population.
 */
export const fieldColorRoleLaws: readonly FieldColorRoleLaw[] = Object.freeze(
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
      fieldCanvasLightnessExpression,
      undefined,
    ),
    role(
      "--discern-color-surface",
      "Opaque raised surface, composited once over canvas.",
      "raised-surface",
      curve([0, 0.04, 0.07, 0.07, 0.07]),
      undefined,
    ),
    role(
      "--discern-color-surface-sunken",
      "Translucent inset wash used only over an owned opaque canvas.",
      "active-ink",
      curve([0.04, 0.06, 0.08, 0.05, 0.03]),
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
      "Primary action fill: full active ink in the field.",
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
      scaledCurve([0.14, 0.18, 0.24, 0.19, 0.16], "structure"),
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
      "Polarity-responsive hard shadow for an emphasised action.",
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
      "Opening stop of the illustrated identity fill.",
      "active-ink",
      avatarFillStartExpression,
      avatarFillStartProjection,
    ),
    role(
      "--discern-color-avatar-fill-end",
      "Closing stop of the illustrated identity fill.",
      "active-ink",
      avatarFillEndExpression,
      avatarFillEndProjection,
    ),
  ] as const satisfies readonly FieldColorRoleLaw[],
);

/** Public field colour-role name. */
export type FieldColorRoleName = typeof fieldColorRoleLaws[number]["name"];

/** One shadow role whose opacity follows the field's structure axis. */
export interface FieldShadowRoleLaw {
  readonly name: `--discern-${string}`;
  readonly description: string;
  readonly offset: string;
  readonly expression: FieldExpression;
}

/** Shadow geometry and alpha laws retained as Shape Theme Tokens. */
export const fieldShadowRoleLaws: readonly FieldShadowRoleLaw[] = Object.freeze(
  [
    {
      name: "--discern-shadow-card",
      description: "Quiet hard-offset card shadow.",
      offset: "4px 4px 0",
      expression: scaledCurve([0.06, 0.08, 0.12, 0.15, 0.16], "structure"),
    },
    {
      name: "--discern-shadow-window",
      description: "Hard-offset presentation window shadow.",
      offset: "8px 10px 0",
      expression: scaledCurve([0.06, 0.1, 0.16, 0.2, 0.2], "structure"),
    },
    {
      name: "--discern-shadow-pop",
      description: "Raised overlay shadow.",
      offset: "6px 6px 0",
      expression: scaledCurve([0.12, 0.16, 0.22, 0.28, 0.28], "structure"),
    },
  ] as const satisfies readonly FieldShadowRoleLaw[],
);

/** Public field-derived shadow-role name. */
export type FieldShadowRoleName = typeof fieldShadowRoleLaws[number]["name"];

/** Field samples signed off by the monochrome-field proof of concept. */
export const FIELD_CONTRAST_SAMPLE_DARKNESSES = [
  0,
  0.25,
  0.5,
  0.75,
  1,
] as const;

/** Contrast floors for the three legibility rungs. */
export const FIELD_INK_CONTRAST_FLOORS = Object.freeze(
  [
    ["--discern-color-ink", 7],
    ["--discern-color-ink-muted", 4.5],
    ["--discern-color-ink-faint", 3],
  ] as const satisfies readonly (readonly [FieldColorRoleName, number])[],
);

function resolveFieldPoint(point: Partial<FieldPoint>): FieldPoint {
  const resolved = { ...defaultFieldPoint, ...point };
  for (const axis of Object.keys(fieldAxes) as FieldAxisName[]) {
    const value = resolved[axis];
    const definition = fieldAxes[axis];
    if (
      !Number.isFinite(value) || value < definition.minimum ||
      value > definition.maximum
    ) {
      throw new TypeError(
        `Field axis ${axis}=${value} is outside [${definition.minimum}, ${definition.maximum}]`,
      );
    }
  }
  return Object.freeze(resolved);
}

function evaluateResolvedExpression(
  expression: FieldExpression,
  resolved: FieldPoint,
  accentHue: number,
): number {
  const evaluate = (node: FieldExpression): number => {
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

/** Evaluate one field expression at a validated point. */
export function evaluateFieldExpression(
  expression: FieldExpression,
  point: Partial<FieldPoint> = {},
): number {
  return evaluateResolvedExpression(
    expression,
    resolveFieldPoint(point),
    DEFAULT_ACCENT_HUE,
  );
}

/** Evaluate one shared expression for an explicit appearance and field point. */
export function evaluateAppearanceExpression(
  expression: FieldExpression,
  appearance: Appearance,
  point: Partial<FieldPoint> = {},
): number {
  const hue = appearance.name === "accent"
    ? normalizeAccentHue(appearance.hue)
    : DEFAULT_ACCENT_HUE;
  return evaluateResolvedExpression(expression, resolveFieldPoint(point), hue);
}

interface EvaluatedFieldColor {
  readonly color: OklabColor;
  readonly alpha: number;
}

function activePigments(point: Partial<FieldPoint>): {
  readonly active: OklabColor;
  readonly opposite: OklabColor;
} {
  const paperWins = evaluateFieldExpression(fieldPolarityExpression, point) ===
    1;
  return paperWins
    ? { active: fieldPigments.paper, opposite: fieldPigments.ink }
    : { active: fieldPigments.ink, opposite: fieldPigments.paper };
}

function evaluateStructuredField(
  point: Partial<FieldPoint>,
): Readonly<Record<FieldColorRoleName, EvaluatedFieldColor>> {
  const resolved = resolveFieldPoint(point);
  const canvasLaw = fieldColorRoleLaws.find((law) => law.paint === "canvas");
  if (canvasLaw === undefined) throw new TypeError("Field has no canvas law");
  const canvas: OklabColor = {
    lightness: evaluateFieldExpression(canvasLaw.expression, resolved),
    a: 0,
    b: 0,
  };
  const { active, opposite } = activePigments(resolved);
  return Object.freeze(Object.fromEntries(fieldColorRoleLaws.map((law) => {
    const amount = evaluateFieldExpression(law.expression, resolved);
    let evaluated: EvaluatedFieldColor;
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
        evaluated = { color: fieldPigments.ink, alpha: amount };
        break;
      case "paper-pigment":
        evaluated = { color: fieldPigments.paper, alpha: amount };
        break;
    }
    return [law.name, evaluated];
  })) as Record<FieldColorRoleName, EvaluatedFieldColor>);
}

function evaluateStructuredAppearance(
  appearance: Appearance,
  point: Partial<FieldPoint>,
): Readonly<Record<FieldColorRoleName, EvaluatedFieldColor>> {
  const resolved = resolveFieldPoint(point);
  const field = evaluateStructuredField(resolved);
  if (appearance.name === "field") return field;

  const hue = normalizeAccentHue(appearance.hue);
  return Object.freeze(Object.fromEntries(fieldColorRoleLaws.map((law) => {
    if (law.accent === "field") {
      return [law.name, field[law.name]];
    }
    const lightness = evaluateResolvedExpression(
      law.accent.lightness,
      resolved,
      hue,
    );
    const chroma = evaluateResolvedExpression(
      law.accent.chroma,
      resolved,
      hue,
    );
    const projectedHue = evaluateResolvedExpression(
      law.accent.hue,
      resolved,
      hue,
    );
    const radians = projectedHue * Math.PI / 180;
    return [law.name, {
      color: {
        lightness,
        a: chroma * Math.cos(radians),
        b: chroma * Math.sin(radians),
      },
      alpha: evaluateResolvedExpression(law.accent.alpha, resolved, hue),
    }];
  })) as Record<FieldColorRoleName, EvaluatedFieldColor>);
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

function formatOklch({ color, alpha }: EvaluatedFieldColor): string {
  const chroma = Math.hypot(color.a, color.b);
  const hue = chroma < 0.0000001
    ? 0
    : ((Math.atan2(color.b, color.a) * 180 / Math.PI) + 360) % 360;
  const base = `oklch(${formattedNumber(color.lightness * 100)}% ${
    formattedNumber(chroma)
  } ${formattedNumber(hue)}`;
  return alpha === 1 ? `${base})` : `${base} / ${formattedNumber(alpha)})`;
}

function requiredFieldValue<Value>(
  values: Readonly<Record<FieldColorRoleName, Value>>,
  name: FieldColorRoleName,
): Value {
  const value = values[name];
  if (value === undefined) {
    throw new TypeError(`Field did not evaluate ${name}`);
  }
  return value;
}

/** Evaluate every field role, preserving alpha only for backdrop-owned washes. */
export function evaluateField(
  point: Partial<FieldPoint> = {},
): Readonly<Record<FieldColorRoleName, string>> {
  return evaluateAppearance(fieldAppearance, point);
}

/** Evaluate every role for one explicit appearance and field point. */
export function evaluateAppearance(
  appearance: Appearance,
  point: Partial<FieldPoint> = {},
): Readonly<Record<FieldColorRoleName, string>> {
  const values = evaluateStructuredAppearance(appearance, point);
  return Object.freeze(Object.fromEntries(
    fieldColorRoleLaws.map((law) => [
      law.name,
      formatOklch(requiredFieldValue(values, law.name)),
    ]),
  ) as Record<FieldColorRoleName, string>);
}

/** Evaluate every field role as an opaque colour composited over its canvas. */
export function evaluateOpaqueField(
  point: Partial<FieldPoint> = {},
): Readonly<Record<FieldColorRoleName, string>> {
  return evaluateOpaqueAppearance(fieldAppearance, point);
}

/** Evaluate appearance roles composited over their inherited opaque canvas. */
export function evaluateOpaqueAppearance(
  appearance: Appearance,
  point: Partial<FieldPoint> = {},
): Readonly<Record<FieldColorRoleName, string>> {
  const values = evaluateStructuredAppearance(appearance, point);
  const canvas = requiredFieldValue(
    values,
    "--discern-color-canvas",
  ).color;
  return Object.freeze(Object.fromEntries(fieldColorRoleLaws.map((law) => {
    const value = requiredFieldValue(values, law.name);
    return [
      law.name,
      formatOklch({
        color: compositeOklab(value.color, value.alpha, canvas),
        alpha: 1,
      }),
    ];
  })) as Record<FieldColorRoleName, string>);
}

/** Density-scaled spacing unit for projections that opt into the density axis. */
export function evaluateFieldSpacingUnit(
  point: Partial<FieldPoint> = {},
): number {
  return FIELD_SPACING_UNIT_PX * resolveFieldPoint(point).density;
}

/** Evaluate field-derived shadows without restating their alpha ladder. */
export function evaluateFieldShadows(
  point: Partial<FieldPoint> = {},
): Readonly<Record<FieldShadowRoleName, string>> {
  return Object.freeze(Object.fromEntries(fieldShadowRoleLaws.map((law) => {
    const alpha = evaluateFieldExpression(law.expression, point);
    return [
      law.name,
      `${law.offset} color-mix(in oklab, var(--discern-shadow-color) ${
        formattedNumber(alpha * 100)
      }%, transparent)`,
    ];
  })) as Record<FieldShadowRoleName, string>);
}

/** Minimum sampled contrast headroom over the field's three ink-rung floors. */
export function fieldContrastMargin(): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (const darkness of FIELD_CONTRAST_SAMPLE_DARKNESSES) {
    const values = evaluateStructuredField({ darkness });
    const canvas = requiredFieldValue(
      values,
      "--discern-color-canvas",
    ).color;
    const maximum = oklabContrast(
      activePigments({ darkness }).active,
      canvas,
    );
    for (const [name, floor] of FIELD_INK_CONTRAST_FLOORS) {
      const value = requiredFieldValue(values, name);
      const opaque = compositeOklab(value.color, value.alpha, canvas);
      minimum = Math.min(
        minimum,
        oklabContrast(opaque, canvas) - Math.min(floor, maximum),
      );
    }
  }
  return roundDecimal(minimum, 6);
}
