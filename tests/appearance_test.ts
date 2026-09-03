import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import {
  APPEARANCE_ADMISSION_HUES,
  APPEARANCE_ADMISSION_POINTS,
} from "../src/tokens/appearance-admission.ts";
import {
  appearanceColorRoleLaws,
  appearanceProjections,
  evaluateAppearance,
  normalizeAccentHue,
  resolveAppearance,
} from "../src/tokens/appearance.ts";
import { appearanceLiveCssDeclarations } from "../src/tokens/appearance-live-css.ts";
import { appearanceAdmission } from "../src/tokens/tokens.ts";

Deno.test("the package admits monochrome and the complete Accent hue circle", () => {
  const proof = appearanceAdmission();
  assertEquals(proof.failures, []);
  assertEquals(proof.accepted, true);
  assertEquals(proof.appearances, APPEARANCE_ADMISSION_HUES.length + 1);
  assertEquals(proof.points, APPEARANCE_ADMISSION_POINTS.length);
  assert(proof.checks > 190_000);
});

Deno.test("the package appearance admission is proved only once", () => {
  const proof = appearanceAdmission();
  const futureConsumer = appearanceAdmission;
  assertStrictEquals(appearanceAdmission(), proof);
  assertStrictEquals(futureConsumer(), proof);
});

Deno.test("Accent accepts the finite closed hue domain and normalises its seam", () => {
  assertEquals(normalizeAccentHue(0), 0);
  assertEquals(normalizeAccentHue(360), 0);
  assertEquals(normalizeAccentHue(27.5), 27.5);
  assertEquals(resolveAppearance({ accent: 360 }).accent, 0);
  assertEquals(
    evaluateAppearance({ darkness: 0.5, accent: 360 }),
    evaluateAppearance({ darkness: 0.5, accent: 0 }),
  );
  for (
    const invalid of [-0.0001, 360.0001, Number.NaN, Number.POSITIVE_INFINITY]
  ) {
    assertThrows(
      () => resolveAppearance({ accent: invalid }),
      TypeError,
      "finite [0, 360]",
    );
  }
});

Deno.test("an omitted accent resolves to monochrome without an accent key", () => {
  assertEquals(Object.keys(resolveAppearance({})).includes("accent"), false);
  assertEquals(
    Object.keys(resolveAppearance({ accent: undefined })).includes("accent"),
    false,
  );
  assertEquals(resolveAppearance({ accent: 120 }).accent, 120);
  assertEquals(evaluateAppearance({ accent: undefined }), evaluateAppearance());
});

Deno.test("every role auto-enrols in both evaluator and live CSS projections", () => {
  const roleNames = appearanceColorRoleLaws.map((law) => law.name);
  for (const projection of appearanceProjections) {
    const declarations = appearanceLiveCssDeclarations(projection);
    for (const name of roleNames) {
      assertEquals(
        declarations.filter((item) => item.name === name).length,
        1,
        `${projection} did not project ${name} exactly once`,
      );
    }
  }
  assert(appearanceColorRoleLaws.every((law) => Object.hasOwn(law, "accent")));
});

Deno.test("accent and axes remain orthogonal inputs", () => {
  const first = evaluateAppearance({
    darkness: 0.25,
    structure: 0.35,
    emphasis: 0.65,
    density: 0.8,
    accent: 255,
  });
  assertNotEquals(
    first["--discern-color-accent-600"],
    evaluateAppearance({
      darkness: 0.26,
      structure: 0.35,
      emphasis: 0.65,
      density: 0.8,
      accent: 255,
    })["--discern-color-accent-600"],
  );
  assertNotEquals(
    first["--discern-color-accent-600"],
    evaluateAppearance({
      darkness: 0.25,
      structure: 0.35,
      emphasis: 0.66,
      density: 0.8,
      accent: 255,
    })["--discern-color-accent-600"],
  );
  assertNotEquals(
    first["--discern-color-action-shadow"],
    evaluateAppearance({
      darkness: 0.25,
      structure: 0.36,
      emphasis: 0.65,
      density: 0.8,
      accent: 255,
    })["--discern-color-action-shadow"],
  );
  assertEquals(
    first,
    evaluateAppearance({
      darkness: 0.25,
      structure: 0.35,
      emphasis: 0.65,
      density: 1.2,
      accent: 255,
    }),
  );
});
