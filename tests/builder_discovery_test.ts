import { assert, assertEquals } from "@std/assert";
import { buildDesignSystem } from "../scripts/build.ts";

Deno.test("discovery enrolls every registry core member through shared search and image facts", async () => {
  await buildDesignSystem();
  const {
    builderDiscoveryRecords,
    discoverBuilderComponents,
    discoveryImagePresentation,
  } = await import("../catalogue/builder/discovery/registry.ts");
  const { registryCoreEntries } = await import(
    "../catalogue/builder/registry-core.ts"
  );
  assertEquals(
    builderDiscoveryRecords.map(({ payload }) => payload?.core),
    [...registryCoreEntries],
  );
  assertEquals(
    new Set(builderDiscoveryRecords.map(({ slug }) => slug)),
    new Set(registryCoreEntries.map(({ registry }) => registry.meta.slug)),
  );

  const results = discoverBuilderComponents("button", undefined);
  assert(results.length > 0);
  assert(
    results.some(({ record }) => record.slug === "button"),
    "universal search did not expose Button through the discovery adapter",
  );
  for (const record of builderDiscoveryRecords) {
    const presentation = discoveryImagePresentation(record, "light");
    if (record.payload?.images.light === undefined) {
      assertEquals(presentation, undefined);
    } else {
      assert(presentation !== undefined);
    }
  }
});
