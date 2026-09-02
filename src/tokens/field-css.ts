/** CSS projection of the monochrome field's authored numeric expressions. */

import {
  defaultFieldPoint,
  fieldActiveLightnessExpression,
  fieldAxes,
  type FieldAxisName,
  fieldCanvasLightnessExpression,
  type FieldColorRoleLaw,
  fieldColorRoleLaws,
  type FieldExpression,
  fieldOppositeLightnessExpression,
  fieldPolarityExpression,
  type FieldShadowRoleLaw,
  fieldShadowRoleLaws,
} from "./field.ts";

/** Feature query guarding the live projection while static poles remain usable. */
export const FIELD_LIVE_CSS_SUPPORTS =
  "(color: oklch(calc(round(up, abs(-0.2), 1) * 0.5) 0 0))";

/** One custom-property declaration emitted by the live field projection. */
export interface FieldCssDeclaration {
  readonly name: `--discern-${string}`;
  readonly value: string;
}

const FIELD_CANVAS_LIGHTNESS = "--discern-field-canvas-lightness" as const;
const FIELD_POLARITY = "--discern-field-polarity" as const;
const FIELD_ACTIVE_LIGHTNESS = "--discern-field-active-lightness" as const;
const FIELD_OPPOSITE_LIGHTNESS = "--discern-field-opposite-lightness" as const;

function formattedNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError(`Cannot project non-finite field number ${value}`);
  }
  return Object.is(value, -0) ? "0" : String(value);
}

function compileExpression(
  expression: FieldExpression,
  bindings: ReadonlyMap<FieldExpression, string>,
): string {
  const binding = bindings.get(expression);
  if (binding !== undefined) return binding;
  const compile = (value: FieldExpression): string =>
    compileExpression(value, bindings);
  switch (expression.kind) {
    case "number":
      return formattedNumber(expression.value);
    case "axis":
      return `var(${fieldAxisCustomPropertyName(expression.axis)})`;
    case "add":
      return `calc(${compile(expression.left)} + ${compile(expression.right)})`;
    case "subtract":
      return `calc(${compile(expression.left)} - ${compile(expression.right)})`;
    case "multiply":
      return `calc(${compile(expression.left)} * ${compile(expression.right)})`;
    case "divide":
      return `calc(${compile(expression.left)} / ${compile(expression.right)})`;
    case "min":
    case "max": {
      if (expression.values.length === 0) {
        throw new TypeError(`Cannot project empty field ${expression.kind}()`);
      }
      return `${expression.kind}(${expression.values.map(compile).join(", ")})`;
    }
    case "clamp":
      return `clamp(${compile(expression.minimum)}, ${
        compile(expression.value)
      }, ${compile(expression.maximum)})`;
    case "abs":
      return `abs(${compile(expression.value)})`;
    case "round":
      return `round(${expression.strategy ?? "nearest"}, ${
        compile(expression.value)
      }, ${compile(expression.interval)})`;
    case "lerp": {
      const from = compile(expression.from);
      const to = compile(expression.to);
      const position = compile(expression.position);
      return `calc(${from} * (1 - ${position}) + ${to} * ${position})`;
    }
  }
}

/** Compile one field expression without restating any numeric law in CSS. */
export function compileFieldExpressionToCss(
  expression: FieldExpression,
): string {
  return compileExpression(expression, new Map());
}

/** Public custom-property name for one registered field axis. */
export function fieldAxisCustomPropertyName(
  axis: FieldAxisName,
): `--discern-${FieldAxisName}` {
  return `--discern-${axis}`;
}

/** Emit the exact top-level registered-property population for field axes. */
export function generateFieldAxisRegistrationCss(): string {
  return (Object.keys(fieldAxes) as FieldAxisName[]).map((axis) => {
    const definition = fieldAxes[axis];
    return `@property ${fieldAxisCustomPropertyName(axis)} {
  syntax: "<number>";
  inherits: true;
  initial-value: ${formattedNumber(definition.default)};
}`;
  }).join("\n\n");
}

function colorRoleValue(
  law: FieldColorRoleLaw,
  expressionBindings: ReadonlyMap<FieldExpression, string>,
): string {
  const amount = compileExpression(law.expression, expressionBindings);
  switch (law.paint) {
    case "canvas":
      return `oklch(var(${FIELD_CANVAS_LIGHTNESS}) 0 0)`;
    case "active-ink":
      return `oklch(var(${FIELD_ACTIVE_LIGHTNESS}) 0 0 / ${amount})`;
    case "opposite-ink":
      return `oklch(var(${FIELD_OPPOSITE_LIGHTNESS}) 0 0 / ${amount})`;
    case "raised-surface":
      return `color-mix(in srgb, oklch(var(${FIELD_ACTIVE_LIGHTNESS}) 0 0) calc(${amount} * 100%), oklch(var(${FIELD_CANVAS_LIGHTNESS}) 0 0))`;
    case "ink-pigment":
      return `oklch(0 0 0 / ${amount})`;
    case "paper-pigment":
      return `oklch(1 0 0 / ${amount})`;
  }
}

function shadowRoleValue(
  law: FieldShadowRoleLaw,
  expressionBindings: ReadonlyMap<FieldExpression, string>,
): string {
  const amount = compileExpression(law.expression, expressionBindings);
  return `${law.offset} color-mix(in oklab, var(--discern-shadow-color) calc(${amount} * 100%), transparent)`;
}

/**
 * Project every shared helper and field-derived role. New laws auto-enrol in
 * source order; series and presentation pairs remain outside this population.
 */
export function fieldLiveCssDeclarations(): readonly FieldCssDeclaration[] {
  const canvasBindings = new Map<FieldExpression, string>([
    [fieldCanvasLightnessExpression, `var(${FIELD_CANVAS_LIGHTNESS})`],
  ]);
  const polarityBindings = new Map<FieldExpression, string>([
    ...canvasBindings,
    [fieldPolarityExpression, `var(${FIELD_POLARITY})`],
  ]);
  const roleBindings = new Map<FieldExpression, string>([
    ...polarityBindings,
    [fieldActiveLightnessExpression, `var(${FIELD_ACTIVE_LIGHTNESS})`],
    [fieldOppositeLightnessExpression, `var(${FIELD_OPPOSITE_LIGHTNESS})`],
  ]);
  return Object.freeze([
    {
      name: FIELD_CANVAS_LIGHTNESS,
      value: compileFieldExpressionToCss(fieldCanvasLightnessExpression),
    },
    {
      name: FIELD_POLARITY,
      value: compileExpression(fieldPolarityExpression, canvasBindings),
    },
    {
      name: FIELD_ACTIVE_LIGHTNESS,
      value: compileExpression(
        fieldActiveLightnessExpression,
        polarityBindings,
      ),
    },
    {
      name: FIELD_OPPOSITE_LIGHTNESS,
      value: compileExpression(
        fieldOppositeLightnessExpression,
        polarityBindings,
      ),
    },
    ...fieldColorRoleLaws.map((law) => ({
      name: law.name,
      value: colorRoleValue(law, roleBindings),
    })),
    ...fieldShadowRoleLaws.map((law) => ({
      name: law.name,
      value: shadowRoleValue(law, roleBindings),
    })),
  ]);
}

/** Scale one authored pixel spacing fact by the registered density axis. */
export function densityScaledSpacingCssValue(authoredValue: string): string {
  if (!/^(?:0|[1-9][0-9]*(?:\.[0-9]+)?)px$/u.test(authoredValue)) {
    throw new TypeError(
      `Density can only project an authored pixel spacing fact, received ${authoredValue}`,
    );
  }
  return `calc(${authoredValue} * var(${
    fieldAxisCustomPropertyName("density")
  }))`;
}

/** Axis defaults in the same deterministic order as the field authority. */
export function fieldAxisDefaultDeclarations(): readonly FieldCssDeclaration[] {
  return Object.freeze(
    (Object.keys(fieldAxes) as FieldAxisName[]).map((axis) => ({
      name: fieldAxisCustomPropertyName(axis),
      value: formattedNumber(defaultFieldPoint[axis]),
    })),
  );
}
