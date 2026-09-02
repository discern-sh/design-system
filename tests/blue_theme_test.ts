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
