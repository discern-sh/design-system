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
  catalogueAppearanceStyle,
  catalogueFieldFailures,
  catalogueFieldPointProof,
  defaultCatalogueAppearanceOption,
} from "../catalogue/shell/appearance-options.ts";
import { blueThemeRoleTokens, blueThemeTokens } from "../src/theme/blue.ts";
import type { ThemeToken } from "../src/tokens/tokens.ts";

function testToken(
  name: ThemeToken["name"],
  light: string,
  dark: string,
): ThemeToken {
  return { name, light, dark, category: "Color", description: "Test value." };
}

Deno.test("every exposed Appearance option passes both Theme semantic proofs", () => {
  assertEquals(
    catalogueAppearanceOptions.map((option) =>
      option.kind === "hue" ? [option.id, option.hue] : [option.id, option.kind]
    ),
    [
      ["field", "field"],
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
  assertEquals(defaultCatalogueAppearanceOption.id, "field");
  assertEquals(catalogueFieldFailures(), []);
  assertCatalogueAppearanceOptions(catalogueAppearanceOptions);
  for (const option of catalogueAppearanceOptions) {
    assertEquals(catalogueAppearanceOption(option.id), option);
    if (option.kind === "field") {
      assertEquals(catalogueAppearanceStyle(option, "light"), {});
      assertEquals(catalogueAppearanceStyle(option, "dark"), {});
    } else if (option.kind === "hue") {
      assertEquals(catalogueAppearanceOption(String(option.hue)), option);
      assertEquals(catalogueAppearanceStyle(option, "light"), {
        "--discern-accent-hue": String(option.hue),
        ...Object.fromEntries(
          blueThemeRoleTokens.map((token) => [token.name, token.light]),
        ),
      });
      assertEquals(catalogueAppearanceStyle(option, "dark"), {
        "--discern-accent-hue": String(option.hue),
        ...Object.fromEntries(
          blueThemeRoleTokens.map((token) => [token.name, token.dark]),
        ),
      });
    }
  }
});

Deno.test("one detailed authority supplies browser margins and test refusals", () => {
  const proof = catalogueFieldPointProof({
    darkness: 0.6,
    structure: 1.2,
    emphasis: 0.8,
    density: 1.1,
    preset: "mono",
  });
  assertEquals(proof.accepted, false);
  assertEquals(proof.failures, [
    "field 0.6 accent collides with danger (0.074 OKLab)",
  ]);
  assert(proof.checks.length > 30);
  assert(
    proof.checks.every((check) =>
      check.margin === check.observed - check.floor
    ),
  );
  assert(
    proof.checks.some(({ label }) => label.includes("action pair")),
  );
  assert(
    proof.checks.some(({ label }) => label.includes("series-1 to series-2")),
  );
  assertEquals(
    catalogueFieldPointProof({
      darkness: 0,
      structure: 1,
      emphasis: 1,
      density: 1,
      preset: "mono",
    }).accepted,
    true,
  );
});

Deno.test("unsafe arbitrary and synthetic future Appearance choices fail closed", () => {
  for (const hue of [20, 128, 145, 200]) {
    assertEquals(catalogueAppearanceOption(String(hue)), undefined);
  }
  const error = assertThrows(
    () =>
      assertCatalogueAppearanceOptions([
        ...catalogueAppearanceOptions,
        { kind: "hue", id: "future-green", label: "Future green", hue: 145 },
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

Deno.test("unsafe synthetic role presets fail closed before exposure", () => {
  const collision = assertThrows(
    () =>
      assertCatalogueAppearanceOptions([
        ...catalogueAppearanceOptions,
        {
          kind: "preset",
          id: "future-preset",
          label: "Future preset",
          overrides: [
            testToken(
              "--discern-color-accent-600",
              "oklch(0% 0 0)",
              "oklch(100% 0 0)",
            ),
          ],
        },
      ]),
    TypeError,
  );
  assertStringIncludes(collision.message, "future-preset");
  assertStringIncludes(collision.message, "accent collides with danger");

  const translucent = assertThrows(
    () =>
      assertCatalogueAppearanceOptions([
        ...catalogueAppearanceOptions,
        {
          kind: "preset",
          id: "future-glass",
          label: "Future glass",
          overrides: [
            testToken(
              "--discern-color-canvas",
              "oklch(100% 0 0 / 0.5)",
              "oklch(25% 0.018 285)",
            ),
          ],
        },
      ]),
    TypeError,
  );
  assertStringIncludes(translucent.message, "canvas must be opaque");

  assertThrows(
    () =>
      assertCatalogueAppearanceOptions([
        ...catalogueAppearanceOptions,
        {
          kind: "preset",
          id: "future-unknown",
          label: "Future unknown",
          overrides: [
            testToken(
              "--discern-color-imaginary",
              "oklch(50% 0 0)",
              "oklch(50% 0 0)",
            ),
          ],
        },
      ]),
    TypeError,
    "unknown Theme Token",
  );

  assertThrows(
    () =>
      assertCatalogueAppearanceOptions([
        ...catalogueAppearanceOptions,
        {
          kind: "preset",
          id: "future-empty",
          label: "Future empty",
          overrides: [],
        },
      ]),
    TypeError,
    "overrides no Theme Tokens",
  );
});

Deno.test("the complete low-level hue range is swept before presets claim safety", () => {
  const safeHues = Array.from(
    { length: 361 },
    (_, hue) => hue,
  ).filter((hue) => catalogueAppearanceHueFailures(hue).length === 0);
  assert(safeHues.length > 0);
  assert(safeHues.length < 361);
  for (const option of catalogueAppearanceOptions) {
    if (option.kind === "hue") assert(safeHues.includes(option.hue));
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

Deno.test("the blue hue primitive tells consumers to coordinate semantic roles", async () => {
  const accent = blueThemeTokens.find(({ name }) =>
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

  const monoFixture = await Deno.readTextFile(
    new URL("fixtures/mono-consumer-theme.css", import.meta.url),
  );
  assert(!monoFixture.includes("--discern-accent-hue"));
  for (const role of ["success", "success-soft", "success-deep"]) {
    assertStringIncludes(monoFixture, `--discern-color-${role}:`);
  }
});
