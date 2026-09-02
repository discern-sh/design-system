import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  defaultFieldPoint,
  evaluateField,
  evaluateFieldExpression,
  evaluateFieldShadows,
  evaluateFieldSpacingUnit,
  FIELD_CONTRAST_SAMPLE_DARKNESSES,
  FIELD_SPACING_UNIT_PX,
  fieldAxes,
  fieldColorRoleLaws,
  fieldContrastMargin,
  type FieldExpression,
} from "../src/tokens/field.ts";
import { themeTokens } from "../src/tokens/tokens.ts";

Deno.test("the field expression vocabulary evaluates every CSS-compatible node", () => {
  const number = (value: number): FieldExpression => ({
    kind: "number",
    name: `test-${value}`,
    value,
  });
  const axis: FieldExpression = { kind: "axis", axis: "darkness" };
  const expressions: readonly [FieldExpression, number][] = [
    [number(3), 3],
    [axis, 0.25],
    [{ kind: "add", left: number(2), right: number(3) }, 5],
    [{ kind: "subtract", left: number(2), right: number(3) }, -1],
    [{ kind: "multiply", left: number(2), right: number(3) }, 6],
    [{ kind: "divide", left: number(3), right: number(2) }, 1.5],
    [{ kind: "min", values: [number(2), number(3)] }, 2],
    [{ kind: "max", values: [number(2), number(3)] }, 3],
    [{
      kind: "clamp",
      minimum: number(0),
      value: number(2),
      maximum: number(1),
    }, 1],
    [{ kind: "abs", value: number(-2) }, 2],
    [{ kind: "round", value: number(0.26), interval: number(0.1) }, 0.3],
    [{ kind: "lerp", from: number(0), to: number(8), position: axis }, 2],
  ];
  for (const [expression, expected] of expressions) {
    assertEquals(
      evaluateFieldExpression(expression, { darkness: 0.25 }),
      expected,
    );
  }
});

Deno.test("field axes expose bounded defaults and density only projects spacing", () => {
  for (const name of Object.keys(fieldAxes) as (keyof typeof fieldAxes)[]) {
    assertEquals(defaultFieldPoint[name], fieldAxes[name].default);
  }
  assertEquals(evaluateFieldSpacingUnit(), FIELD_SPACING_UNIT_PX);
  assertEquals(evaluateFieldSpacingUnit({ density: 1.2 }), 4.8);
  assertThrows(() => evaluateField({ darkness: 1.01 }), TypeError, "outside");
});

Deno.test("one ordered expression tree owns every non-series colour role", () => {
  assertEquals(
    new Set(fieldColorRoleLaws.map((law) => law.name)).size,
    fieldColorRoleLaws.length,
  );
  assert(
    fieldColorRoleLaws.every((law) => !law.name.includes("series")),
    "series colours must stay outside the field",
  );
  for (const darkness of FIELD_CONTRAST_SAMPLE_DARKNESSES) {
    assertEquals(
      Object.keys(evaluateField({ darkness })),
      fieldColorRoleLaws.map((law) => law.name),
    );
  }
});

Deno.test("the field preserves alpha only for backdrop-owned roles", () => {
  for (const darkness of FIELD_CONTRAST_SAMPLE_DARKNESSES) {
    const values = evaluateField({ darkness });
    const value = (name: `--discern-${string}`): string => {
      const result = values[name];
      assert(
        result !== undefined,
        `field ${darkness} did not evaluate ${name}`,
      );
      return result;
    };
    assert(!value("--discern-color-canvas").includes(" / "));
    assert(!value("--discern-color-surface").includes(" / "));
    assert(!value("--discern-color-inverse-surface").includes(" / "));
    assert(!value("--discern-color-action").includes(" / "));
    assert(value("--discern-color-surface-sunken").includes(" / "));
  }
});

Deno.test("sampled field rungs hold every attainable contrast floor", () => {
  assert(fieldContrastMargin() >= 0, `field margin ${fieldContrastMargin()}`);
});

Deno.test("theme Token poles pin representative field emission", () => {
  const pairs = Object.fromEntries(
    themeTokens.map((token) => [token.name, [token.light, token.dark]]),
  );
  assertEquals(pairs["--discern-color-canvas"], [
    "oklch(100% 0 0)",
    "oklch(0% 0 0)",
  ]);
  assertEquals(pairs["--discern-color-ink-muted"], [
    "oklch(0% 0 0 / 0.66)",
    "oklch(100% 0 0 / 0.72)",
  ]);
  assertEquals(pairs["--discern-color-ink-faint"], [
    "oklch(0% 0 0 / 0.55)",
    "oklch(100% 0 0 / 0.55)",
  ]);
  assertEquals(pairs["--discern-color-inverse-surface"], [
    "oklch(0% 0 0)",
    "oklch(0% 0 0)",
  ]);
  assertEquals(pairs["--discern-color-inverse-ink"], [
    "oklch(100% 0 0)",
    "oklch(100% 0 0)",
  ]);
  assertEquals(pairs["--discern-color-surface"], [
    "oklch(100% 0 0)",
    "oklch(18.1521% 0 0)",
  ]);
  assertEquals(pairs["--discern-color-action"], [
    "oklch(0% 0 0)",
    "oklch(100% 0 0)",
  ]);
  assertEquals(
    evaluateFieldShadows({ darkness: 1 })["--discern-shadow-pop"],
    "6px 6px 0 color-mix(in oklab, var(--discern-shadow-color) 28%, transparent)",
  );
});
