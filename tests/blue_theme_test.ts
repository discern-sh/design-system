import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  blueTheme,
  blueThemeCss,
  blueThemeRoleTokens,
  blueThemeTokens,
} from "../src/theme/blue.ts";
import { evaluateField, fieldColorRoleLaws } from "../src/tokens/field.ts";

Deno.test("blue preset role membership derives exhaustively from field metadata", () => {
  const expected = fieldColorRoleLaws.filter((law) => law.bluePreset).map((
    law,
  ) => law.name);
  assertEquals(blueThemeRoleTokens.map((token) => token.name), expected);
  assertEquals(blueTheme.roles, blueThemeRoleTokens);
  assertEquals(blueTheme.primitives, blueThemeTokens);
  assertEquals(blueTheme.name, "blue");

  const light = evaluateField({ darkness: 0 });
  const dark = evaluateField({ darkness: 1 });
  for (const token of blueThemeRoleTokens) {
    assert(
      token.light !== light[token.name] || token.dark !== dark[token.name],
      `${token.name} does not differ from the field`,
    );
  }
});

Deno.test("blue preset CSS covers explicit and system dark selection", () => {
  assertStringIncludes(blueThemeCss, "@layer discern.theme");
  assertStringIncludes(blueThemeCss, "--discern-accent-hue: 255;");
  assertStringIncludes(
    blueThemeCss,
    ':where([data-discern-root][data-discern-theme="dark"])',
  );
  assertStringIncludes(blueThemeCss, "@media (prefers-color-scheme: dark)");
  for (const token of blueThemeRoleTokens) {
    assertStringIncludes(blueThemeCss, `${token.name}: ${token.light};`);
    assertStringIncludes(blueThemeCss, `${token.name}: ${token.dark};`);
  }
});

Deno.test("blue action pair preserves the quiet-fill and deep-text treatment", () => {
  const values = Object.fromEntries(
    blueThemeRoleTokens.map((token) => [token.name, token]),
  );
  assertEquals(
    values["--discern-color-action"]?.light,
    values["--discern-color-accent-100"]?.light,
  );
  assertEquals(
    values["--discern-color-on-action"]?.dark,
    values["--discern-color-accent-800"]?.dark,
  );
});

Deno.test("blue derived roles preserve the component pairs they replace", () => {
  const values = Object.fromEntries(
    blueThemeRoleTokens.map((token) => [token.name, token]),
  );
  assertEquals(values["--discern-color-accent-ink"], {
    name: "--discern-color-accent-ink",
    light: "var(--discern-color-accent-600)",
    dark: "var(--discern-color-accent-500)",
    category: "Color",
    description:
      "Polarity-responsive accent ink for concise emphasis and data marks.",
  });
  assertEquals(
    values["--discern-color-brand-artwork-mask"]?.light,
    "transparent",
  );
  assertEquals(
    values["--discern-color-brand-artwork-mask"]?.dark,
    "currentColor",
  );
  assertEquals(
    values["--discern-color-action-edge"]?.light,
    "var(--discern-color-accent-600)",
  );
  assertEquals(
    values["--discern-color-action-shadow"]?.dark,
    "var(--discern-shadow-color)",
  );
  assertEquals(
    values["--discern-color-avatar-highlight"]?.light,
    "var(--discern-color-surface)",
  );
  assertEquals(
    values["--discern-color-avatar-fill-start"]?.dark,
    "color-mix(in oklab, var(--discern-color-accent-200) 68%, var(--discern-color-accent-100))",
  );
  assertEquals(
    values["--discern-color-avatar-fill-end"]?.dark,
    "color-mix(in oklab, var(--discern-color-accent-300) 52%, var(--discern-color-accent-200))",
  );
});
