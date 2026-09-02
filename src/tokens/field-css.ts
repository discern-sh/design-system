/** CSS projection of the monochrome field's authored numeric expressions. */

import {
  type AppearanceName,
  DEFAULT_ACCENT_HUE,
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

/** Public hue primitive shared by every Accent projection. */
export const ACCENT_HUE_CUSTOM_PROPERTY_NAME = "--discern-accent-hue" as const;

const FIELD_CANVAS_LIGHTNESS = "--discern-f-l" as const;
const FIELD_POLARITY = "--discern-f-p" as const;
const FIELD_ACTIVE_LIGHTNESS = "--discern-f-a" as const;
const FIELD_OPPOSITE_LIGHTNESS = "--discern-f-o" as const;

function formattedNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError(`Cannot project non-finite field number ${value}`);
  }
  const text = Object.is(value, -0) ? "0" : String(value);
  return text.replace(/^(-?)0\./u, "$1.");
}

function foldedNumber(value: number): string {
  return formattedNumber(Number(value.toFixed(12)));
}

function isNumber(
  expression: FieldExpression,
  value: number,
): boolean {
  return expression.kind === "number" && expression.value === value;
}

function constantArithmeticValue(
  expression: FieldExpression,
): number | undefined {
  if (expression.kind === "number") return expression.value;
  if (
    expression.kind !== "add" && expression.kind !== "subtract" &&
    expression.kind !== "multiply" && expression.kind !== "divide"
  ) return undefined;
  const left = constantArithmeticValue(expression.left);
  const right = constantArithmeticValue(expression.right);
  if (left === undefined || right === undefined) return undefined;
  switch (expression.kind) {
    case "add":
      return left + right;
    case "subtract":
      return left - right;
    case "multiply":
      return left * right;
    case "divide":
      return left / right;
  }
}

function compileExpressionBody(
  expression: FieldExpression,
  bindings: ReadonlyMap<FieldExpression, string>,
): string {
  const binding = bindings.get(expression);
  if (binding !== undefined) return binding;
  const compile = (value: FieldExpression): string =>
    compileExpressionBody(value, bindings);
  switch (expression.kind) {
    case "number":
      return formattedNumber(expression.value);
    case "axis":
      return expression.axis === "accent-hue"
        ? `var(${ACCENT_HUE_CUSTOM_PROPERTY_NAME})`
        : `var(${fieldAxisCustomPropertyName(expression.axis)})`;
    case "add": {
      const left = constantArithmeticValue(expression.left);
      const right = constantArithmeticValue(expression.right);
      if (left === 0) return compile(expression.right);
      if (right === 0) return compile(expression.left);
      if (left !== undefined && right !== undefined) {
        return foldedNumber(left + right);
      }
      const compiledLeft = compile(expression.left);
      const compiledRight = compile(expression.right);
      if (compiledLeft === "0") return compiledRight;
      if (compiledRight === "0") return compiledLeft;
      return `(${compiledLeft} + ${compiledRight})`;
    }
    case "subtract": {
      const left = constantArithmeticValue(expression.left);
      const right = constantArithmeticValue(expression.right);
      if (right === 0) return compile(expression.left);
      if (left !== undefined && right !== undefined) {
        return foldedNumber(left - right);
      }
      const compiledLeft = compile(expression.left);
      const compiledRight = compile(expression.right);
      if (compiledRight === "0") return compiledLeft;
      return `(${compiledLeft} - ${compiledRight})`;
    }
    case "multiply": {
      const left = constantArithmeticValue(expression.left);
      const right = constantArithmeticValue(expression.right);
      if (left === 0 || right === 0) return "0";
      if (left === 1) return compile(expression.right);
      if (right === 1) return compile(expression.left);
      if (left !== undefined && right !== undefined) {
        return foldedNumber(left * right);
      }
      return `(${compile(expression.left)}*${compile(expression.right)})`;
    }
    case "divide": {
      const left = constantArithmeticValue(expression.left);
      const right = constantArithmeticValue(expression.right);
      if (left === 0) return "0";
      if (right === 1) return compile(expression.left);
      if (left !== undefined && right !== undefined) {
        return foldedNumber(left / right);
      }
      return `(${compile(expression.left)}/${compile(expression.right)})`;
    }
    case "min":
    case "max": {
      if (expression.values.length === 0) {
        throw new TypeError(`Cannot project empty field ${expression.kind}()`);
      }
      return `${expression.kind}(${expression.values.map(compile).join(",")})`;
    }
    case "clamp":
      return `clamp(${compile(expression.minimum)},${
        compile(expression.value)
      },${compile(expression.maximum)})`;
    case "abs":
      return `abs(${compile(expression.value)})`;
    case "round":
      return expression.strategy === undefined
        ? `round(${compile(expression.value)},${compile(expression.interval)})`
        : `round(${expression.strategy},${compile(expression.value)},${
          compile(expression.interval)
        })`;
    case "lerp": {
      if (expression.from === expression.to) return compile(expression.from);
      if (isNumber(expression.position, 0)) return compile(expression.from);
      if (isNumber(expression.position, 1)) return compile(expression.to);
      const from = compile(expression.from);
      const to = compile(expression.to);
      const position = compile(expression.position);
      if (isNumber(expression.from, 0) && isNumber(expression.to, 1)) {
        return position;
      }
      if (isNumber(expression.from, 1) && isNumber(expression.to, 0)) {
        return `(1 - ${position})`;
      }
      if (isNumber(expression.from, 0)) return `(${to}*${position})`;
      if (isNumber(expression.to, 0)) {
        return `(${from}*(1 - ${position}))`;
      }
      if (
        expression.from.kind === "number" &&
        expression.to.kind === "number"
      ) {
        const delta = expression.to.value - expression.from.value;
        if (delta === 0) return from;
        const operator = delta > 0 ? "+" : "-";
        return `(${from} ${operator} ${
          foldedNumber(Math.abs(delta))
        }*${position})`;
      }
      if (isNumber(expression.from, 1)) {
        return `((1 - ${position}) + ${to}*${position})`;
      }
      if (isNumber(expression.to, 1)) {
        return `(${from}*(1 - ${position}) + ${position})`;
      }
      if (expression.position.kind === "number") {
        const weight = expression.position.value;
        return `(${from}*${foldedNumber(1 - weight)} + ${to}*${
          foldedNumber(weight)
        })`;
      }
      return `(${from}*(1 - ${position}) + ${to}*${position})`;
    }
  }
}

function compileExpression(
  expression: FieldExpression,
  bindings: ReadonlyMap<FieldExpression, string>,
): string {
  const body = compileExpressionBody(expression, bindings);
  if (bindings.has(expression)) return body;
  const calculation = expression.kind === "add" ||
    expression.kind === "subtract" ||
    expression.kind === "multiply" || expression.kind === "divide" ||
    expression.kind === "lerp";
  return calculation && body.startsWith("(") && body.endsWith(")")
    ? `calc(${body.slice(1, -1)})`
    : body;
}

function expressionChildren(
  expression: FieldExpression,
): readonly FieldExpression[] {
  switch (expression.kind) {
    case "number":
    case "axis":
      return [];
    case "add":
    case "subtract":
    case "multiply":
    case "divide":
      return [expression.left, expression.right];
    case "min":
    case "max":
      return expression.values;
    case "clamp":
      return [expression.minimum, expression.value, expression.maximum];
    case "abs":
      return [expression.value];
    case "round":
      return [expression.value, expression.interval];
    case "lerp":
      return [expression.from, expression.to, expression.position];
  }
}

interface SharedExpressionProjection {
  readonly bindings: ReadonlyMap<FieldExpression, string>;
  readonly declarations: readonly FieldCssDeclaration[];
}

/**
 * Bind repeated nodes in the expression DAG once when doing so makes the
 * emitted projection smaller. Candidate choice is derived from traversal order
 * and byte savings, so a future law enrols without an authored CSS shortcut.
 */
function projectSharedExpressions(
  roots: readonly FieldExpression[],
  baseBindings: ReadonlyMap<FieldExpression, string>,
): SharedExpressionProjection {
  const bindings = new Map(baseBindings);
  const selected: Array<{
    readonly expression: FieldExpression;
    readonly name: `--discern-f${number}`;
  }> = [];

  while (true) {
    const counts = new Map<FieldExpression, number>();
    const visit = (expression: FieldExpression): void => {
      if (bindings.has(expression)) return;
      counts.set(expression, (counts.get(expression) ?? 0) + 1);
      for (const child of expressionChildren(expression)) visit(child);
    };
    for (const root of roots) visit(root);
    for (const { expression } of selected) {
      for (const child of expressionChildren(expression)) visit(child);
    }

    const name = `--discern-f${selected.length}` as const;
    const reference = `var(${name})`;
    let best: {
      readonly expression: FieldExpression;
      readonly savings: number;
    } | undefined;
    for (const [expression, count] of counts) {
      if (
        count < 2 || expression.kind === "number" ||
        expression.kind === "axis"
      ) continue;
      const value = compileExpression(expression, bindings);
      const savings = count * (value.length - reference.length) -
        (name.length + value.length + 4);
      if (savings > 0 && (best === undefined || savings > best.savings)) {
        best = { expression, savings };
      }
    }
    if (best === undefined) break;
    selected.push({ expression: best.expression, name });
    bindings.set(best.expression, reference);
  }

  const declarations = selected.map(({ expression, name }) => {
    const otherBindings = new Map(bindings);
    otherBindings.delete(expression);
    return {
      name,
      value: compileExpression(expression, otherBindings),
    };
  });
  return { bindings, declarations };
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

/** Register the inherited hue primitive used by live Accent scopes. */
export function generateAccentHueRegistrationCss(): string {
  return `@property ${ACCENT_HUE_CUSTOM_PROPERTY_NAME} {
  syntax: "<number>";
  inherits: true;
  initial-value: ${formattedNumber(DEFAULT_ACCENT_HUE)};
}`;
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
    case "owned-surface":
      return `color-mix(in srgb, oklch(var(${FIELD_ACTIVE_LIGHTNESS}) 0 0) calc(${amount} * 100%), oklch(var(${FIELD_CANVAS_LIGHTNESS}) 0 0))`;
    case "ink-pigment":
      return `oklch(0 0 0 / ${amount})`;
    case "paper-pigment":
      return `oklch(1 0 0 / ${amount})`;
  }
}

function appearanceColorRoleValue(
  law: FieldColorRoleLaw,
  appearance: AppearanceName,
  expressionBindings: ReadonlyMap<FieldExpression, string>,
): string {
  if (appearance === "field" || law.accent === "field") {
    return colorRoleValue(law, expressionBindings);
  }
  const lightness = compileExpression(
    law.accent.lightness,
    expressionBindings,
  );
  const chroma = compileExpression(law.accent.chroma, expressionBindings);
  const hue = compileExpression(law.accent.hue, expressionBindings);
  const alpha = compileExpression(law.accent.alpha, expressionBindings);
  return `oklch(${lightness} ${chroma} ${hue} / ${alpha})`;
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
export function appearanceLiveCssDeclarations(
  appearance: AppearanceName,
): readonly FieldCssDeclaration[] {
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
  const projectedExpressions = projectSharedExpressions(
    [
      ...fieldColorRoleLaws.flatMap((law) =>
        appearance === "accent" && law.accent !== "field"
          ? [
            law.accent.lightness,
            law.accent.chroma,
            law.accent.hue,
            law.accent.alpha,
          ]
          : [law.expression]
      ),
      ...fieldShadowRoleLaws.map(({ expression }) => expression),
    ],
    roleBindings,
  );
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
    ...projectedExpressions.declarations,
    ...fieldColorRoleLaws.map((law) => ({
      name: law.name,
      value: appearanceColorRoleValue(
        law,
        appearance,
        projectedExpressions.bindings,
      ),
    })),
    ...fieldShadowRoleLaws.map((law) => ({
      name: law.name,
      value: shadowRoleValue(law, projectedExpressions.bindings),
    })),
  ]);
}

/** Project the default achromatic Field appearance. */
export function fieldLiveCssDeclarations(): readonly FieldCssDeclaration[] {
  return appearanceLiveCssDeclarations("field");
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
