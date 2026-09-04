import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import {
  catalogueAccentHue,
  catalogueAccentHueLabel,
  catalogueAppearanceOption,
  catalogueAppearanceOptions,
  catalogueAppearanceStyle,
  defaultCatalogueAppearanceOption,
} from "../catalogue/shell/appearance-options.ts";
import { evaluateAppearance } from "../src/tokens/appearance.ts";
import { appearanceAdmission } from "../src/tokens/tokens.ts";

Deno.test("named Accent choices are numeric conveniences, with Blue at hue 255", () => {
  assertEquals(
    catalogueAppearanceOptions.map(({ id, hue }) => [id, hue]),
    [
      ["red", 2],
      ["green", 120],
      ["sky", 235],
      ["azure", 245],
      ["blue", 255],
      ["indigo", 270],
      ["purple", 285],
      ["violet", 300],
      ["magenta", 315],
      ["fuchsia", 325],
      ["rose", 335],
      ["crimson", 350],
    ],
  );
  assertEquals(defaultCatalogueAppearanceOption.id, "blue");
  for (const option of catalogueAppearanceOptions) {
    assertEquals(catalogueAppearanceOption(option.id), option);
    assertEquals(catalogueAppearanceOption(option.hue), option);
    assertEquals(catalogueAccentHue(option.id), option.hue);
    assertEquals(
      catalogueAccentHueLabel(option.hue),
      `${option.label} ${option.hue}`,
    );
  }
});

Deno.test("the complete numeric hue primitive admits named and unnamed fractions", () => {
  for (const hue of [0, 2, 20, 128, 145.5, 200, 359.999, 360]) {
    assertEquals(catalogueAccentHue(hue), hue === 360 ? 0 : hue);
  }
  assertEquals(catalogueAccentHue(-0.1), undefined);
  assertEquals(catalogueAccentHue(360.1), undefined);
  assertEquals(catalogueAccentHue(Number.NaN), undefined);
  assertEquals(catalogueAccentHue("invented"), undefined);
  assertEquals(catalogueAppearanceOption(145.5), undefined);
  assertEquals(
    (catalogueAppearanceStyle(145.5) as Record<string, unknown>)[
      "--discern-accent-hue"
    ],
    145.5,
  );
  assertEquals(
    (catalogueAppearanceStyle(360) as Record<string, unknown>)[
      "--discern-accent-hue"
    ],
    0,
  );
});

Deno.test("Catalogue defers full-domain admission and role projection to the package", () => {
  const proof = appearanceAdmission();
  assertEquals(proof.accepted, true);
  assertEquals(proof.failures, []);
  assert(proof.appearances > 361);
  assert(proof.points >= 11);
  assert(proof.checks > 100_000);

  const lightQuiet = evaluateAppearance({
    accent: 145.5,
    darkness: 0.2,
    structure: 1,
    emphasis: 0.6,
    density: 1,
  });
  const darkQuiet = evaluateAppearance({
    accent: 145.5,
    darkness: 0.8,
    structure: 1,
    emphasis: 0.6,
    density: 1,
  });
  const darkStrong = evaluateAppearance({
    accent: 145.5,
    darkness: 0.8,
    structure: 1,
    emphasis: 1.4,
    density: 1,
  });
  assertNotEquals(
    lightQuiet["--discern-color-accent-500"],
    darkQuiet["--discern-color-accent-500"],
  );
  assertNotEquals(
    darkQuiet["--discern-color-accent-100"],
    darkStrong["--discern-color-accent-100"],
  );
});

Deno.test("the green consumer fixture overrides the public accent hue primitive", async () => {
  const fixture = await Deno.readTextFile(
    new URL("fixtures/green-theme.css", import.meta.url),
  );
  assertStringIncludes(fixture, "--discern-accent-hue: 145");
  for (const role of ["success", "success-soft", "success-deep"]) {
    assertStringIncludes(fixture, `--discern-color-${role}:`);
  }
});
