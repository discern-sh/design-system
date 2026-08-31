import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { encodeHex } from "@std/encoding/hex";
import { join, toFileUrl } from "@std/path";
import { Buffer } from "node:buffer";
import { cliComponentRegistry } from "../src/generated/cli-registry.ts";
import type { ResolvedComponentExampleDefinition } from "../src/types/component-examples.ts";
import {
  componentExampleImage,
  componentExampleImageManifest,
  componentExampleImagePresentation,
  missingComponentExampleImage,
  representativeComponentExampleImage,
  requireComponentExampleImage,
} from "../catalogue/example-images.ts";
import {
  componentExampleCaptureContract,
  type ComponentExampleImageManifest,
  type ComponentExampleImageSource,
  orphanedComponentExampleImageFiles,
  planComponentExampleImages,
  representativeComponentExampleId,
  validateComponentExampleCaptureDirective,
} from "../catalogue/example-images/contract.ts";
import { componentExampleRegistry } from "../scripts/generated/component-examples.ts";
import {
  componentExampleCaptureSourceHash,
  componentExampleContentHash,
  componentExampleScreenshotOptions,
  isComponentExampleCaptureSourcePath,
  pngChunkTypes,
  pngDimensions,
  repositoryCaptureSourcePaths,
  validateComponentExampleImageCoverage,
  validateComponentExampleRepeatGeometry,
  withIsolatedCapturePage,
} from "../scripts/component-example-images.ts";
import {
  type CanonicalPngRaster,
  compareCanonicalPngRasters,
  componentExampleRasterTolerance,
  decodeCanonicalPngRaster,
  rasterDifferenceIsImperceptible,
} from "../scripts/png-raster.ts";

const ROOT = new URL("../", import.meta.url);

function imageSources(): readonly ComponentExampleImageSource[] {
  return Object.entries(componentExampleRegistry).map(([slug, examples]) => ({
    slug,
    examples,
  }));
}

async function sha256(bytes: Uint8Array): Promise<`sha256:${string}`> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer);
  return `sha256:${encodeHex(digest)}`;
}

function includesBytes(bytes: Uint8Array, needle: string): boolean {
  const encoded = new TextEncoder().encode(needle);
  return bytes.some((_, start) =>
    start + encoded.length <= bytes.length &&
    encoded.every((value, offset) => bytes[start + offset] === value)
  );
}

Deno.test("raster staleness excludes consumer-only image presentation", () => {
  assertEquals(
    isComponentExampleCaptureSourcePath(
      "catalogue/example-images/review.ts",
    ),
    false,
  );
  assertEquals(
    isComponentExampleCaptureSourcePath(
      "catalogue/example-images/missing.svg",
    ),
    false,
  );
  assert(
    isComponentExampleCaptureSourcePath(
      "catalogue/example-images/future-capture-helper.ts",
    ),
  );
});

Deno.test("capture inputs exclude ignored worktree artifacts without losing authored drafts", async () => {
  const fixture = await Deno.makeTempDir({ prefix: "discern-image-inputs-" });
  try {
    const runGit = async (args: readonly string[]): Promise<void> => {
      const result = await new Deno.Command("git", {
        args: [...args],
        cwd: fixture,
        stdout: "null",
        stderr: "piped",
      }).output();
      if (!result.success) {
        throw new Error(new TextDecoder().decode(result.stderr));
      }
    };
    await runGit(["init", "--quiet"]);
    await Deno.mkdir(join(fixture, "capture", "cache-zone"), {
      recursive: true,
    });
    await Deno.writeTextFile(
      join(fixture, ".gitignore"),
      "capture/cache-zone/\n",
    );
    await Deno.writeTextFile(
      join(fixture, "capture", "tracked.css"),
      ".tracked {}\n",
    );
    await Deno.writeTextFile(
      join(fixture, "capture", "authored-draft.css"),
      ".draft {}\n",
    );
    await Deno.writeTextFile(
      join(fixture, "capture", "cache-zone", "future-local-noise.bin"),
      "machine-only",
    );
    await runGit(["add", ".gitignore", "capture/tracked.css"]);

    assertEquals(
      await repositoryCaptureSourcePaths(
        toFileUrl(fixture + "/"),
        ["capture/"],
      ),
      ["capture/authored-draft.css", "capture/tracked.css"],
    );
  } finally {
    await Deno.remove(fixture, { recursive: true });
  }
});

Deno.test("canonical Web examples auto-enrol both image themes and no CLI-only fiction", () => {
  const sources = imageSources();
  const plan = planComponentExampleImages(sources);
  const keys = new Set(
    plan.map(({ slug, exampleId, theme }) => `${slug}/${exampleId}/${theme}`),
  );
  assertEquals(keys.size, plan.length);
  for (const { slug, examples } of sources) {
    for (const example of examples) {
      const entries = plan.filter((entry) =>
        entry.slug === slug && entry.exampleId === example.id
      );
      assertEquals(
        entries.map(({ theme }) => theme),
        example.surfaces.includes("web") ? ["light", "dark"] : [],
        `${slug}/${example.id}`,
      );
    }
    const representative = representativeComponentExampleId(examples);
    const web = examples.filter(({ surfaces }) => surfaces.includes("web"));
    assertEquals(
      representative,
      web.find(({ id }) => id === "default")?.id ?? web[0]?.id,
      slug,
    );
  }
  for (const [slug, stance] of Object.entries(cliComponentRegistry)) {
    if (stance.stance !== "exempt") continue;
    const registry = componentExampleRegistry as Readonly<
      Record<string, readonly ResolvedComponentExampleDefinition[]>
    >;
    const webExamples = registry[slug]?.filter(({ surfaces }) =>
      surfaces.includes("web")
    ) ?? [];
    assert(webExamples.length > 0, `${slug} has no Web examples`);
    assertEquals(
      plan.filter((entry) => entry.slug === slug).length,
      webExamples.length * 2,
      `${slug} must retain theme-complete Web imagery`,
    );
  }
});

Deno.test("a synthetic future example joins plan, coverage, representative choice, and cleanup", () => {
  const futureExamples = [
    {
      id: "overview",
      label: "Overview",
      surfaces: ["web", "cli"],
    },
    {
      id: "terminal-detail",
      label: "Terminal detail",
      surfaces: ["cli"],
      reason: "Browser HTML cannot represent this terminal control sequence.",
    },
  ] satisfies readonly ResolvedComponentExampleDefinition[];
  const plan = planComponentExampleImages([{
    slug: "future-panel",
    examples: futureExamples,
  }]);
  assertEquals(
    plan.map(({ filename }) => filename),
    [
      "future-panel--overview--light.png",
      "future-panel--overview--dark.png",
    ],
  );
  assertEquals(representativeComponentExampleId(futureExamples), "overview");
  const manifest: ComponentExampleImageManifest = {
    captureContractVersion: componentExampleCaptureContract.version,
    sourceHash: "sha256:fixture",
    entries: plan.map((entry) => ({
      slug: entry.slug,
      componentName: "Future panel",
      exampleId: entry.exampleId,
      label: entry.label,
      theme: entry.theme,
      assetPath: `catalogue/generated/example-images/${entry.filename}`,
      assetUrl: `/catalogue/generated/example-images/${entry.filename}`,
      width: 10,
      height: 10,
      contentHash: "sha256:fixture",
      captureContractVersion: componentExampleCaptureContract.version,
    })),
  };
  validateComponentExampleImageCoverage(plan, manifest);
  assertThrows(
    () =>
      validateComponentExampleImageCoverage(plan, {
        ...manifest,
        entries: manifest.entries.slice(0, 1),
      }),
    Error,
    "does not cover",
  );
  assertEquals(
    orphanedComponentExampleImageFiles(plan, [
      ...plan.map(({ filename }) => filename),
      "future-panel--renamed--light.png",
      "removed-panel--default--dark.png",
    ]),
    [
      "future-panel--renamed--light.png",
      "removed-panel--default--dark.png",
    ],
  );
});

Deno.test("exceptional capture regions fail closed before browser automation", () => {
  validateComponentExampleCaptureDirective(
    {
      prepare: [{ action: "focus", selector: "button" }],
      selectors: [".floating-root", ".floating-panel"],
    },
    "future-panel/overview",
  );
  assertThrows(
    () =>
      validateComponentExampleCaptureDirective(
        { selectors: [] },
        "future-panel/overview",
      ),
    TypeError,
    "at least one",
  );
  assertThrows(
    () =>
      validateComponentExampleCaptureDirective(
        { prepare: [{ action: "click", selector: " " }], selectors: ["x"] },
        "future-panel/overview",
      ),
    TypeError,
    "must name a selector",
  );
});

Deno.test("exact-bounds screenshots retain document-space clips taller than the viewport", () => {
  const region = { x: 160, y: 160, width: 960, height: 1047 };
  const options = componentExampleScreenshotOptions(region);
  assertEquals(options.clip, region);
  assertEquals(options.fullPage, true);
});

Deno.test("repeat witnesses ignore raster-byte noise only while exact geometry holds", () => {
  validateComponentExampleRepeatGeometry(
    "future-panel/overview/dark",
    { width: 320, height: 180 },
    { width: 320, height: 180 },
    { width: 320, height: 180 },
  );
  assertThrows(
    () =>
      validateComponentExampleRepeatGeometry(
        "future-panel/overview/dark",
        { width: 320, height: 180 },
        { width: 321, height: 180 },
        { width: 320, height: 180 },
      ),
    Error,
    "geometry changed",
  );
});

Deno.test("image hashes cover only a Playwright Buffer view, not its pooled backing bytes", async () => {
  const backing = Buffer.from([17, 34, 51, 68]);
  const view = backing.subarray(1, 3);
  assertEquals(
    await componentExampleContentHash(view),
    await sha256(Uint8Array.of(34, 51)),
  );
});

Deno.test("every capture document closes after success or failure", async () => {
  let created = 0;
  let closed = 0;
  const factory = {
    newPage() {
      created += 1;
      return Promise.resolve({
        close() {
          closed += 1;
          return Promise.resolve();
        },
      });
    },
  };
  assertEquals(
    await withIsolatedCapturePage(factory, () => Promise.resolve("ready")),
    "ready",
  );
  await assertRejects(
    () =>
      withIsolatedCapturePage(
        factory,
        () => Promise.reject(new Error("capture failed")),
      ),
    Error,
    "capture failed",
  );
  assertEquals({ created, closed }, { created: 2, closed: 2 });
});

Deno.test("the generated manifest and exact-bounds PNG population match every current input", async () => {
  const plan = planComponentExampleImages(imageSources());
  validateComponentExampleImageCoverage(plan, componentExampleImageManifest);
  assertEquals(
    componentExampleImageManifest.sourceHash,
    await componentExampleCaptureSourceHash(),
  );
  const machineNeedles = [
    "/Users/",
    "/home/",
    "discern-design-system.worktrees",
    "127.0.0.1",
    "localhost",
  ];
  const serialized = JSON.stringify(componentExampleImageManifest);
  for (const needle of machineNeedles) {
    assert(!serialized.includes(needle), `manifest contains ${needle}`);
  }
  for (const entry of componentExampleImageManifest.entries) {
    const bytes = await Deno.readFile(new URL(entry.assetUrl.slice(1), ROOT));
    assertEquals(pngDimensions(bytes), {
      width: entry.width,
      height: entry.height,
    });
    assert(
      pngChunkTypes(bytes).every((chunk) =>
        ["IHDR", "sRGB", "IDAT", "IEND"].includes(chunk)
      ),
      `${entry.assetPath} contains non-canonical PNG metadata`,
    );
    assertEquals(await sha256(bytes), entry.contentHash, entry.assetPath);
    for (const needle of machineNeedles) {
      assert(
        !includesBytes(bytes, needle),
        `${entry.assetPath} contains ${needle}`,
      );
    }
    const resolved = componentExampleImage(
      entry.slug,
      entry.exampleId,
      entry.theme,
    );
    assertEquals(resolved, entry);
    const presentation = componentExampleImagePresentation(entry);
    assertEquals(presentation.width, entry.width);
    assertEquals(presentation.height, entry.height);
    assertStringIncludes(presentation.alt, entry.componentName);
    assertStringIncludes(presentation.alt, entry.label);
  }
});

Deno.test("representative image resolution derives from manifest order and fails missing production entries", () => {
  for (const [slug, examples] of Object.entries(componentExampleRegistry)) {
    const representativeId = representativeComponentExampleId(examples);
    if (representativeId === undefined) continue;
    for (const theme of ["light", "dark"] as const) {
      const image = representativeComponentExampleImage(slug, theme);
      assertEquals(image?.exampleId, representativeId, `${slug}/${theme}`);
      assertEquals(
        requireComponentExampleImage(slug, representativeId, theme),
        image,
      );
    }
  }
  assertThrows(
    () => requireComponentExampleImage("missing", "default", "light"),
    TypeError,
    "run deno task catalogue:images --update",
  );
  assertEquals(missingComponentExampleImage.kind, "missing");
});

Deno.test("Catalogue-only generated images cannot enter the JSR publish set", async () => {
  const denoJson: unknown = JSON.parse(
    await Deno.readTextFile(new URL("../deno.json", import.meta.url)),
  );
  assert(denoJson !== null && typeof denoJson === "object");
  const publish = "publish" in denoJson && denoJson.publish !== null &&
      typeof denoJson.publish === "object"
    ? denoJson.publish as { readonly include?: readonly string[] }
    : {};
  assertEquals(
    publish.include?.some((path) => path.startsWith("catalogue")),
    false,
  );
  assertEquals(
    componentExampleImageManifest.entries.every((entry) =>
      entry.assetPath.startsWith("catalogue/generated/example-images/")
    ),
    true,
  );
});

function committedImageUrl(index: number): URL {
  const entry = componentExampleImageManifest.entries[index];
  assert(entry !== undefined, `no manifest entry at ${index}`);
  return new URL(entry.assetUrl.slice(1), ROOT);
}

/** Move one channel by `delta` without wrapping past the 8-bit range. */
function perturb(
  raster: CanonicalPngRaster,
  pixels: number,
  delta: number,
): CanonicalPngRaster {
  const copy = new Uint8Array(raster.pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 3;
    const current = copy[offset] ?? 0;
    copy[offset] = current > 127 ? current - delta : current + delta;
  }
  return { width: raster.width, height: raster.height, pixels: copy };
}

Deno.test("the raster decoder reads the committed capture output", async () => {
  const total = componentExampleImageManifest.entries.length;
  const sampled = [
    0,
    Math.floor(total / 3),
    Math.floor((total * 2) / 3),
    total - 1,
  ];
  for (const index of sampled) {
    const entry = componentExampleImageManifest.entries[index];
    assert(entry !== undefined);
    const raster = await decodeCanonicalPngRaster(
      await Deno.readFile(committedImageUrl(index)),
      entry.assetPath,
    );
    assertEquals(
      { width: raster.width, height: raster.height },
      { width: entry.width, height: entry.height },
      entry.assetPath,
    );
    assertEquals(raster.pixels.length, entry.width * entry.height * 3);
  }
});

Deno.test("the declared raster tolerance stays at its evidenced bounds", () => {
  // Observed noise reaches 38 changed pixels at delta 2; the smallest real
  // change measured 105 changed pixels at delta 71. Loosening either bound
  // past that evidence would start absorbing real visual changes.
  assertEquals(componentExampleRasterTolerance, {
    maxChannelDelta: 2,
    maxChangedPixels: 64,
  });
});

Deno.test("raster comparison separates imperceptible variation from a real change", async () => {
  const entry = componentExampleImageManifest.entries[0];
  assert(entry !== undefined);
  const committed = await decodeCanonicalPngRaster(
    await Deno.readFile(committedImageUrl(0)),
    entry.assetPath,
  );
  const { maxChangedPixels, maxChannelDelta } = componentExampleRasterTolerance;

  const same = compareCanonicalPngRasters(committed, committed);
  assertEquals(same, { kind: "identical" });
  assert(rasterDifferenceIsImperceptible(same));

  const noise = compareCanonicalPngRasters(
    committed,
    perturb(committed, maxChangedPixels, maxChannelDelta),
  );
  assertEquals(noise, {
    kind: "differs",
    changedPixels: maxChangedPixels,
    maxChannelDelta,
  });
  assert(
    rasterDifferenceIsImperceptible(noise),
    "variation at both bounds must keep the committed artifact",
  );

  const tooManyPixels = compareCanonicalPngRasters(
    committed,
    perturb(committed, maxChangedPixels + 1, 1),
  );
  assertEquals(tooManyPixels, {
    kind: "differs",
    changedPixels: maxChangedPixels + 1,
    maxChannelDelta: 1,
  });
  assert(
    !rasterDifferenceIsImperceptible(tooManyPixels),
    "a change wider than the pixel bound must be written",
  );

  const tooDeep = compareCanonicalPngRasters(
    committed,
    perturb(committed, 1, maxChannelDelta + 1),
  );
  assertEquals(tooDeep, {
    kind: "differs",
    changedPixels: 1,
    maxChannelDelta: maxChannelDelta + 1,
  });
  assert(
    !rasterDifferenceIsImperceptible(tooDeep),
    "a change deeper than the channel bound must be written",
  );

  const resized = compareCanonicalPngRasters(committed, {
    width: committed.width,
    height: committed.height - 1,
    pixels: committed.pixels.subarray(0, committed.width * 3),
  });
  assertEquals(resized, { kind: "geometry" });
  assert(
    !rasterDifferenceIsImperceptible(resized),
    "a resized example is always a real change",
  );
});

Deno.test("the raster decoder refuses images outside the canonical capture shape", async () => {
  const original = await Deno.readFile(committedImageUrl(0));
  const rejected = [
    ["bit depth", 24, 16],
    ["colour type", 25, 6],
    ["interlace", 28, 1],
  ] as const;
  for (const [label, offset, value] of rejected) {
    const patched = new Uint8Array(original);
    patched[offset] = value;
    await assertRejects(
      () => decodeCanonicalPngRaster(patched, label),
      TypeError,
      "8-bit non-interlaced RGB",
    );
  }
  await assertRejects(
    () => decodeCanonicalPngRaster(original.subarray(0, 12), "truncated"),
    TypeError,
  );
  await assertRejects(
    () => decodeCanonicalPngRaster(new Uint8Array(40), "not a png"),
    TypeError,
    "is not a PNG",
  );
});
