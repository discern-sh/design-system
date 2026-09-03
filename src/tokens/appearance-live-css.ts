/** CSS projection of the appearance graph's authored numeric expressions. */

import {
  appearanceActiveChromaExpression,
  appearanceActiveHueExpression,
  appearanceActiveLightnessExpression,
  appearanceAxes,
  type AppearanceAxisName,
  appearanceCanvasLightnessExpression,
  type AppearanceColorRoleLaw,
  appearanceColorRoleLaws,
  type AppearanceExpression,
  appearanceOppositeChromaExpression,
  appearanceOppositeHueExpression,
  appearanceOppositeLightnessExpression,
  appearancePigmentLaws,
  appearancePolarityExpression,
  type AppearanceProjection,
  type AppearanceShadowRoleLaw,
  appearanceShadowRoleLaws,
  DEFAULT_ACCENT_HUE,
  defaultAppearance,
} from "./appearance.ts";

/** Feature query guarding the live projection while static poles remain usable. */
export const APPEARANCE_LIVE_CSS_SUPPORTS =
  "(color: oklch(from oklch(calc(round(up, abs(-0.2), 1) * 0.5) 0 0) l c h / 0.5))";

/** One custom-property declaration emitted by the live appearance projection. */
export interface AppearanceCssDeclaration {
  readonly name: `--discern-${string}`;
  readonly value: string;
}

/** Public hue primitive shared by every Accent projection. */
export const ACCENT_HUE_CUSTOM_PROPERTY_NAME = "--discern-accent-hue" as const;

const CANVAS_LIGHTNESS = "--discern-f-l" as const;
const CANVAS_COLOR = "--discern-f-c" as const;
const POLARITY = "--discern-f-p" as const;
const ACTIVE_LIGHTNESS = "--discern-f-a" as const;
const ACTIVE_CHROMA = "--discern-f-ac" as const;
const ACTIVE_HUE = "--discern-f-ah" as const;
const OPPOSITE_LIGHTNESS = "--discern-f-o" as const;
const OPPOSITE_CHROMA = "--discern-f-oc" as const;
const OPPOSITE_HUE = "--discern-f-oh" as const;
const PAPER_LIGHTNESS = "--discern-f-pl" as const;
const PAPER_CHROMA = "--discern-f-pc" as const;
const INK_LIGHTNESS = "--discern-f-il" as const;
const INK_CHROMA = "--discern-f-ic" as const;
const PAPER_PIGMENT = "--discern-f-pp" as const;
const INK_PIGMENT = "--discern-f-ip" as const;
const ACTIVE_PIGMENT = "--discern-f-ap" as const;
const OPPOSITE_PIGMENT = "--discern-f-op" as const;

/** One pigment's alpha expression over its bound OKLCH colour helper. */
function pigmentAtAlpha(pigment: string, amount: string): string {
  return `oklch(from var(${pigment}) l c h / ${amount})`;
}

function formattedNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError(`Cannot project non-finite number ${value}`);
  }
  const text = Object.is(value, -0) ? "0" : String(value);
  return text.replace(/^(-?)0\./u, "$1.");
}

function foldedNumber(value: number): string {
  const scale = 1_000_000_000_000;
  return formattedNumber(Math.round(value * scale) / scale);
}

function isNumber(
  expression: AppearanceExpression,
  value: number,
): boolean {
  return expression.kind === "number" && expression.value === value;
}

function constantArithmeticValue(
  expression: AppearanceExpression,
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
  expression: AppearanceExpression,
  bindings: ReadonlyMap<AppearanceExpression, string>,
): string {
  const binding = bindings.get(expression);
  if (binding !== undefined) return binding;
  const compile = (value: AppearanceExpression): string =>
    compileExpressionBody(value, bindings);
  switch (expression.kind) {
    case "number":
      return formattedNumber(expression.value);
    case "axis":
      return expression.axis === "accent-hue"
        ? `var(${ACCENT_HUE_CUSTOM_PROPERTY_NAME})`
        : `var(${appearanceAxisCustomPropertyName(expression.axis)})`;
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
        throw new TypeError(`Cannot project empty ${expression.kind}()`);
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
  expression: AppearanceExpression,
  bindings: ReadonlyMap<AppearanceExpression, string>,
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
  expression: AppearanceExpression,
): readonly AppearanceExpression[] {
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
  readonly bindings: ReadonlyMap<AppearanceExpression, string>;
  readonly declarations: readonly AppearanceCssDeclaration[];
}

/**
 * Bind repeated nodes in the expression DAG once when doing so makes the
 * emitted projection smaller. Candidate choice is derived from traversal order
 * and byte savings, so a future law enrols without an authored CSS shortcut.
 */
function projectSharedExpressions(
  roots: readonly AppearanceExpression[],
  baseBindings: ReadonlyMap<AppearanceExpression, string>,
): SharedExpressionProjection {
  const bindings = new Map(baseBindings);
  const selected: Array<{
    readonly expression: AppearanceExpression;
    readonly name: `--discern-f${number}`;
  }> = [];

  while (true) {
    const counts = new Map<AppearanceExpression, number>();
    const visit = (expression: AppearanceExpression): void => {
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
      readonly expression: AppearanceExpression;
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

/** Compile one appearance expression without restating any numeric law in CSS. */
export function compileAppearanceExpressionToCss(
  expression: AppearanceExpression,
): string {
  return compileExpression(expression, new Map());
}

/** Public custom-property name for one registered appearance axis. */
export function appearanceAxisCustomPropertyName(
  axis: AppearanceAxisName,
): `--discern-${string}` {
  return `--discern-${
    axis.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)
  }`;
}

/** The tinted paper pigment as an OKLCH colour of the live helpers. */
function paperPigmentColor(): string {
  return `oklch(var(${PAPER_LIGHTNESS}) var(${PAPER_CHROMA}) var(${
    appearanceAxisCustomPropertyName("paperTintHue")
  }))`;
}

/** The tinted ink pigment as an OKLCH colour of the live helpers. */
function inkPigmentColor(): string {
  return `oklch(var(${INK_LIGHTNESS}) var(${INK_CHROMA}) var(${
    appearanceAxisCustomPropertyName("inkTintHue")
  }))`;
}

/** Emit the exact top-level registered-property population for appearance axes. */
export function generateAppearanceAxisRegistrationCss(): string {
  return (Object.keys(appearanceAxes) as AppearanceAxisName[]).map((axis) => {
    const definition = appearanceAxes[axis];
    return `@property ${appearanceAxisCustomPropertyName(axis)} {
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
  law: AppearanceColorRoleLaw,
  expressionBindings: ReadonlyMap<AppearanceExpression, string>,
): string {
  const amount = compileExpression(law.expression, expressionBindings);
  switch (law.paint) {
    case "canvas":
      return `var(${CANVAS_COLOR})`;
    case "active-ink":
      return pigmentAtAlpha(ACTIVE_PIGMENT, amount);
    case "opposite-ink":
      return pigmentAtAlpha(OPPOSITE_PIGMENT, amount);
    case "raised-surface":
    case "owned-surface":
      return `color-mix(in srgb, var(${ACTIVE_PIGMENT}) calc(${amount} * 100%), var(${CANVAS_COLOR}))`;
    case "ink-pigment":
      return pigmentAtAlpha(INK_PIGMENT, amount);
    case "paper-pigment":
      return pigmentAtAlpha(PAPER_PIGMENT, amount);
  }
}

function appearanceColorRoleValue(
  law: AppearanceColorRoleLaw,
  projection: AppearanceProjection,
  expressionBindings: ReadonlyMap<AppearanceExpression, string>,
): string {
  if (projection === "mono" || law.accent === "mono") {
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
  law: AppearanceShadowRoleLaw,
  expressionBindings: ReadonlyMap<AppearanceExpression, string>,
): string {
  const amount = compileExpression(law.expression, expressionBindings);
  return `${law.offset} color-mix(in oklab, var(--discern-shadow-color) calc(${amount} * 100%), transparent)`;
}

/**
 * Project every shared helper and appearance-derived role. New laws auto-enrol in
 * source order; series and presentation pairs remain outside this population.
 */
export function appearanceLiveCssDeclarations(
  projection: AppearanceProjection,
): readonly AppearanceCssDeclaration[] {
  const pigmentBindings = new Map<AppearanceExpression, string>([
    [appearancePigmentLaws.paper.lightness, `var(${PAPER_LIGHTNESS})`],
    [appearancePigmentLaws.paper.chroma, `var(${PAPER_CHROMA})`],
    [appearancePigmentLaws.ink.lightness, `var(${INK_LIGHTNESS})`],
    [appearancePigmentLaws.ink.chroma, `var(${INK_CHROMA})`],
  ]);
  const canvasBindings = new Map<AppearanceExpression, string>([
    ...pigmentBindings,
    [appearanceCanvasLightnessExpression, `var(${CANVAS_LIGHTNESS})`],
  ]);
  const polarityBindings = new Map<AppearanceExpression, string>([
    ...canvasBindings,
    [appearancePolarityExpression, `var(${POLARITY})`],
  ]);
  const roleBindings = new Map<AppearanceExpression, string>([
    ...polarityBindings,
    [appearanceActiveLightnessExpression, `var(${ACTIVE_LIGHTNESS})`],
    [appearanceActiveChromaExpression, `var(${ACTIVE_CHROMA})`],
    [appearanceActiveHueExpression, `var(${ACTIVE_HUE})`],
    [appearanceOppositeLightnessExpression, `var(${OPPOSITE_LIGHTNESS})`],
    [appearanceOppositeChromaExpression, `var(${OPPOSITE_CHROMA})`],
    [appearanceOppositeHueExpression, `var(${OPPOSITE_HUE})`],
  ]);
  const projectedExpressions = projectSharedExpressions(
    [
      ...appearanceColorRoleLaws.flatMap((law) =>
        projection === "accent" && law.accent !== "mono"
          ? [
            law.accent.lightness,
            law.accent.chroma,
            law.accent.hue,
            law.accent.alpha,
          ]
          : [law.expression]
      ),
      ...appearanceShadowRoleLaws.map(({ expression }) => expression),
    ],
    roleBindings,
  );
  const helper = (
    name: `--discern-${string}`,
    expression: AppearanceExpression,
    bindings: ReadonlyMap<AppearanceExpression, string>,
  ): AppearanceCssDeclaration => ({
    name,
    value: compileExpression(expression, bindings),
  });
  const untouched = new Map<AppearanceExpression, string>();
  return Object.freeze([
    helper(PAPER_LIGHTNESS, appearancePigmentLaws.paper.lightness, untouched),
    helper(PAPER_CHROMA, appearancePigmentLaws.paper.chroma, untouched),
    helper(INK_LIGHTNESS, appearancePigmentLaws.ink.lightness, untouched),
    helper(INK_CHROMA, appearancePigmentLaws.ink.chroma, untouched),
    { name: PAPER_PIGMENT, value: paperPigmentColor() },
    { name: INK_PIGMENT, value: inkPigmentColor() },
    helper(
      CANVAS_LIGHTNESS,
      appearanceCanvasLightnessExpression,
      pigmentBindings,
    ),
    {
      name: CANVAS_COLOR,
      value: `color-mix(in oklab, var(${PAPER_PIGMENT}) calc((1 - var(${
        appearanceAxisCustomPropertyName("darkness")
      })) * 100%), var(${INK_PIGMENT}))`,
    },
    helper(POLARITY, appearancePolarityExpression, canvasBindings),
    helper(
      ACTIVE_LIGHTNESS,
      appearanceActiveLightnessExpression,
      polarityBindings,
    ),
    helper(ACTIVE_CHROMA, appearanceActiveChromaExpression, polarityBindings),
    helper(ACTIVE_HUE, appearanceActiveHueExpression, polarityBindings),
    helper(
      OPPOSITE_LIGHTNESS,
      appearanceOppositeLightnessExpression,
      polarityBindings,
    ),
    helper(
      OPPOSITE_CHROMA,
      appearanceOppositeChromaExpression,
      polarityBindings,
    ),
    helper(OPPOSITE_HUE, appearanceOppositeHueExpression, polarityBindings),
    {
      name: ACTIVE_PIGMENT,
      value:
        `oklch(var(${ACTIVE_LIGHTNESS}) var(${ACTIVE_CHROMA}) var(${ACTIVE_HUE}))`,
    },
    {
      name: OPPOSITE_PIGMENT,
      value:
        `oklch(var(${OPPOSITE_LIGHTNESS}) var(${OPPOSITE_CHROMA}) var(${OPPOSITE_HUE}))`,
    },
    ...projectedExpressions.declarations,
    ...appearanceColorRoleLaws.map((law) => ({
      name: law.name,
      value: appearanceColorRoleValue(
        law,
        projection,
        projectedExpressions.bindings,
      ),
    })),
    ...appearanceShadowRoleLaws.map((law) => ({
      name: law.name,
      value: shadowRoleValue(law, projectedExpressions.bindings),
    })),
  ]);
}

/** Project the default monochrome appearance. */
export function monoLiveCssDeclarations(): readonly AppearanceCssDeclaration[] {
  return appearanceLiveCssDeclarations("mono");
}

/** Scale one authored pixel spacing fact by the registered density axis. */
export function densityScaledSpacingCssValue(authoredValue: string): string {
  if (!/^(?:0|[1-9][0-9]*(?:\.[0-9]+)?)px$/u.test(authoredValue)) {
    throw new TypeError(
      `Density can only project an authored pixel spacing fact, received ${authoredValue}`,
    );
  }
  return `calc(${authoredValue} * var(${
    appearanceAxisCustomPropertyName("density")
  }))`;
}

/** Axis defaults in the same deterministic order as the appearance authority. */
export function appearanceAxisDefaultDeclarations(): readonly AppearanceCssDeclaration[] {
  return Object.freeze(
    (Object.keys(appearanceAxes) as AppearanceAxisName[]).map((axis) => ({
      name: appearanceAxisCustomPropertyName(axis),
      value: formattedNumber(defaultAppearance[axis]),
    })),
  );
}
