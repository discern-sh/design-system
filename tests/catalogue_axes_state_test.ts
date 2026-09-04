import { assertEquals } from "@std/assert";
import { APPEARANCE_POLARITY_CROSSOVER_DARKNESS } from "../src/tokens/appearance.ts";
import { catalogueAppearanceConsumerSnippet } from "../catalogue/pages/foundations/appearance-export.ts";
import {
  CATALOGUE_AXES_HYSTERESIS,
  catalogueAppearanceRootStyle,
  catalogueAxesControlScheme,
  catalogueAxesPolarity,
  defaultCatalogueAxesSelection,
  parseCatalogueAxes,
  serializeCatalogueAxes,
} from "../catalogue/shell/axes-state.ts";

const point = {
  ...defaultCatalogueAxesSelection,
  darkness: 0.6,
  structure: 1.25,
  emphasis: 0.75,
  density: 0.8,
} as const;

Deno.test("Catalogue axes round-trip through one canonical URL and storage value", () => {
  const encoded = serializeCatalogueAxes(point);
  assertEquals(encoded, "0.6,1.25,0.75,0.8");
  assertEquals(parseCatalogueAxes(encoded), point);
  for (
    const invalid of [
      null,
      "",
      "0.6,1,1",
      "0.6,1,1,1,green",
      "-0.1,1,1,1",
      "0.6,3,1,1",
      "0.6,1,1,0.2",
      "NaN,1,1,1",
    ]
  ) {
    assertEquals(parseCatalogueAxes(invalid), undefined);
  }
});

Deno.test("live scheme hysteresis holds only inside the crossover band", () => {
  const selection = (darkness: number) => ({
    ...point,
    darkness,
  });
  const insideLight = APPEARANCE_POLARITY_CROSSOVER_DARKNESS +
    CATALOGUE_AXES_HYSTERESIS / 2;
  const insideDark = APPEARANCE_POLARITY_CROSSOVER_DARKNESS -
    CATALOGUE_AXES_HYSTERESIS / 2;
  assertEquals(
    catalogueAxesControlScheme(selection(insideLight), "light"),
    "light",
  );
  assertEquals(
    catalogueAxesControlScheme(selection(insideDark), "dark"),
    "dark",
  );
  assertEquals(
    catalogueAxesControlScheme(
      selection(
        APPEARANCE_POLARITY_CROSSOVER_DARKNESS + CATALOGUE_AXES_HYSTERESIS +
          0.001,
      ),
      "light",
    ),
    "dark",
  );
  assertEquals(
    catalogueAxesControlScheme(
      selection(
        APPEARANCE_POLARITY_CROSSOVER_DARKNESS - CATALOGUE_AXES_HYSTERESIS -
          0.001,
      ),
      "dark",
    ),
    "light",
  );
  assertEquals(
    catalogueAxesControlScheme(selection(insideLight)),
    catalogueAxesPolarity(selection(insideLight)),
  );
});

Deno.test("a root style writes axes, numeric hue, and the implied scheme", () => {
  const style = catalogueAppearanceRootStyle(point, undefined, 145.5);
  assertEquals(style["--discern-darkness" as keyof typeof style], 0.6);
  assertEquals(style["--discern-structure" as keyof typeof style], 1.25);
  assertEquals(style["--discern-emphasis" as keyof typeof style], 0.75);
  assertEquals(style["--discern-density" as keyof typeof style], 0.8);
  assertEquals(style["--discern-accent-hue" as keyof typeof style], 145.5);
  assertEquals(style.colorScheme, "dark");
});

Deno.test("consumer export reproduces the public accent scope and axes", () => {
  const accent = catalogueAppearanceConsumerSnippet(point, 145.5);
  assertEquals(
    accent,
    `<main
  data-discern-root
  data-discern-accent
  style="--discern-darkness: 0.6; --discern-structure: 1.25; --discern-emphasis: 0.75; --discern-density: 0.8; --discern-accent-hue: 145.5; color-scheme: dark"
>
  <!-- Page content -->
</main>`,
  );
  const mono = catalogueAppearanceConsumerSnippet(point);
  assertEquals(
    mono,
    `<main
  data-discern-root
  style="--discern-darkness: 0.6; --discern-structure: 1.25; --discern-emphasis: 0.75; --discern-density: 0.8; color-scheme: dark"
>
  <!-- Page content -->
</main>`,
  );
});

Deno.test("tinted points append the four tint axes and untinted points omit them", () => {
  const tinted = {
    ...point,
    paperTint: 0.4,
    paperTintHue: 80,
    inkTint: 0.6,
    inkTintHue: 265,
  } as const;
  const encoded = serializeCatalogueAxes(tinted);
  assertEquals(encoded, "0.6,1.25,0.75,0.8,0.4,80,0.6,265");
  assertEquals(parseCatalogueAxes(encoded), tinted);
  assertEquals(parseCatalogueAxes("0.6,1.25,0.75,0.8,0,0,0,0"), point);
  assertEquals(
    parseCatalogueAxes("0.6,1.25,0.75,0.8,1.5,80,0.6,265"),
    undefined,
  );
  assertEquals(parseCatalogueAxes("0.6,1.25,0.75,0.8,0.4,80"), undefined);
  const style = catalogueAppearanceRootStyle(tinted, "light");
  assertEquals(style["--discern-paper-tint" as keyof typeof style], 0.4);
  assertEquals(style["--discern-ink-tint-hue" as keyof typeof style], 265);
});
