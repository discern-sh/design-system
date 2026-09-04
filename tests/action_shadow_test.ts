import { assert } from "@std/assert";
import {
  compositeOklab,
  type OklabColor,
  oklabDistance,
} from "../src/internal/oklch.ts";
import {
  ACTION_SHADOW_DISTANCE_FLOOR,
  type Appearance,
  APPEARANCE_POLARITY_CROSSOVER_DARKNESS,
  type AppearanceAxes,
  defaultAppearance,
  evaluateAppearance,
} from "../src/tokens/appearance.ts";

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

const point = (overrides: Partial<AppearanceAxes>): AppearanceAxes => ({
  ...defaultAppearance,
  ...overrides,
});

const points: readonly AppearanceAxes[] = [
  point({ darkness: 0 }),
  point({
    darkness: 0.25,
    structure: 0.35,
    emphasis: 0.65,
    density: 0.8,
  }),
  point({ darkness: APPEARANCE_POLARITY_CROSSOVER_DARKNESS - 0.0001 }),
  point({ darkness: APPEARANCE_POLARITY_CROSSOVER_DARKNESS + 0.0001 }),
  point({ darkness: 0.5 }),
  point({
    darkness: 0.75,
    structure: 1.4,
    emphasis: 1.35,
    density: 1.2,
  }),
  point({ darkness: 1 }),
  point({ darkness: 0.25, structure: 0 }),
  point({ darkness: 0.75, structure: 2 }),
];

Deno.test("hard primary shadows stay separate across monochrome and the Accent circle", () => {
  const appearances: readonly Pick<Appearance, "accent">[] = [
    {},
    ...Array.from({ length: 361 }, (_, hue) => ({ accent: hue })),
  ];
  for (const appearance of appearances) {
    for (const fieldPoint of points) {
      const values = evaluateAppearance({ ...fieldPoint, ...appearance });
      const canvas = required(values, "--discern-color-canvas").color;
      const fillPaint = required(values, "--discern-color-action");
      const shadowPaint = required(values, "--discern-color-action-shadow");
      const fill = compositeOklab(fillPaint.color, fillPaint.alpha, canvas);
      const shadow = compositeOklab(
        shadowPaint.color,
        shadowPaint.alpha,
        canvas,
      );
      assert(
        oklabDistance(shadow, fill) >= ACTION_SHADOW_DISTANCE_FLOOR,
        `${appearance.accent ?? "mono"} ${
          JSON.stringify(fieldPoint)
        } shadow merges with fill`,
      );
      assert(
        oklabDistance(shadow, canvas) >= ACTION_SHADOW_DISTANCE_FLOOR,
        `${appearance.accent ?? "mono"} ${
          JSON.stringify(fieldPoint)
        } shadow merges with canvas`,
      );
    }
  }
});
