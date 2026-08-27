import { assert } from "@std/assert";
import type { RegistryEntry } from "../../catalogue/generated/registry.ts";
import { buildDesignSystem } from "../../scripts/build.ts";

interface GeneratedCatalogue {
  readonly packageVersion: string;
  readonly registry: readonly RegistryEntry[];
}

let generatedCatalogue: Promise<GeneratedCatalogue> | undefined;

export function catalogue(): Promise<GeneratedCatalogue> {
  generatedCatalogue ??= (async () => {
    await buildDesignSystem();
    return await import(
      new URL(
        "../../catalogue/generated/registry.ts?catalogue-test-support",
        import.meta.url,
      ).href
    ) as GeneratedCatalogue;
  })();
  return generatedCatalogue;
}

export function catalogueEntry(
  registry: readonly RegistryEntry[],
  slug: string,
): RegistryEntry {
  const found = registry.find(({ meta }) => meta.slug === slug);
  assert(found !== undefined, `missing Catalogue entry ${slug}`);
  return found;
}
