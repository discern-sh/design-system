import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import {
  blueTheme,
  blueThemeCss,
  blueThemeRoleTokens,
  blueThemeTokens,
} from "../src/theme/blue.ts";
import {
  accentAppearance,
  DEFAULT_ACCENT_HUE,
  evaluateAppearance,
  evaluateField,
  fieldColorRoleLaws,
} from "../src/tokens/field.ts";
import { FIELD_LIVE_CSS_SUPPORTS } from "../src/tokens/field-css.ts";

Deno.test("Blue membership and poles derive exhaustively from Accent metadata", () => {
  const expected = fieldColorRoleLaws.filter((law) => law.accent !== "field")
    .map((law) => law.name);
  assertEquals(blueThemeRoleTokens.map((token) => token.name), expected);
  assertEquals(blueTheme.roles, blueThemeRoleTokens);
  assertEquals(blueTheme.primitives, blueThemeTokens);
  assertEquals(blueTheme.name, "blue");

  const light = evaluateAppearance(accentAppearance(DEFAULT_ACCENT_HUE), {
    darkness: 0,
  });
  const dark = evaluateAppearance(accentAppearance(DEFAULT_ACCENT_HUE), {
    darkness: 1,
  });
  for (const token of blueThemeRoleTokens) {
    assertEquals(
      token.light.replaceAll(
        "var(--discern-accent-hue)",
        String(DEFAULT_ACCENT_HUE),
      ),
      light[token.name],
    );
    assertEquals(
      token.dark.replaceAll(
        "var(--discern-accent-hue)",
        String(DEFAULT_ACCENT_HUE),
      ),
      dark[token.name],
    );
  }
});

Deno.test("Blue compatibility CSS supplies pole fallback and the live law", () => {
  assertStringIncludes(blueThemeCss, "@layer discern.theme");
  assertStringIncludes(blueThemeCss, "--discern-accent-hue: 255;");
  assertStringIncludes(blueThemeCss, `@supports ${FIELD_LIVE_CSS_SUPPORTS}`);
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

Deno.test("Blue action fill is chromatic and preserves Field inversion", () => {
  for (const darkness of [0, 1]) {
    const field = evaluateField({ darkness });
    const blue = evaluateAppearance(accentAppearance(DEFAULT_ACCENT_HUE), {
      darkness,
    });
    assertNotEquals(
      blue["--discern-color-action"],
      field["--discern-color-action"],
    );
    assertEquals(
      blue["--discern-color-on-action"],
      field["--discern-color-on-action"],
    );
  }
});

Deno.test("Blue has no hand-authored role-value table", async () => {
  const source = await Deno.readTextFile(
    new URL("../src/theme/blue.ts", import.meta.url),
  );
  assert(!source.includes("blueRoleValues"));
  assert(!source.includes("oklch(96.2%"));
});
