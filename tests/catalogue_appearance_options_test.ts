import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  assertCatalogueAppearanceOptions,
  catalogueAppearanceHueFailures,
  catalogueAppearanceOption,
  catalogueAppearanceOptions,
  defaultCatalogueAppearanceOption,
} from "../catalogue/shell/appearance-options.ts";
import { catalogueAccent } from "../catalogue/shell/appearance-state.ts";
import { discernThemeTokens } from "../src/tokens/tokens.ts";

Deno.test("every exposed Appearance option passes both Theme semantic proofs", () => {
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
  assertCatalogueAppearanceOptions(catalogueAppearanceOptions);
  for (const option of catalogueAppearanceOptions) {
    assertEquals(catalogueAppearanceOption(option.id), option);
    assertEquals(catalogueAppearanceOption(String(option.hue)), option);
    assertEquals(catalogueAccent(String(option.hue)), option.hue);
  }
});

Deno.test("unsafe arbitrary and synthetic future Appearance choices fail closed", () => {
  for (const hue of [20, 128, 145, 200]) {
    assertEquals(catalogueAccent(String(hue)), undefined);
    assertEquals(catalogueAppearanceOption(String(hue)), undefined);
  }
  const error = assertThrows(
    () =>
      assertCatalogueAppearanceOptions([
        ...catalogueAppearanceOptions,
        { id: "future-green", label: "Future green", hue: 145 },
      ]),
    TypeError,
  );
  assertStringIncludes(error.message, "future-green");
  assertStringIncludes(error.message, "success");

  assertThrows(
    () =>
      assertCatalogueAppearanceOptions(
        catalogueAppearanceOptions.map(({ default: _default, ...option }) =>
          option
        ),
      ),
    TypeError,
    "exactly one default",
  );
});

Deno.test("the complete low-level hue range is swept before presets claim safety", () => {
  const safeHues = Array.from(
    { length: 361 },
    (_, hue) => hue,
  ).filter((hue) => catalogueAppearanceHueFailures(hue).length === 0);
  assert(safeHues.length > 0);
  assert(safeHues.length < 361);
  for (const { hue } of catalogueAppearanceOptions) {
    assert(safeHues.includes(hue));
  }
  assert(
    catalogueAppearanceHueFailures(20).some((failure) =>
      failure.includes("danger")
    ),
  );
  assert(
    catalogueAppearanceHueFailures(145).some((failure) =>
      failure.includes("success")
    ),
  );
});

Deno.test("the public hue primitive tells consumers to coordinate semantic roles", async () => {
  const accent = discernThemeTokens.find(({ name }) =>
    name === "--discern-accent-hue"
  );
  assert(accent !== undefined);
  assertStringIncludes(accent.description, "semantic");
  assertStringIncludes(accent.description, "override");

  const fixture = await Deno.readTextFile(
    new URL("fixtures/green-theme.css", import.meta.url),
  );
  assertStringIncludes(fixture, "--discern-accent-hue: 145");
  for (const role of ["success", "success-soft", "success-deep"]) {
    assertStringIncludes(fixture, `--discern-color-${role}:`);
  }
});
