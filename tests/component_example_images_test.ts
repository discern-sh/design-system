import {
  assert,
  assertEquals,
  assertNotEquals,
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
  componentExampleCaptureDocumentHeight,
  componentExampleCapturePaintInsets,
  componentExampleCapturePositionedBoxContained,
  componentExampleCapturePositionedPaintContainedOrClipped,
  componentExampleCaptureRegion,
  componentExampleCaptureSubjectRegions,
  type ComponentExampleImageManifest,
  type ComponentExampleImageSource,
  orphanedComponentExampleImageFiles,
  planComponentExampleImages,
  representativeComponentExampleId,
  validateComponentExampleCaptureDirective,
  validateComponentExampleCaptureFitsViewport,
  validateRepresentativeComponentExampleFraming,
} from "../catalogue/example-images/contract.ts";
import { componentExampleRegistry } from "../scripts/generated/component-examples.ts";
import {
  componentExampleCaptureDependencyPaths,
  componentExampleCaptureInputHash,
  componentExampleCaptureSourceHash,
  componentExampleContentHash,
  componentExampleImagePostureEffects,
  componentExampleImagesNeedingCapture,
  componentExampleScreenshotOptions,
  pngChunkTypes,
  pngDimensions,
  repositoryCaptureSourcePaths,
  validateComponentExampleImageCoverage,
  withCapturePage,
} from "../scripts/component-example-images.ts";

const ROOT = new URL("../", import.meta.url);

Deno.test("capture dependency discovery follows imports and excludes unrelated source containers", () => {
  const root = "file:///workspace/catalogue/example-images/capture.tsx";
  const webRegistry =
    "file:///workspace/catalogue/generated/example-image-registry.ts";
  const example =
    "file:///workspace/src/components/display/sample/sample.examples.tsx";
  const implementation =
    "file:///workspace/src/components/display/sample/sample.tsx";
  const privateSibling = "file:///workspace/src/glyphs/private-atlas.ts";
  const paths = componentExampleCaptureDependencyPaths(
    {
      root,
      modules: [
        {
          specifier: root,
          local: "/workspace/catalogue/example-images/capture.tsx",
          dependencies: [{ code: { specifier: webRegistry } }],
        },
        {
          specifier: webRegistry,
          local: "/workspace/catalogue/generated/example-image-registry.ts",
          dependencies: [{ code: { specifier: example } }],
        },
        {
          specifier: example,
          local: "/workspace/src/components/display/sample/sample.examples.tsx",
          dependencies: [{ code: { specifier: implementation } }],
        },
        {
          specifier: implementation,
          local: "/workspace/src/components/display/sample/sample.tsx",
          dependencies: [],
        },
        {
          specifier: privateSibling,
          local: "/workspace/src/glyphs/private-atlas.ts",
          dependencies: [],
        },
      ],
    },
    [example],
    new URL("file:///workspace/"),
  );
  assertEquals(paths, [
    "src/components/display/sample/sample.examples.tsx",
    "src/components/display/sample/sample.tsx",
  ]);
});

Deno.test("image verification is source-and-artifact based without a live browser", () => {
  assertEquals(componentExampleImagePostureEffects("verify"), {
    build: true,
    browser: "never",
    writes: false,
  });
  assertEquals(componentExampleImagePostureEffects("update"), {
    build: true,
    browser: "when-stale",
    writes: true,
  });
});

Deno.test("source-current entries bypass Chromium while stale entries enroll", () => {
  const plan = planComponentExampleImages([{
    slug: "future-panel",
    examples: [{
      id: "overview",
      label: "Overview",
      surfaces: ["web"],
    }],
  }]);
  const keys = new Set(
    plan.map(({ slug, exampleId, theme }) => `${slug}/${exampleId}/${theme}`),
  );
  assertEquals(componentExampleImagesNeedingCapture(plan, keys), []);
  keys.delete("future-panel/overview/dark");
  assertEquals(
    componentExampleImagesNeedingCapture(plan, keys).map(({ theme }) => theme),
    ["dark"],
  );
});

Deno.test("the generated image renderer registry excludes CLI implementations", async () => {
  const source = await Deno.readTextFile(
    new URL(
      "../catalogue/generated/example-image-registry.ts",
      import.meta.url,
    ),
  );
  assert(!source.includes(".cli.ts"));
  assert(!source.includes("cliExamples"));
});

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

Deno.test("capture source hashing excludes release identity but retains executable configuration", async () => {
  const source = [{
    path: "src/example.tsx",
    contents: new TextEncoder().encode("export const example = true;\n"),
  }];
  const deno = {
    name: "@discern-sh/design-system",
    version: "0.28.0",
    compilerOptions: { jsx: "react-jsx", jsxImportSource: "react" },
    imports: { react: "npm:react@18.3.1" },
  };
  const packageJson = {
    name: "discern-design-system",
    version: "0.28.0",
    type: "module",
    devDependencies: { "playwright-core": "1.61.1" },
  };
  const baseline = await componentExampleCaptureInputHash(
    source,
    deno,
    packageJson,
  );

  assertEquals(
    await componentExampleCaptureInputHash(source, {
      ...deno,
      version: "0.29.0",
      tasks: { unrelated: "deno eval true" },
    }, {
      ...packageJson,
      version: "0.29.0",
      private: false,
    }),
    baseline,
  );
  assertNotEquals(
    await componentExampleCaptureInputHash(source, {
      ...deno,
      compilerOptions: { ...deno.compilerOptions, jsxImportSource: "preact" },
    }, packageJson),
    baseline,
  );
  assertNotEquals(
    await componentExampleCaptureInputHash(source, deno, {
      ...packageJson,
      devDependencies: { "playwright-core": "1.62.0" },
    }),
    baseline,
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
      pixelWidth: 20,
      pixelHeight: 20,
      density: 2,
      contentHash: "sha256:fixture",
      sourceHash: "sha256:fixture",
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
  assertThrows(
    () =>
      validateComponentExampleCaptureDirective(
        {
          selectors: [".future-layout"],
          framing: { mode: "allocation", reason: " " },
        },
        "future-panel/overview",
      ),
    TypeError,
    "reason",
  );
  assertThrows(
    () =>
      validateComponentExampleCaptureDirective(
        {
          selectors: [".future-layout"],
          paintBleed: { bottom: -1 },
        },
        "future-panel/overview",
      ),
    TypeError,
    "paint bleed",
  );
});

Deno.test("paint-safe capture geometry includes computed effects without blanket padding", () => {
  const hardOffset = componentExampleCapturePaintInsets({
    boxShadow: "rgb(0 0 0 / 0.4) 2px 2px 0px 0px",
    textShadow: "none",
    outlineStyle: "none",
    outlineWidth: "0px",
    outlineOffset: "0px",
    filter: "none",
  });
  assertEquals(hardOffset, { top: 0, right: 2, bottom: 2, left: 0 });
  assertEquals(
    componentExampleCapturePaintInsets(
      {
        boxShadow: "rgb(0 0 0 / 0.4) 10px 10px 0px 0px",
        textShadow: "none",
        outlineStyle: "none",
        outlineWidth: "0px",
        outlineOffset: "0px",
        filter: "none",
      },
      1,
    ),
    { top: 1, right: 10, bottom: 10, left: 1 },
    "authored bleed cannot hide a larger effect the strict grammar proves",
  );

  const layered = componentExampleCapturePaintInsets({
    boxShadow:
      "rgb(0 0 0 / 0.2) -3px 4px 2px 1px, inset rgb(0 0 0 / 0.1) 0px 1px 0px 0px",
    textShadow: "none",
    outlineStyle: "solid",
    outlineWidth: "2px",
    outlineOffset: "4px",
    filter: "none",
  });
  assertEquals(layered, { top: 6, right: 6, bottom: 8, left: 7 });

  assertEquals(
    componentExampleCaptureRegion([
      {
        bounds: { left: 10.2, top: 20.8, right: 110.2, bottom: 60.8 },
        paint: hardOffset,
      },
      {
        bounds: { left: 126.2, top: 20.8, right: 226.2, bottom: 60.8 },
        paint: hardOffset,
      },
    ]),
    { x: 10, y: 20, width: 219, height: 43 },
  );

  assertThrows(
    () =>
      componentExampleCapturePaintInsets({
        boxShadow: "rgb(0 0 0 / 0.4) 2px 2px var(--unknown)",
        textShadow: "none",
        outlineStyle: "none",
        outlineWidth: "0px",
        outlineOffset: "0px",
        filter: "none",
      }),
    TypeError,
    "paintBleed",
  );
  assertThrows(
    () =>
      componentExampleCapturePaintInsets({
        boxShadow: "none",
        textShadow: "none",
        outlineStyle: "none",
        outlineWidth: "0px",
        outlineOffset: "0px",
        filter: "blur(2px)",
      }),
    TypeError,
    "paintBleed",
  );

  assertEquals(
    componentExampleCapturePositionedBoxContained(
      {
        top: "0px",
        right: "0px",
        bottom: "auto",
        left: "0px",
        width: "auto",
        height: "3px",
        transform: "none",
      },
      { width: 320, height: 180 },
    ),
    true,
  );
  assertEquals(
    componentExampleCapturePositionedBoxContained(
      {
        top: "-12px",
        right: "auto",
        bottom: "auto",
        left: "-8px",
        width: "24px",
        height: "24px",
        transform: "none",
      },
      { width: 320, height: 180 },
    ),
    false,
    "negative positioned pseudo paint requires an explicit bleed declaration",
  );
  assertEquals(
    componentExampleCapturePositionedBoxContained(
      {
        top: "0px",
        right: "auto",
        bottom: "auto",
        left: "0px",
        width: "24px",
        height: "24px",
        transform: "matrix(1, 0, 0, 1, 4, 0)",
      },
      { width: 320, height: 180 },
    ),
    false,
    "transformed pseudo paint cannot be proven from allocation geometry",
  );
  const clippedDecoration = {
    top: "auto",
    right: "-64px",
    bottom: "-112px",
    left: "auto",
    width: "288px",
    height: "288px",
    transform: "none",
  };
  assertEquals(
    componentExampleCapturePositionedPaintContainedOrClipped(
      clippedDecoration,
      { width: 800, height: 500 },
      { x: "hidden", y: "hidden" },
    ),
    true,
    "self-clipped pseudo paint cannot escape the selected allocation",
  );
  assertEquals(
    componentExampleCapturePositionedPaintContainedOrClipped(
      clippedDecoration,
      { width: 800, height: 500 },
      { x: "visible", y: "hidden" },
    ),
    false,
    "every escaping axis must either fit or be clipped",
  );
});

Deno.test("representative framing rejects sparse allocation at the versioned boundary", () => {
  const allocation = { x: 0, y: 0, width: 960, height: 40 };
  const boundaryWidth = allocation.width *
    componentExampleCaptureContract.framing.minimumSubjectAreaRatio;

  validateRepresentativeComponentExampleFraming(
    "future-layout/default/light",
    allocation,
    { x: 0, y: 0, width: boundaryWidth, height: allocation.height },
  );
  assertThrows(
    () =>
      validateRepresentativeComponentExampleFraming(
        "future-layout/default/light",
        allocation,
        {
          x: 0,
          y: 0,
          width: boundaryWidth - 1,
          height: allocation.height,
        },
      ),
    Error,
    "pathologically sparse",
  );
  validateRepresentativeComponentExampleFraming(
    "future-layout/default/light",
    allocation,
    { x: 0, y: 0, width: 1, height: 1 },
    {
      mode: "allocation",
      reason: "The empty measure demonstrates intentional end alignment.",
    },
  );

  const explicitAllocation = {
    selectors: [".future-layout"],
    framing: {
      mode: "allocation" as const,
      reason: "The empty measure is the layout evidence.",
    },
  };
  validateComponentExampleCaptureDirective(
    explicitAllocation,
    "future-layout/default",
  );
  assertThrows(
    () =>
      validateRepresentativeComponentExampleFraming(
        "future-layout/explicit-without-intent/light",
        allocation,
        { x: 0, y: 0, width: 1, height: 1 },
      ),
    Error,
    "pathologically sparse",
  );
  validateRepresentativeComponentExampleFraming(
    "future-layout/explicit-with-intent/light",
    allocation,
    { x: 0, y: 0, width: 1, height: 1 },
    explicitAllocation.framing,
  );

  const subjects = componentExampleCaptureSubjectRegions([{
    region: allocation,
    paintsOwnBox: false,
    children: [{
      region: allocation,
      paintsOwnBox: false,
      children: [{
        region: { x: 0, y: 0, width: 240, height: 40 },
        paintsOwnBox: true,
        children: [],
      }],
    }],
  }]);
  assertEquals(subjects, [{ x: 0, y: 0, width: 240, height: 40 }]);
  assertThrows(
    () =>
      validateRepresentativeComponentExampleFraming(
        "future-layout/transparent-wrapper/light",
        allocation,
        componentExampleCaptureRegion(subjects.map((region) => ({
          bounds: {
            left: region.x,
            top: region.y,
            right: region.x + region.width,
            bottom: region.y + region.height,
          },
          paint: { top: 0, right: 0, bottom: 0, left: 0 },
        }))),
      ),
    Error,
    "pathologically sparse",
  );
});

Deno.test("exact-bounds screenshots retain document-space clips taller than the viewport", () => {
  const { harness } = componentExampleCaptureContract;
  const region = {
    x: harness.inset,
    y: harness.inset,
    width: harness.width,
    height: 1047,
  };
  const options = componentExampleScreenshotOptions(region);
  assertEquals(options.clip, region);
  assertEquals(options.fullPage, true);
  assertEquals(options.omitBackground, true);
  assertEquals(options.scale, "device");
});

Deno.test("image hashes cover only a Playwright Buffer view, not its pooled backing bytes", async () => {
  const backing = Buffer.from([17, 34, 51, 68]);
  const view = backing.subarray(1, 3);
  assertEquals(
    await componentExampleContentHash(view),
    await sha256(Uint8Array.of(34, 51)),
  );
});

Deno.test("one capture document serves the run and closes either way", async () => {
  let created = 0;
  let closed = 0;
  const open = () => {
    created += 1;
    return Promise.resolve({
      close() {
        closed += 1;
        return Promise.resolve();
      },
    });
  };
  assertEquals(
    await withCapturePage(open, () => Promise.resolve("ready")),
    "ready",
  );
  await assertRejects(
    () => withCapturePage(open, () => Promise.reject(new Error("failed"))),
    Error,
    "failed",
  );
  assertEquals({ created, closed }, { created: 2, closed: 2 });
});

Deno.test("captures must fit the viewport that keeps rasterization stable", () => {
  const { viewport } = componentExampleCaptureContract;
  validateComponentExampleCaptureFitsViewport("future-panel/overview/light", {
    width: viewport.width,
    height: viewport.height,
  });
  assertThrows(
    () =>
      validateComponentExampleCaptureFitsViewport(
        "future-panel/overview/light",
        { width: viewport.width, height: viewport.height + 1 },
      ),
    Error,
    "past the",
  );
  assertThrows(
    () =>
      validateComponentExampleCaptureFitsViewport(
        "future-panel/overview/light",
        { width: viewport.width + 1, height: viewport.height },
      ),
    Error,
    "past the",
  );
});

Deno.test("the capture viewport clears every committed image without a browser", () => {
  const { harness, viewport } = componentExampleCaptureContract;
  const tallest = componentExampleImageManifest.entries.reduce((tall, entry) =>
    entry.height > tall.height ? entry : tall
  );
  assertEquals(
    componentExampleCaptureDocumentHeight(0),
    viewport.height,
    "a short example still renders one viewport of document",
  );
  assertEquals(
    componentExampleCaptureDocumentHeight(viewport.height),
    2 * harness.inset + viewport.height,
  );
  assert(
    componentExampleCaptureDocumentHeight(tallest.height) <= viewport.height,
    `${tallest.assetPath} implies a ${
      componentExampleCaptureDocumentHeight(tallest.height)
    }px document, past the ${viewport.height}px capture viewport. Raising the viewport keeps captures off Chromium's beyond-viewport screenshot path, which permanently changes how a page rasterizes text.`,
  );
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
    assertEquals(entry.density, 2, entry.assetPath);
    assert(entry.pixelWidth !== undefined, entry.assetPath);
    assert(entry.pixelHeight !== undefined, entry.assetPath);
    assert(entry.density !== undefined, entry.assetPath);
    assert(entry.sourceHash !== undefined, entry.assetPath);
    assertEquals(pngDimensions(bytes), {
      width: entry.pixelWidth,
      height: entry.pixelHeight,
    });
    assertEquals(
      entry.pixelWidth,
      entry.width * entry.density,
      entry.assetPath,
    );
    assertEquals(
      entry.pixelHeight,
      entry.height * entry.density,
      entry.assetPath,
    );
    assert(
      bytes[25] === 2 || bytes[25] === 6,
      `${entry.assetPath} must be an RGB or RGBA PNG`,
    );
    assert(
      entry.sourceHash.startsWith("sha256:"),
      `${entry.assetPath} has no source fingerprint`,
    );
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
  for (
    const assetPath of [
      "catalogue/generated/example-images/avatar--default--dark.png",
      "catalogue/generated/example-images/avatar-group--default--dark.png",
      "catalogue/generated/example-images/persona--default--dark.png",
      "catalogue/generated/example-images/dialog--default--dark.png",
    ]
  ) {
    const bytes = await Deno.readFile(new URL(assetPath, ROOT));
    assertEquals(
      bytes[25],
      6,
      `${assetPath} must preserve transparent corners`,
    );
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
