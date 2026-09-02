import { assert, assertEquals } from "@std/assert";
import {
  compositeOklab,
  type OklabColor,
  oklabDistance,
} from "../src/internal/oklch.ts";
import {
  accentAppearance,
  type Appearance,
  defaultFieldPoint,
  evaluateAppearance,
  FIELD_POLARITY_CROSSOVER_DARKNESS,
  fieldAppearance,
  fieldColorRoleLaws,
  type FieldPoint,
  ownedSurfaceRoleNames,
} from "../src/tokens/field.ts";

interface Paint {
  readonly color: OklabColor;
  readonly alpha: number;
}

function parseOklch(value: string): Paint {
  const match = value.match(
    /^oklch\(([+-]?[\d.]+)%\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:\s+\/\s+([+-]?[\d.]+))?\)$/u,
  );
  if (match === null) throw new TypeError(`Expected OKLCH, received ${value}`);
  const chroma = Number(match[2]);
  const hue = Number(match[3]) * Math.PI / 180;
  return {
    color: {
      lightness: Number(match[1]) / 100,
      a: chroma * Math.cos(hue),
      b: chroma * Math.sin(hue),
    },
    alpha: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function required(
  values: Readonly<Record<string, string>>,
  name: string,
): Paint {
  const value = values[name];
  if (value === undefined) throw new TypeError(`Appearance omitted ${name}`);
  return parseOklch(value);
}

const point = (overrides: Partial<FieldPoint>): FieldPoint => ({
  ...defaultFieldPoint,
  ...overrides,
});

const points: readonly FieldPoint[] = [
  point({ darkness: 0 }),
  point({ darkness: 0.25 }),
  point({ darkness: FIELD_POLARITY_CROSSOVER_DARKNESS - 0.0001 }),
  point({ darkness: FIELD_POLARITY_CROSSOVER_DARKNESS + 0.0001 }),
  point({ darkness: 0.5 }),
  point({ darkness: 0.75 }),
  point({ darkness: 1 }),
];

Deno.test("owned-surface metadata auto-enrols identity bases", () => {
  const owned = ownedSurfaceRoleNames();
  assert(owned.includes("--discern-color-avatar-fill-start"));
  assert(owned.includes("--discern-color-avatar-fill-end"));
  assertEquals(
    ownedSurfaceRoleNames([{
      name: "--discern-color-future-identity",
      ownedSurface: true,
    }]),
    ["--discern-color-future-identity"],
  );
  assert(
    fieldColorRoleLaws.filter((law) => law.ownedSurface).every((law) =>
      owned.includes(law.name)
    ),
  );
});

Deno.test("identity-fill interiors are opaque over canvas, surface, and siblings", () => {
  const appearances: readonly Appearance[] = [
    fieldAppearance,
    ...[0, 28, 120, 152, 255, 335, 359.9999, 360].map(accentAppearance),
  ];
  for (const appearance of appearances) {
    for (const fieldPoint of points) {
      const values = evaluateAppearance(appearance, fieldPoint);
      const backdrops = [
        required(values, "--discern-color-canvas").color,
        required(values, "--discern-color-surface").color,
        required(values, "--discern-color-avatar-fill-end").color,
      ];
      for (
        const name of [
          "--discern-color-avatar-fill-start",
          "--discern-color-avatar-fill-end",
        ] as const
      ) {
        const paint = required(values, name);
        assertEquals(paint.alpha, 1, `${appearance.name} ${name}`);
        for (const backdrop of backdrops) {
          assert(
            oklabDistance(
              compositeOklab(paint.color, paint.alpha, backdrop),
              paint.color,
            ) < 1e-12,
            `${appearance.name} ${
              JSON.stringify(fieldPoint)
            } ${name} leaked its backdrop`,
          );
        }
      }
    }
  }
});
