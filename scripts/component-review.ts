import { fromFileUrl } from "@std/path";
import type { RegistryEntry } from "../catalogue/generated/registry.ts";
import {
  planComponentReviewMatrix,
  serializeComponentReviewManifest,
} from "../catalogue/review/matrix.ts";
import type { ComponentReviewSource } from "../catalogue/review/matrix.ts";
import { buildDesignSystem } from "./build.ts";

const OUTPUT_URL = new URL(
  "../dist/conformance/component-review/manifest.json",
  import.meta.url,
);

export interface ComponentReviewManifestEvidence {
  readonly components: number;
  readonly postures: number;
  readonly checkpoints: number;
  readonly matrixItems: number;
  readonly manifestBytes: number;
  readonly outputFiles: number;
}

/** Project the generated registry without copying any per-Component review facts. */
export function componentReviewSources(
  registry: readonly RegistryEntry[],
): readonly ComponentReviewSource[] {
  return registry.map((entry) => ({
    group: entry.meta.group,
    slug: entry.meta.slug,
    examples: entry.webExamples.map(({ id }) => id),
    postures: entry.reviewPostures,
  }));
}

/** Write the portable, timestamp-free full matrix under ephemeral conformance output. */
export async function writeComponentReviewManifest(
  outputUrl: URL = OUTPUT_URL,
): Promise<ComponentReviewManifestEvidence> {
  const { registry } = await import("../catalogue/generated/registry.ts");
  const sources = componentReviewSources(registry);
  const matrix = planComponentReviewMatrix(sources);
  const manifest = serializeComponentReviewManifest(matrix);
  await Deno.mkdir(new URL("./", outputUrl), { recursive: true });
  await Deno.writeTextFile(outputUrl, manifest);
  return {
    components: sources.length,
    postures: sources.reduce((sum, source) => sum + source.postures.length, 0),
    checkpoints: sources.reduce(
      (sum, source) =>
        sum + source.postures.reduce(
          (postureSum, posture) => postureSum + posture.checkpoints.length,
          0,
        ),
      0,
    ),
    matrixItems: matrix.length,
    manifestBytes: new TextEncoder().encode(manifest).byteLength,
    outputFiles: 1,
  };
}

if (import.meta.main) {
  const started = performance.now();
  await buildDesignSystem();
  const evidence = await writeComponentReviewManifest();
  console.log(
    `Component review manifest: ${evidence.components} Components, ` +
      `${evidence.postures} postures, ${evidence.checkpoints} checkpoints, ` +
      `${evidence.matrixItems} bounded items, ${evidence.manifestBytes} bytes ` +
      `at ${fromFileUrl(OUTPUT_URL)} in ${
        Math.round(performance.now() - started)
      }ms.`,
  );
}
