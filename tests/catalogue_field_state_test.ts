import { assertEquals } from "@std/assert";
import { FIELD_POLARITY_CROSSOVER_DARKNESS } from "../src/tokens/field.ts";
import { catalogueFieldConsumerSnippet } from "../catalogue/pages/foundations/field-export.ts";
import {
  CATALOGUE_FIELD_HYSTERESIS,
  catalogueFieldControlScheme,
  catalogueFieldPolarity,
  catalogueFieldStyle,
  parseCatalogueFieldSelection,
  serializeCatalogueFieldSelection,
} from "../catalogue/shell/field-state.ts";

const point = {
  darkness: 0.6,
  structure: 1.25,
  emphasis: 0.75,
  density: 0.8,
} as const;

Deno.test("Catalogue field points round-trip through one canonical URL and storage value", () => {
  const encoded = serializeCatalogueFieldSelection(point);
  assertEquals(encoded, "0.6,1.25,0.75,0.8");
  assertEquals(parseCatalogueFieldSelection(encoded), point);
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
    assertEquals(parseCatalogueFieldSelection(invalid), undefined);
  }
});

Deno.test("live scheme hysteresis holds only inside the crossover band", () => {
  const selection = (darkness: number) => ({
    ...point,
    darkness,
  });
  const insideLight = FIELD_POLARITY_CROSSOVER_DARKNESS +
    CATALOGUE_FIELD_HYSTERESIS / 2;
  const insideDark = FIELD_POLARITY_CROSSOVER_DARKNESS -
    CATALOGUE_FIELD_HYSTERESIS / 2;
  assertEquals(
    catalogueFieldControlScheme(selection(insideLight), "light"),
    "light",
  );
  assertEquals(
    catalogueFieldControlScheme(selection(insideDark), "dark"),
    "dark",
  );
  assertEquals(
    catalogueFieldControlScheme(
      selection(
        FIELD_POLARITY_CROSSOVER_DARKNESS + CATALOGUE_FIELD_HYSTERESIS + 0.001,
      ),
      "light",
    ),
    "dark",
  );
  assertEquals(
    catalogueFieldControlScheme(
      selection(
        FIELD_POLARITY_CROSSOVER_DARKNESS - CATALOGUE_FIELD_HYSTERESIS - 0.001,
      ),
      "dark",
    ),
    "light",
  );
  assertEquals(
    catalogueFieldControlScheme(selection(insideLight)),
    catalogueFieldPolarity(selection(insideLight)),
  );
});

Deno.test("a field style writes axes, numeric hue, and the implied scheme", () => {
  const style = catalogueFieldStyle(point, undefined, 145.5);
  assertEquals(style["--discern-darkness" as keyof typeof style], 0.6);
  assertEquals(style["--discern-structure" as keyof typeof style], 1.25);
  assertEquals(style["--discern-emphasis" as keyof typeof style], 0.75);
  assertEquals(style["--discern-density" as keyof typeof style], 0.8);
  assertEquals(style["--discern-accent-hue" as keyof typeof style], 145.5);
  assertEquals(style.colorScheme, "dark");
});

Deno.test("consumer export reproduces the public Appearance scope and axes", () => {
  const accent = catalogueFieldConsumerSnippet(point, "accent", 145.5);
  assertEquals(
    accent,
    `<main
  data-discern-root
  data-discern-appearance="accent"
  style="--discern-darkness: 0.6; --discern-structure: 1.25; --discern-emphasis: 0.75; --discern-density: 0.8; --discern-accent-hue: 145.5; color-scheme: dark"
>
  <!-- Page content -->
</main>`,
  );
});
