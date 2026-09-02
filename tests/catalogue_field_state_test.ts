import { assertEquals } from "@std/assert";
import { FIELD_POLARITY_CROSSOVER_DARKNESS } from "../src/tokens/field.ts";
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
  preset: "blue",
} as const;

Deno.test("Catalogue field points round-trip through one canonical URL and storage value", () => {
  const encoded = serializeCatalogueFieldSelection(point);
  assertEquals(encoded, "0.6,1.25,0.75,0.8,blue");
  assertEquals(parseCatalogueFieldSelection(encoded), point);
  for (
    const invalid of [
      null,
      "",
      "0.6,1,1,1",
      "0.6,1,1,1,green",
      "-0.1,1,1,1,mono",
      "0.6,3,1,1,mono",
      "0.6,1,1,0.2,mono",
      "NaN,1,1,1,mono",
    ]
  ) {
    assertEquals(parseCatalogueFieldSelection(invalid), undefined);
  }
});

Deno.test("live scheme hysteresis holds only inside the crossover band", () => {
  const selection = (darkness: number) => ({
    ...point,
    darkness,
    preset: "mono" as const,
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

Deno.test("a field style writes all real axes and the implied scheme", () => {
  const style = catalogueFieldStyle({ ...point, preset: "mono" });
  assertEquals(style["--discern-darkness" as keyof typeof style], 0.6);
  assertEquals(style["--discern-structure" as keyof typeof style], 1.25);
  assertEquals(style["--discern-emphasis" as keyof typeof style], 0.75);
  assertEquals(style["--discern-density" as keyof typeof style], 0.8);
  assertEquals(style.colorScheme, "dark");
});
