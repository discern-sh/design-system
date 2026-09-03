import { assert, assertAlmostEquals, assertThrows } from "@std/assert";
import {
  parseComputedAppearanceColor,
} from "../scripts/conformance/appearance-projection.ts";
import { oklabDistance } from "../src/internal/oklch.ts";

Deno.test("computed field colours retain low-alpha coordinates without raster loss", () => {
  const white = { lightness: 1, a: 0, b: 0 };
  for (
    const serialized of [
      "oklch(1 0 0 / 0.1)",
      "oklab(100% 0 0 / 10%)",
      "color(srgb 1 1 1 / 0.1)",
      "rgb(255 255 255 / 10%)",
    ]
  ) {
    const parsed = parseComputedAppearanceColor(serialized);
    assert(
      oklabDistance(parsed.color, white) < 0.000001,
      `${serialized} moved by ${oklabDistance(parsed.color, white)}`,
    );
    assertAlmostEquals(parsed.alpha, 0.1, 0.000001);
  }
});

Deno.test("computed field colour parsing rejects an unrecognized future form", () => {
  assertThrows(
    () => parseComputedAppearanceColor("hsl(0 0% 50%)"),
    TypeError,
    "Unsupported computed colour serialization",
  );
});
