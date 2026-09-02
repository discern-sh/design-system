/**
 * Monochrome field authority for every non-series colour role. One ordered law
 * table supplies token pole emission, terminal projection, chart ramps, and
 * Catalogue admission arithmetic.
 *
 * @module
 */

import {
  compositeOklab,
  type OklabColor,
  oklabContrast,
  oklabRelativeLuminance,
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
      description: "Projection-time multiplier for the spacing unit.",
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
  readonly axis: FieldAxisName;
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

const zero = numberNode(0);
const one = numberNode(1);
const quarter = numberNode(0.25);
const roundingInterval = numberNode(0.0001);
const axisNodes = Object.freeze(
  {
    darkness: { kind: "axis", axis: "darkness" },
    structure: { kind: "axis", axis: "structure" },
    emphasis: { kind: "axis", axis: "emphasis" },
    density: { kind: "axis", axis: "density" },
  } as const satisfies Readonly<Record<FieldAxisName, FieldAxisExpression>>,
);

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
const rounded = (value: FieldExpression): FieldExpression => ({
  kind: "round",
  value,
  interval: roundingInterval,
});

function curve(
  values: readonly [number, number, number, number, number],
): FieldExpression {
  let expression: FieldExpression = numberNode(values[0]);
  for (let index = 1; index < values.length; index += 1) {
    const start = numberNode((index - 1) * 0.25);
    const position = clamp(binary(
      "divide",
      binary("subtract", axisNodes.darkness, start),
      quarter,
    ));
    const from = numberNode(values[index - 1] ?? 0);
    const to = numberNode(values[index] ?? 0);
    expression = binary(
      "add",
      expression,
      binary(
        "subtract",
        { kind: "lerp", from, to, position },
        from,
      ),
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

/** Paper and ink pigments authored once in OKLab. */
export const fieldPigments = Object.freeze(
  {
    paper: { lightness: 1, a: 0, b: 0 },
    ink: { lightness: 0, a: 0, b: 0 },
  } as const satisfies Readonly<Record<"paper" | "ink", OklabColor>>,
);

/** Relative-luminance crossover where black and white ink have equal contrast. */
export const FIELD_POLARITY_CROSSOVER = 0.179;

/** Numeric spacing fact; density is applied only by a projection. */
export const FIELD_SPACING_UNIT_PX = 4;

type FieldPaint =
  | "canvas"
  | "active-ink"
  | "opposite-ink"
  | "raised-surface"
  | "ink-pigment";

/** One public colour role and its sole field expression. */
export interface FieldColorRoleLaw {
  readonly name: `--discern-${string}`;
  readonly description: string;
  readonly paint: FieldPaint;
  readonly expression: FieldExpression;
  readonly bluePreset: boolean;
}

const role = <
  const Name extends `--discern-${string}`,
  const Blue extends boolean,
>(
  name: Name,
  description: string,
  paint: FieldPaint,
  expression: FieldExpression,
  bluePreset: Blue,
) => ({ name, description, paint, expression, bluePreset } as const);

/**
 * Ordered field law population. Every non-series colour Theme Token derives
 * from this table; `bluePreset` is metadata, not a second value authority.
 */
export const fieldColorRoleLaws = Object.freeze(
  [
    role(
      "--discern-color-ink",
      "Primary ink.",
      "active-ink",
      curve([0.87, 0.84, 1, 0.96, 0.92]),
      false,
    ),
    role(
      "--discern-color-ink-muted",
      "Secondary ink.",
      "active-ink",
      curve([0.66, 0.72, 0.82, 0.78, 0.72]),
      false,
    ),
    role(
      "--discern-color-ink-faint",
      "Tertiary ink.",
      "active-ink",
      curve([0.5, 0.56, 0.6, 0.6, 0.55]),
      false,
    ),
    role(
      "--discern-color-canvas",
      "Opaque page canvas.",
      "canvas",
      { kind: "lerp", from: zero, to: one, position: axisNodes.darkness },
      false,
    ),
    role(
      "--discern-color-surface",
      "Opaque raised surface, composited once over canvas.",
      "raised-surface",
      curve([0, 0.04, 0.07, 0.07, 0.07]),
      false,
    ),
    role(
      "--discern-color-surface-sunken",
      "Translucent inset wash used only over an owned opaque canvas.",
      "active-ink",
      curve([0.04, 0.06, 0.08, 0.05, 0.03]),
      false,
    ),
    role(
      "--discern-color-inverse-surface",
      "Opaque active-ink surface for bounded inverse treatments.",
      "active-ink",
      one,
      false,
    ),
    role(
      "--discern-color-inverse-ink",
      "Opposite-pigment ink for an inverse surface.",
      "opposite-ink",
      one,
      false,
    ),
    role(
      "--discern-color-action",
      "Primary action fill: full active ink in the field.",
      "active-ink",
      one,
      true,
    ),
    role(
      "--discern-color-on-action",
      "Primary action content: the opposite pigment.",
      "opposite-ink",
      one,
      true,
    ),
    role(
      "--discern-color-accent-100",
      "Subtlest translucent emphasis wash.",
      "active-ink",
      scaledCurve([0.05, 0.07, 0.12, 0.08, 0.06], "emphasis"),
      true,
    ),
    role(
      "--discern-color-accent-200",
      "Quiet translucent emphasis wash.",
      "active-ink",
      scaledCurve([0.09, 0.12, 0.18, 0.13, 0.1], "emphasis"),
      true,
    ),
    role(
      "--discern-color-accent-300",
      "Soft emphasis fill.",
      "active-ink",
      scaledCurve([0.17, 0.22, 0.28, 0.22, 0.18], "emphasis"),
      true,
    ),
    role(
      "--discern-color-accent-400",
      "Mid emphasis fill.",
      "active-ink",
      scaledCurve([0.32, 0.39, 0.44, 0.39, 0.34], "emphasis"),
      true,
    ),
    role(
      "--discern-color-accent-500",
      "Strong emphasis fill.",
      "active-ink",
      scaledCurve([0.52, 0.68, 0.8, 0.66, 0.55], "emphasis"),
      true,
    ),
    role(
      "--discern-color-accent-600",
      "Default emphasis action.",
      "active-ink",
      scaledCurve([0.82, 0.86, 0.82, 0.86, 0.85], "emphasis"),
      true,
    ),
    role(
      "--discern-color-accent-700",
      "Strong emphasis text.",
      "active-ink",
      scaledCurve([0.93, 0.96, 1, 0.96, 0.94], "emphasis"),
      true,
    ),
    role(
      "--discern-color-accent-800",
      "Deepest emphasis text.",
      "active-ink",
      scaledCurve([1, 1, 1, 1, 1], "emphasis"),
      true,
    ),
    role(
      "--discern-color-border",
      "Structural hairline ink.",
      "active-ink",
      scaledCurve([0.14, 0.18, 0.24, 0.19, 0.16], "structure"),
      false,
    ),
    role(
      "--discern-color-border-strong",
      "Emphasised structural ink.",
      "active-ink",
      scaledCurve([0.3, 0.34, 0.4, 0.35, 0.32], "structure"),
      false,
    ),
    role(
      "--discern-color-stripe",
      "Decorative structural hatch ink.",
      "active-ink",
      scaledCurve([0.07, 0.1, 0.14, 0.11, 0.09], "structure"),
      false,
    ),
    role(
      "--discern-color-success",
      "Successful outcome hierarchy; meaning also requires a non-colour witness.",
      "active-ink",
      scaledCurve([0.44, 0.42, 0.34, 0.42, 0.48], "emphasis"),
      true,
    ),
    role(
      "--discern-color-success-soft",
      "Translucent successful-outcome wash.",
      "active-ink",
      scaledCurve([0.04, 0.07, 0.12, 0.08, 0.06], "emphasis"),
      true,
    ),
    role(
      "--discern-color-success-deep",
      "Successful-outcome text on its wash.",
      "active-ink",
      scaledCurve([0.82, 0.86, 0.9, 0.9, 0.9], "emphasis"),
      true,
    ),
    role(
      "--discern-color-warning",
      "Warning hierarchy; meaning also requires a non-colour witness.",
      "active-ink",
      scaledCurve([0.62, 0.6, 0.58, 0.62, 0.66], "emphasis"),
      true,
    ),
    role(
      "--discern-color-warning-soft",
      "Translucent warning wash.",
      "active-ink",
      scaledCurve([0.07, 0.1, 0.16, 0.11, 0.09], "emphasis"),
      true,
    ),
    role(
      "--discern-color-warning-deep",
      "Warning text on its wash.",
      "active-ink",
      scaledCurve([0.78, 0.82, 0.86, 0.86, 0.86], "emphasis"),
      true,
    ),
    role(
      "--discern-color-danger",
      "Danger hierarchy; meaning also requires a non-colour witness.",
      "active-ink",
      scaledCurve([1, 1, 1, 1, 1], "emphasis"),
      true,
    ),
    role(
      "--discern-color-danger-soft",
      "Translucent danger wash.",
      "active-ink",
      scaledCurve([0.1, 0.14, 0.2, 0.15, 0.12], "emphasis"),
      true,
    ),
    role(
      "--discern-shadow-color",
      "Active-ink shadow pigment.",
      "active-ink",
      one,
      false,
    ),
    role(
      "--discern-color-overlay",
      "Black overlay pigment with a darkness-dependent alpha.",
      "ink-pigment",
      curve([0.38, 0.44, 0.5, 0.56, 0.62]),
      false,
    ),
  ] as const satisfies readonly FieldColorRoleLaw[],
);

/** Public field colour-role name. */
export type FieldColorRoleName = typeof fieldColorRoleLaws[number]["name"];

/** Metadata-derived role names the blue preset must override exhaustively. */
export type BluePresetRoleName = Extract<
  typeof fieldColorRoleLaws[number],
  { readonly bluePreset: true }
>["name"];

/** One shadow role whose opacity follows the field's structure axis. */
export interface FieldShadowRoleLaw {
  readonly name: `--discern-${string}`;
  readonly description: string;
  readonly offset: string;
  readonly expression: FieldExpression;
}

/** Shadow geometry and alpha laws retained as Shape Theme Tokens. */
export const fieldShadowRoleLaws = Object.freeze(
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

/** Evaluate one field expression at a validated point. */
export function evaluateFieldExpression(
  expression: FieldExpression,
  point: Partial<FieldPoint> = {},
): number {
  const resolved = resolveFieldPoint(point);
  const evaluate = (node: FieldExpression): number => {
    switch (node.kind) {
      case "number":
        return node.value;
      case "axis":
        return resolved[node.axis];
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
        return Number(
          (Math.round(evaluate(node.value) / interval) * interval).toFixed(12),
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

interface EvaluatedFieldColor {
  readonly color: OklabColor;
  readonly alpha: number;
}

function interpolatePigment(position: number): OklabColor {
  const interpolate = (paper: number, ink: number): number =>
    paper * (1 - position) + ink * position;
  return {
    lightness: interpolate(
      fieldPigments.paper.lightness,
      fieldPigments.ink.lightness,
    ),
    a: interpolate(fieldPigments.paper.a, fieldPigments.ink.a),
    b: interpolate(fieldPigments.paper.b, fieldPigments.ink.b),
  };
}

function activePigments(canvas: OklabColor): {
  readonly active: OklabColor;
  readonly opposite: OklabColor;
} {
  const paperWins = oklabRelativeLuminance(canvas) < FIELD_POLARITY_CROSSOVER;
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
  const canvas = interpolatePigment(
    evaluateFieldExpression(canvasLaw.expression, resolved),
  );
  const { active, opposite } = activePigments(canvas);
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
        evaluated = { color: compositeOklab(active, amount, canvas), alpha: 1 };
        break;
      case "ink-pigment":
        evaluated = { color: fieldPigments.ink, alpha: amount };
        break;
    }
    return [law.name, evaluated];
  })) as Record<FieldColorRoleName, EvaluatedFieldColor>);
}

function formattedNumber(value: number, places = 4): string {
  const roundedValue = Number(value.toFixed(places));
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

/** Evaluate every field role, preserving alpha only for backdrop-owned washes. */
export function evaluateField(
  point: Partial<FieldPoint> = {},
): Readonly<Record<FieldColorRoleName, string>> {
  const values = evaluateStructuredField(point);
  return Object.freeze(Object.fromEntries(
    fieldColorRoleLaws.map((law) => [law.name, formatOklch(values[law.name])]),
  ) as Record<FieldColorRoleName, string>);
}

/** Evaluate every field role as an opaque colour composited over its canvas. */
export function evaluateOpaqueField(
  point: Partial<FieldPoint> = {},
): Readonly<Record<FieldColorRoleName, string>> {
  const values = evaluateStructuredField(point);
  const canvas = values["--discern-color-canvas"].color;
  return Object.freeze(Object.fromEntries(fieldColorRoleLaws.map((law) => {
    const value = values[law.name];
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
    const canvas = values["--discern-color-canvas"].color;
    const maximum = oklabContrast(activePigments(canvas).active, canvas);
    for (const [name, floor] of FIELD_INK_CONTRAST_FLOORS) {
      const value = values[name];
      const opaque = compositeOklab(value.color, value.alpha, canvas);
      minimum = Math.min(
        minimum,
        oklabContrast(opaque, canvas) - Math.min(floor, maximum),
      );
    }
  }
  return Number(minimum.toFixed(6));
}
