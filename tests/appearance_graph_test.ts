import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  appearanceAxisCustomPropertyName,
  appearanceAxisDefaultDeclarations,
  compileAppearanceExpressionToCss,
  densityScaledSpacingCssValue,
  generateAppearanceAxisRegistrationCss,
  monoLiveCssDeclarations,
} from "../src/tokens/appearance-live-css.ts";
import {
  APPEARANCE_CONTRAST_SAMPLE_DARKNESSES,
  APPEARANCE_POLARITY_CROSSOVER_DARKNESS,
  APPEARANCE_SPACING_UNIT_PX,
  appearanceAxes,
  appearanceAxisNames,
  appearanceColorRoleLaws,
  appearanceContrastMargin,
  type AppearanceExpression,
  appearancePolarityExpression,
  appearanceShadowRoleLaws,
  defaultAppearance,
  evaluateAppearance,
  evaluateAppearanceExpression,
  evaluateAppearanceShadows,
  evaluateAppearanceSpacingUnit,
} from "../src/tokens/appearance.ts";
import { themeTokens } from "../src/tokens/tokens.ts";

Deno.test("the field expression vocabulary evaluates every CSS-compatible node", () => {
  const number = (value: number): AppearanceExpression => ({
    kind: "number",
    name: `test-${value}`,
    value,
  });
  const axis: AppearanceExpression = { kind: "axis", axis: "darkness" };
  const expressions: readonly [AppearanceExpression, number][] = [
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
    [{
      kind: "round",
      strategy: "up",
      value: number(0.01),
      interval: number(1),
    }, 1],
    [{ kind: "lerp", from: number(0), to: number(8), position: axis }, 2],
  ];
  for (const [expression, expected] of expressions) {
    assertEquals(
      evaluateAppearanceExpression(expression, { darkness: 0.25 }),
      expected,
    );
  }
});

Deno.test("the CSS backend compiles the complete field expression vocabulary", () => {
  const number = (value: number): AppearanceExpression => ({
    kind: "number",
    name: `test-${value}`,
    value,
  });
  const axis: AppearanceExpression = { kind: "axis", axis: "darkness" };
  const cases: readonly [AppearanceExpression, string][] = [
    [number(3), "3"],
    [axis, "var(--discern-darkness)"],
    [
      { kind: "add", left: axis, right: number(3) },
      "calc(var(--discern-darkness) + 3)",
    ],
    [
      { kind: "subtract", left: axis, right: number(3) },
      "calc(var(--discern-darkness) - 3)",
    ],
    [
      { kind: "multiply", left: axis, right: number(3) },
      "calc(var(--discern-darkness)*3)",
    ],
    [
      { kind: "divide", left: axis, right: number(2) },
      "calc(var(--discern-darkness)/2)",
    ],
    [{ kind: "min", values: [number(2), number(3)] }, "min(2,3)"],
    [{ kind: "max", values: [number(2), number(3)] }, "max(2,3)"],
    [{
      kind: "clamp",
      minimum: number(0),
      value: number(2),
      maximum: number(1),
    }, "clamp(0,2,1)"],
    [{ kind: "abs", value: number(-2) }, "abs(-2)"],
    [
      { kind: "round", value: number(0.26), interval: number(0.1) },
      "round(.26,.1)",
    ],
    [{
      kind: "round",
      strategy: "up",
      value: number(0.01),
      interval: number(1),
    }, "round(up,.01,1)"],
    [
      { kind: "lerp", from: number(0), to: number(8), position: axis },
      "calc(8*var(--discern-darkness))",
    ],
    [
      { kind: "lerp", from: number(0.4), to: number(0.34), position: axis },
      "calc(.4 - .06*var(--discern-darkness))",
    ],
    [
      { kind: "lerp", from: number(0.34), to: number(0.4), position: axis },
      "calc(.34 + .06*var(--discern-darkness))",
    ],
  ];
  for (const [expression, expected] of cases) {
    assertEquals(compileAppearanceExpressionToCss(expression), expected);
  }
});

Deno.test("polarity and every live CSS consumer derive from the field authority", () => {
  assertEquals(
    evaluateAppearanceExpression(appearancePolarityExpression, {
      darkness: APPEARANCE_POLARITY_CROSSOVER_DARKNESS - 0.000001,
    }),
    0,
  );
  assertEquals(
    evaluateAppearanceExpression(appearancePolarityExpression, {
      darkness: APPEARANCE_POLARITY_CROSSOVER_DARKNESS + 0.000001,
    }),
    1,
  );
  const registrations = generateAppearanceAxisRegistrationCss();
  const expectedAxisProperties = [
    "--discern-darkness",
    "--discern-structure",
    "--discern-emphasis",
    "--discern-density",
    "--discern-paper-tint",
    "--discern-paper-tint-hue",
    "--discern-ink-tint",
    "--discern-ink-tint-hue",
  ];
  assertEquals(
    appearanceAxisNames.map(appearanceAxisCustomPropertyName),
    expectedAxisProperties,
  );
  assertEquals(
    [...registrations.matchAll(/\s+(--discern-[a-z-]+)/gu)].map(
      (match) => match[1],
    ),
    expectedAxisProperties,
  );
  assertStringIncludes(registrations, 'syntax: "<number>";');
  assertEquals(
    appearanceAxisDefaultDeclarations().map(({ name }) => name),
    expectedAxisProperties,
  );
  const liveNames = monoLiveCssDeclarations().map(({ name }) => name);
  const roleNames = [
    ...appearanceColorRoleLaws.map(({ name }) => name),
    ...appearanceShadowRoleLaws.map(({ name }) => name),
  ];
  assertEquals(
    liveNames.filter((name) => roleNames.includes(name)),
    roleNames,
  );
  assertEquals(new Set(liveNames).size, liveNames.length);
  assert(liveNames.every((name) => name.startsWith("--discern-")));
  const projectedBytes = monoLiveCssDeclarations().reduce(
    (total, { name, value }) => total + name.length + value.length + 4,
    0,
  );
  assert(
    projectedBytes < 13_000,
    `Shared field projection expanded to ${projectedBytes} declaration bytes`,
  );
  assert(
    monoLiveCssDeclarations().some(({ value }) => value.includes("abs(")),
  );
  assertEquals(
    densityScaledSpacingCssValue("8px"),
    "calc(8px * var(--discern-density))",
  );
  assertThrows(
    () => densityScaledSpacingCssValue("0.5rem"),
    TypeError,
    "authored pixel spacing fact",
  );
});

Deno.test("field axes expose bounded defaults and density only projects spacing", () => {
  for (
    const name of Object.keys(appearanceAxes) as (keyof typeof appearanceAxes)[]
  ) {
    assertEquals(defaultAppearance[name], appearanceAxes[name].default);
  }
  assertEquals(evaluateAppearanceSpacingUnit(), APPEARANCE_SPACING_UNIT_PX);
  assertEquals(evaluateAppearanceSpacingUnit({ density: 1.2 }), 4.8);
  assertThrows(
    () => evaluateAppearance({ darkness: 1.01 }),
    TypeError,
    "outside",
  );
});

Deno.test("one ordered expression tree owns every non-series colour role", () => {
  assertEquals(
    new Set(appearanceColorRoleLaws.map((law) => law.name)).size,
    appearanceColorRoleLaws.length,
  );
  assert(
    appearanceColorRoleLaws.every((law) => !law.name.includes("series")),
    "series colours must stay outside the field",
  );
  for (const darkness of APPEARANCE_CONTRAST_SAMPLE_DARKNESSES) {
    assertEquals(
      Object.keys(evaluateAppearance({ darkness })),
      appearanceColorRoleLaws.map((law) => law.name),
    );
  }
});

Deno.test("the field preserves alpha only for backdrop-owned roles", () => {
  for (const darkness of APPEARANCE_CONTRAST_SAMPLE_DARKNESSES) {
    const values = evaluateAppearance({ darkness });
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
  assert(
    appearanceContrastMargin() >= 0,
    `field margin ${appearanceContrastMargin()}`,
  );
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
    evaluateAppearanceShadows({ darkness: 1 })["--discern-shadow-pop"],
    "6px 6px 0 color-mix(in oklab, var(--discern-shadow-color) 28%, transparent)",
  );
});

Deno.test("derived component-intent roles preserve every current pole pair", () => {
  const pairs = Object.fromEntries(
    themeTokens.map((token) => [token.name, [token.light, token.dark]]),
  ) as Readonly<Record<string, readonly [string, string]>>;
  const pair = (name: string): readonly [string, string] => {
    const value = pairs[name];
    assert(value !== undefined, `missing Theme Token ${name}`);
    return value;
  };
  assertEquals(pair("--discern-color-accent-ink"), [
    pair("--discern-color-accent-600")[0],
    pair("--discern-color-accent-500")[1],
  ]);
  assertEquals(pair("--discern-color-brand-artwork-mask"), [
    "oklch(100% 0 0 / 0)",
    pair("--discern-color-ink-muted")[1],
  ]);
  assertEquals(pair("--discern-color-brand-artwork-ink"), [
    pair("--discern-color-accent-700")[0],
    pair("--discern-color-ink-muted")[1],
  ]);
  assertEquals(
    pair("--discern-color-action-edge"),
    pair("--discern-color-accent-ink"),
  );
  assertEquals(pair("--discern-color-action-shadow"), [
    "oklch(0% 0 0 / 0.82)",
    "oklch(100% 0 0 / 0.68)",
  ]);
  assertEquals(pair("--discern-color-neutral-edge"), [
    pair("--discern-color-ink")[0],
    pair("--discern-color-border-strong")[1],
  ]);
  assertEquals(pair("--discern-color-neutral-shadow"), [
    pair("--discern-color-ink")[0],
    pair("--discern-shadow-color")[1],
  ]);
  assertEquals(pair("--discern-color-avatar-highlight"), [
    pair("--discern-color-surface")[0],
    pair("--discern-color-accent-300")[1],
  ]);
  assertEquals(pair("--discern-color-avatar-fill-start"), [
    "oklch(96.1902% 0 0)",
    "oklch(20.1242% 0 0)",
  ]);
  assertEquals(pair("--discern-color-avatar-fill-end"), [
    "oklch(94.2866% 0 0)",
    "oklch(26.0774% 0 0)",
  ]);
});
