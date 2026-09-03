import { assertEquals } from "@std/assert";
import {
  defaultCatalogueAppearanceState,
  parseCatalogueAppearanceParameters,
  preserveCatalogueAppearanceHref,
  serializeCatalogueAppearanceState,
  setCatalogueAccent,
  setCatalogueFieldPoint,
} from "../catalogue/shell/appearance-state.ts";

const state = {
  theme: "dark",
  accent: 145.5,
  field: {
    darkness: 0.72,
    structure: 1.6,
    emphasis: 0.65,
    density: 1.3,
  },
} as const;

Deno.test("orthogonal Appearance transitions preserve every unrelated input", () => {
  assertEquals(setCatalogueAccent(state, undefined), {
    ...state,
    accent: undefined,
  });
  assertEquals(setCatalogueAccent(state, 335), { ...state, accent: 335 });
  assertEquals(setCatalogueAccent(state, 360), { ...state, accent: 0 });
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
    "/catalogue/components/button/?field=0.4%2C0.5%2C1.5%2C0.75&theme=dark&accent=145.5",
  );
});

Deno.test("one canonical state value round-trips policy, optional accent, and axes", () => {
  const encoded = serializeCatalogueAppearanceState(state);
  assertEquals(
    encoded,
    "theme=dark&accent=145.5&field=0.72%2C1.6%2C0.65%2C1.3",
  );
  assertEquals(
    parseCatalogueAppearanceParameters(new URLSearchParams(encoded)),
    state,
  );
  const mono = { ...state, accent: undefined };
  const monoEncoded = serializeCatalogueAppearanceState(mono);
  assertEquals(
    monoEncoded,
    "theme=dark&accent=none&field=0.72%2C1.6%2C0.65%2C1.3",
  );
  assertEquals(
    parseCatalogueAppearanceParameters(new URLSearchParams(monoEncoded)),
    mono,
  );
});

Deno.test("legacy identity, named Accent, and preset-bearing links migrate without losing axes", () => {
  assertEquals(
    parseCatalogueAppearanceParameters(
      new URLSearchParams("theme=dark&accent=violet"),
    ),
    {
      ...defaultCatalogueAppearanceState,
      theme: "dark",
      accent: 300,
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
      new URLSearchParams("theme=light&appearance=field&accent=300"),
    ),
    {
      ...defaultCatalogueAppearanceState,
      theme: "light",
      accent: undefined,
    },
  );
  assertEquals(
    parseCatalogueAppearanceParameters(
      new URLSearchParams("theme=light&appearance=accent"),
    ),
    {
      ...defaultCatalogueAppearanceState,
      theme: "light",
      accent: 255,
    },
  );
  assertEquals(
    parseCatalogueAppearanceParameters(
      new URLSearchParams("field=0.6,1.2,0.8,1.1,blue"),
    ),
    {
      theme: "dark",
      accent: 255,
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
      accent: undefined,
      field: {
        darkness: 0.25,
        structure: 0.4,
        emphasis: 1.3,
        density: 0.75,
      },
    },
  );
  const migrated = new URLSearchParams("theme=light&appearance=accent");
  const parsed = parseCatalogueAppearanceParameters(migrated);
  assertEquals(
    serializeCatalogueAppearanceState(parsed!),
    "theme=light&accent=255&field=0%2C1%2C1%2C1",
  );
});

Deno.test("partial and invalid inputs fail closed by coordinate", () => {
  assertEquals(
    parseCatalogueAppearanceParameters(
      new URLSearchParams("theme=invented&accent=361&field=0.4,1,1"),
    ),
    defaultCatalogueAppearanceState,
  );
  assertEquals(
    parseCatalogueAppearanceParameters(
      new URLSearchParams("theme=light&appearance=blue"),
    ),
    defaultCatalogueAppearanceState,
  );
  assertEquals(
    parseCatalogueAppearanceParameters(new URLSearchParams()),
    undefined,
  );
});
