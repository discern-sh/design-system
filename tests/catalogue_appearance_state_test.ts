import { assertEquals } from "@std/assert";
import {
  defaultCatalogueAppearanceState,
  parseCatalogueAppearanceParameters,
  preserveCatalogueAppearanceHref,
  serializeCatalogueAppearanceState,
  setCatalogueAccentHue,
  setCatalogueAppearanceIdentity,
  setCatalogueFieldPoint,
} from "../catalogue/shell/appearance-state.ts";

const state = {
  theme: "dark",
  appearance: "accent",
  accentHue: 145.5,
  field: {
    darkness: 0.72,
    structure: 1.6,
    emphasis: 0.65,
    density: 1.3,
  },
} as const;

Deno.test("orthogonal Appearance transitions preserve every unrelated input", () => {
  assertEquals(setCatalogueAppearanceIdentity(state, "field"), {
    ...state,
    appearance: "field",
  });
  assertEquals(setCatalogueAccentHue(state, 335), {
    ...state,
    accentHue: 335,
  });
  assertEquals(setCatalogueAccentHue(state, 360), {
    ...state,
    accentHue: 0,
  });
  assertEquals(
    setCatalogueFieldPoint(state, { ...state.field, density: 0.8 }),
    { ...state, field: { ...state.field, density: 0.8 } },
  );
});

Deno.test("local navigation merges one explicit orthogonal coordinate", () => {
  const current = new URL(
    `https://catalogue.example/catalogue/?${
      serializeCatalogueAppearanceState(state)
    }`,
  );
  assertEquals(
    preserveCatalogueAppearanceHref(
      current,
      "/catalogue/components/button/?field=0.4,0.5,1.5,0.75",
    ),
    "/catalogue/components/button/?field=0.4%2C0.5%2C1.5%2C0.75&theme=dark&appearance=accent&accent=145.5",
  );
});

Deno.test("one canonical state value round-trips identity, numeric hue, axes, and policy", () => {
  const encoded = serializeCatalogueAppearanceState(state);
  assertEquals(
    encoded,
    "theme=dark&appearance=accent&accent=145.5&field=0.72%2C1.6%2C0.65%2C1.3",
  );
  assertEquals(
    parseCatalogueAppearanceParameters(new URLSearchParams(encoded)),
    state,
  );
});

Deno.test("legacy named Accent and preset-bearing Field links migrate without losing axes", () => {
  assertEquals(
    parseCatalogueAppearanceParameters(
      new URLSearchParams("theme=dark&accent=violet"),
    ),
    {
      ...defaultCatalogueAppearanceState,
      theme: "dark",
      appearance: "accent",
      accentHue: 300,
      field: { ...defaultCatalogueAppearanceState.field, darkness: 1 },
    },
  );
  assertEquals(
    parseCatalogueAppearanceParameters(new URLSearchParams("theme=dark")),
    {
      ...defaultCatalogueAppearanceState,
      theme: "dark",
      field: { ...defaultCatalogueAppearanceState.field, darkness: 1 },
    },
  );
  assertEquals(
    parseCatalogueAppearanceParameters(
      new URLSearchParams("field=0.6,1.2,0.8,1.1,blue"),
    ),
    {
      theme: "dark",
      appearance: "accent",
      accentHue: 255,
      field: {
        darkness: 0.6,
        structure: 1.2,
        emphasis: 0.8,
        density: 1.1,
      },
    },
  );
  assertEquals(
    parseCatalogueAppearanceParameters(
      new URLSearchParams("field=0.25,0.4,1.3,0.75,mono"),
    ),
    {
      theme: "light",
      appearance: "field",
      accentHue: 255,
      field: {
        darkness: 0.25,
        structure: 0.4,
        emphasis: 1.3,
        density: 0.75,
      },
    },
  );
});

Deno.test("partial and invalid inputs fail closed by coordinate", () => {
  assertEquals(
    parseCatalogueAppearanceParameters(
      new URLSearchParams(
        "theme=invented&appearance=accent&accent=361&field=0.4,1,1",
      ),
    ),
    defaultCatalogueAppearanceState,
  );
  assertEquals(
    parseCatalogueAppearanceParameters(new URLSearchParams()),
    undefined,
  );
});
