import {
  assert,
  assertEquals,
  assertNotEquals,
  assertThrows,
} from "@std/assert";
import {
  APPEARANCE_ADMISSION_HUES,
  APPEARANCE_ADMISSION_POINTS,
} from "../src/tokens/appearance-admission.ts";
import {
  accentAppearance,
  evaluateAppearance,
  fieldColorRoleLaws,
  normalizeAccentHue,
} from "../src/tokens/field.ts";
import { appearanceLiveCssDeclarations } from "../src/tokens/field-css.ts";
import { appearanceAdmission } from "../src/tokens/tokens.ts";

Deno.test("the package admits Field and the complete Accent hue circle", () => {
  const proof = appearanceAdmission();
  assertEquals(proof.failures, []);
  assertEquals(proof.accepted, true);
  assertEquals(proof.appearances, APPEARANCE_ADMISSION_HUES.length + 1);
  assertEquals(proof.points, APPEARANCE_ADMISSION_POINTS.length);
  assert(proof.checks > 190_000);
});

Deno.test("Accent accepts the finite closed hue domain and normalises its seam", () => {
  assertEquals(normalizeAccentHue(0), 0);
  assertEquals(normalizeAccentHue(360), 0);
  assertEquals(normalizeAccentHue(27.5), 27.5);
  assertEquals(
    evaluateAppearance(accentAppearance(360), { darkness: 0.5 }),
    evaluateAppearance(accentAppearance(0), { darkness: 0.5 }),
  );
  for (
    const invalid of [-0.0001, 360.0001, Number.NaN, Number.POSITIVE_INFINITY]
  ) {
    assertThrows(() => accentAppearance(invalid), TypeError, "finite [0, 360]");
  }
});

Deno.test("every role auto-enrols in both evaluator and live CSS projections", () => {
  const roleNames = fieldColorRoleLaws.map((law) => law.name);
  for (const appearance of ["field", "accent"] as const) {
    const declarations = appearanceLiveCssDeclarations(appearance);
    for (const name of roleNames) {
      assertEquals(
        declarations.filter((item) => item.name === name).length,
        1,
        `${appearance} did not project ${name} exactly once`,
      );
    }
  }
  assert(fieldColorRoleLaws.every((law) => Object.hasOwn(law, "accent")));
});

Deno.test("palette and axes remain orthogonal inputs", () => {
  const appearance = accentAppearance(255);
  const first = evaluateAppearance(appearance, {
    darkness: 0.25,
    structure: 0.35,
    emphasis: 0.65,
    density: 0.8,
  });
  assertNotEquals(
    first["--discern-color-accent-600"],
    evaluateAppearance(appearance, {
      darkness: 0.26,
      structure: 0.35,
      emphasis: 0.65,
      density: 0.8,
    })["--discern-color-accent-600"],
  );
  assertNotEquals(
    first["--discern-color-accent-600"],
    evaluateAppearance(appearance, {
      darkness: 0.25,
      structure: 0.35,
      emphasis: 0.66,
      density: 0.8,
    })["--discern-color-accent-600"],
  );
  assertNotEquals(
    first["--discern-color-action-shadow"],
    evaluateAppearance(appearance, {
      darkness: 0.25,
      structure: 0.36,
      emphasis: 0.65,
      density: 0.8,
    })["--discern-color-action-shadow"],
  );
  assertEquals(
    first,
    evaluateAppearance(appearance, {
      darkness: 0.25,
      structure: 0.35,
      emphasis: 0.65,
      density: 1.2,
    }),
  );
});
