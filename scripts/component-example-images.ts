import { encodeHex } from "@std/encoding/hex";
import { fromFileUrl } from "@std/path";
import { chromium } from "playwright-core";
import type { Browser, BrowserContext, Page } from "playwright-core";
import { componentExampleImageManifest } from "../catalogue/generated/example-images-manifest.ts";
import {
  componentExampleCaptureContract,
  type ComponentExampleImageManifest,
  type ComponentExampleImageManifestEntry,
  type ComponentExampleImageSource,
  orphanedComponentExampleImageFiles,
  planComponentExampleImages,
  type PlannedComponentExampleImage,
  validateComponentExampleCaptureFitsViewport,
} from "../catalogue/example-images/contract.ts";
import { componentExampleRegistry } from "./generated/component-examples.ts";
import {
  compareCanonicalPngRasters,
  decodeCanonicalPngRaster,
  rasterDifferenceIsImperceptible,
} from "./png-raster.ts";
import { buildDesignSystem } from "./build.ts";
import { generateSources, loadComponentSources } from "./generate.ts";
import catalogueServer from "./serve.ts";

const ROOT = new URL("../", import.meta.url);
const IMAGE_ROOT = new URL(
  "../catalogue/generated/example-images/",
  import.meta.url,
);
const MANIFEST_URL = new URL(
  "../catalogue/generated/example-images-manifest.ts",
  import.meta.url,
);
const encoder = new TextEncoder();

const CAPTURE_INPUTS = [
  "assets/",
  "catalogue/conformance.ts",
  "catalogue/example-images/",
  "catalogue/styles/components.css",
  "deno.json",
  "deno.lock",
  "package.json",
  "scripts/build.ts",
  "scripts/component-example-images.ts",
  "scripts/generate.ts",
  "src/",
] as const;

const NON_CAPTURE_EXAMPLE_IMAGE_INPUTS = new Set([
  "catalogue/example-images/missing.svg",
  "catalogue/example-images/review.ts",
]);

/** Keep consumer-only presentation out of the raster staleness boundary. */
export function isComponentExampleCaptureSourcePath(path: string): boolean {
  return !NON_CAPTURE_EXAMPLE_IMAGE_INPUTS.has(path);
}

interface CapturedImage {
  readonly entry: ComponentExampleImageManifestEntry;
  readonly bytes: Uint8Array;
}

interface CaptureBrowser {
  readonly browser: Browser;
  readonly context: BrowserContext;
}

/** One reusable capture document and the off-origin requests it attempted. */
interface CapturePage {
  readonly page: Page;
  readonly externalRequests: string[];
  close(): Promise<void>;
}

interface CaptureTiming {
  readonly buildMs: number;
  readonly browserMs: number;
  readonly captureMs: number;
  readonly totalMs: number;
}

interface BrowserCaptureState {
  readonly status: "ready" | "error";
  readonly message?: string;
  readonly contractVersion?: string;
  readonly fontsLoaded?: boolean;
  readonly activeAnimations?: number;
  readonly documentWidth?: number;
  readonly documentHeight?: number;
  readonly region?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

/** Keep document-space clips from being silently trimmed to the viewport. */
export function componentExampleScreenshotOptions(
  region: NonNullable<BrowserCaptureState["region"]>,
): NonNullable<Parameters<Page["screenshot"]>[0]> {
  return {
    type: "png",
    fullPage: true,
    clip: region,
    animations: "disabled",
    caret: "hide",
    scale: "device",
  };
}

/**
 * Open the capture pages once and close every one after success or failure.
 *
 * Opening a document costs roughly 700ms against the ~250ms a capture then
 * needs, so each page here is reused across many examples. Reuse is safe only
 * because no capture takes Chromium's beyond-viewport screenshot path, which
 * permanently changes how its page rasterizes text — every capture proves it
 * through `validateComponentExampleCaptureFitsViewport`.
 */
export async function withCapturePages<
  P extends { close(): Promise<void> },
  T,
>(
  open: () => Promise<P>,
  count: number,
  operation: (pages: readonly P[]) => Promise<T>,
): Promise<T> {
  if (!Number.isInteger(count) || count < 1) {
    throw new TypeError(
      `Capture needs at least one page; received ${JSON.stringify(count)}`,
    );
  }
  const pages: P[] = [];
  try {
    for (let index = 0; index < count; index += 1) pages.push(await open());
    return await operation(pages);
  } finally {
    await Promise.all(pages.map((page) => page.close()));
  }
}

/**
 * Spread ordered work across the capture pages while preserving plan order.
 *
 * Lanes pull from one shared queue instead of taking a fixed slice, so a slow
 * example delays only its own lane, and every result lands at its input index
 * however the lanes interleave — the manifest order stays the plan order.
 */
export async function mapCaptureLanes<L, I, O>(
  inputs: readonly I[],
  lanes: readonly L[],
  work: (input: I, lane: L) => Promise<O>,
): Promise<readonly O[]> {
  if (lanes.length === 0 && inputs.length > 0) {
    throw new TypeError("Capture work needs at least one lane");
  }
  const queue = [...inputs.entries()];
  const results = new Array<O>(inputs.length);
  let cursor = 0;
  await Promise.all(lanes.map(async (lane) => {
    for (
      let taken = queue[cursor++];
      taken !== undefined;
      taken = queue[cursor++]
    ) {
      const [index, input] = taken;
      results[index] = await work(input, lane);
    }
  }));
  return results;
}

/** Read width and height directly from a PNG's mandatory IHDR chunk. */
export function pngDimensions(
  bytes: Uint8Array,
): { readonly width: number; readonly height: number } {
  const chunks = pngChunkTypes(bytes);
  if (
    chunks[0] !== "IHDR" ||
    chunks.at(-1) !== "IEND" ||
    new TextDecoder().decode(bytes.subarray(12, 16)) !== "IHDR"
  ) {
    throw new TypeError("Component example image is not a canonical PNG");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width === 0 || height === 0) {
    throw new TypeError(`Component example PNG is ${width}×${height}`);
  }
  return { width, height };
}

/** Parse the complete PNG chunk sequence and reject trailing or malformed data. */
export function pngChunkTypes(bytes: Uint8Array): readonly string[] {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 20 ||
    signature.some((value, index) => bytes[index] !== value)
  ) {
    throw new TypeError("Component example image is not a PNG");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let offset = signature.length;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) {
      throw new TypeError("Component example PNG has a truncated chunk");
    }
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) {
      throw new TypeError("Component example PNG has an invalid chunk length");
    }
    const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
    if (!/^[A-Za-z]{4}$/u.test(type)) {
      throw new TypeError("Component example PNG has an invalid chunk type");
    }
    chunks.push(type);
    offset = end;
    if (type === "IEND") {
      if (length !== 0 || offset !== bytes.length) {
        throw new TypeError(
          "Component example PNG has invalid data after IEND",
        );
      }
      break;
    }
  }
  return chunks;
}

function assertCanonicalPng(bytes: Uint8Array, source: string): void {
  const allowed = new Set(["IHDR", "sRGB", "IDAT", "IEND"]);
  const chunks = pngChunkTypes(bytes);
  if (
    chunks[0] !== "IHDR" || chunks.at(-1) !== "IEND" ||
    !chunks.includes("IDAT") || chunks.some((type) => !allowed.has(type))
  ) {
    throw new Error(
      `${source} contains non-canonical PNG chunks: ${chunks.join(", ")}`,
    );
  }
}

/** Hash exactly one typed-array view, never its pooled backing allocation. */
export async function componentExampleContentHash(
  bytes: Uint8Array,
): Promise<`sha256:${string}`> {
  const exact = new Uint8Array(bytes.byteLength);
  exact.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", exact.buffer);
  return `sha256:${encodeHex(digest)}`;
}

async function readIfPresent(url: URL): Promise<Uint8Array | undefined> {
  try {
    return await Deno.readFile(url);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return undefined;
    throw error;
  }
}

/**
 * Enumerate repository-owned capture inputs from Git's tracked and unignored
 * working-tree population. Ignored editor, OS, and build artifacts can never
 * perturb the generated source hash, while a new authored file enrols before
 * it is staged.
 */
export async function repositoryCaptureSourcePaths(
  root: URL,
  inputs: readonly string[],
): Promise<readonly string[]> {
  const result = await new Deno.Command("git", {
    args: [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      ...inputs,
    ],
    cwd: fromFileUrl(root),
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) {
    throw new Error(
      `Could not enumerate Component example image inputs: ${
        new TextDecoder().decode(result.stderr).trim()
      }`,
    );
  }
  return new TextDecoder().decode(result.stdout).split("\0").filter(Boolean)
    .toSorted((left, right) => left.localeCompare(right));
}

/** Hash every repository-owned input that can affect capture pixels or facts. */
export async function componentExampleCaptureSourceHash(): Promise<
  `sha256:${string}`
> {
  const paths = (await repositoryCaptureSourcePaths(ROOT, CAPTURE_INPUTS))
    .filter(isComponentExampleCaptureSourcePath);
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (const path of paths) {
    const pathBytes = encoder.encode(`${path}\0`);
    const contents = await Deno.readFile(new URL(path, ROOT));
    chunks.push(pathBytes, contents, encoder.encode("\0"));
    length += pathBytes.length + contents.length + 1;
  }
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return await componentExampleContentHash(joined);
}

function imageSources(): readonly ComponentExampleImageSource[] {
  return Object.entries(componentExampleRegistry).map(([slug, examples]) => ({
    slug,
    examples,
  }));
}

function platformMatchesByteContract(): boolean {
  return Deno.build.os === componentExampleCaptureContract.bytePlatform.os &&
    Deno.build.arch === componentExampleCaptureContract.bytePlatform.arch &&
    Deno.osRelease() === componentExampleCaptureContract.bytePlatform.release;
}

async function assertRuntime(update: boolean): Promise<string> {
  if (Deno.version.deno !== componentExampleCaptureContract.denoVersion) {
    throw new Error(
      `Component example capture needs Deno ${componentExampleCaptureContract.denoVersion}; received ${Deno.version.deno}`,
    );
  }
  const packageJson: unknown = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  );
  const dependencies =
    typeof packageJson === "object" && packageJson !== null &&
      "devDependencies" in packageJson &&
      typeof packageJson.devDependencies === "object" &&
      packageJson.devDependencies !== null
      ? packageJson.devDependencies as Record<string, unknown>
      : {};
  if (
    dependencies["playwright-core"] !==
      componentExampleCaptureContract.playwrightVersion
  ) {
    throw new Error(
      `package.json must pin playwright-core ${componentExampleCaptureContract.playwrightVersion}`,
    );
  }
  if (update && !platformMatchesByteContract()) {
    const actual = `${Deno.build.os}/${Deno.build.arch}/${Deno.osRelease()}`;
    const expected = componentExampleCaptureContract.bytePlatform;
    throw new Error(
      `Image updates require the canonical raster platform ${expected.os}/${expected.arch}/${expected.release}; received ${actual}. Other platforms may verify artifact integrity and live geometry only.`,
    );
  }
  const executable = chromium.executablePath();
  const revision = executable.match(
    /(?:chromium|chromium_headless_shell)-(\d+)/u,
  )?.[1];
  if (revision !== componentExampleCaptureContract.chromiumRevision) {
    throw new Error(
      `Playwright-managed Chromium revision ${componentExampleCaptureContract.chromiumRevision} is required; ${
        JSON.stringify(executable)
      } resolves revision ${revision ?? "unknown"}`,
    );
  }
  try {
    const info = await Deno.stat(executable);
    if (!info.isFile) throw new Error("not a file");
  } catch {
    throw new Error(
      `Pinned Chromium is not installed at ${
        JSON.stringify(executable)
      }. Run: deno run -A npm:playwright@${componentExampleCaptureContract.playwrightVersion} install chromium`,
    );
  }
  return executable;
}

async function assertGeneratedExampleRegistryCurrent(): Promise<void> {
  const expected = (await generateSources()).componentExamples;
  const actual = await Deno.readTextFile(
    new URL("./generated/component-examples.ts", import.meta.url),
  );
  if (actual !== expected) {
    throw new Error(
      "Canonical Component example facts are stale. Run `deno task codegen` before capturing images.",
    );
  }
}

async function startCaptureBrowser(
  executablePath: string,
): Promise<CaptureBrowser> {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [...componentExampleCaptureContract.browserArguments],
  });
  const browserVersion = browser.version();
  if (browserVersion !== componentExampleCaptureContract.chromiumVersion) {
    await browser.close();
    throw new Error(
      `Pinned Chromium must report ${componentExampleCaptureContract.chromiumVersion}; received ${browserVersion}`,
    );
  }
  const context = await browser.newContext({
    viewport: componentExampleCaptureContract.viewport,
    deviceScaleFactor: componentExampleCaptureContract.deviceScaleFactor,
    locale: componentExampleCaptureContract.locale,
    timezoneId: componentExampleCaptureContract.timezoneId,
    colorScheme: "light",
    reducedMotion: componentExampleCaptureContract.reducedMotion,
    serviceWorkers: "block",
  });
  await context.addInitScript(
    ({ clock, randomSeed }) => {
      const NativeDate = Date;
      const fixedTime = NativeDate.parse(clock);
      const FixedDate = function (...args: unknown[]) {
        return Reflect.construct(
          NativeDate,
          args.length === 0 ? [fixedTime] : args,
        );
      };
      Object.setPrototypeOf(FixedDate, NativeDate);
      FixedDate.prototype = NativeDate.prototype;
      Object.defineProperty(FixedDate, "now", { value: () => fixedTime });
      Object.defineProperty(globalThis, "Date", { value: FixedDate });
      let state = randomSeed >>> 0;
      const next = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x1_0000_0000;
      };
      Object.defineProperty(Math, "random", { value: next });
      Object.defineProperty(crypto, "getRandomValues", {
        value: <T extends ArrayBufferView>(array: T): T => {
          const bytes = new Uint8Array(
            array.buffer,
            array.byteOffset,
            array.byteLength,
          );
          for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(next() * 256);
          }
          return array;
        },
      });
    },
    {
      clock: componentExampleCaptureContract.clock,
      randomSeed: componentExampleCaptureContract.randomSeed,
    },
  );
  return { browser, context };
}

/**
 * Open one reusable capture document that records its own blocked requests.
 *
 * The route lives on the page rather than the context so that concurrent lanes
 * cannot attribute one another's off-origin requests to the wrong example.
 */
async function openCapturePage(
  capture: CaptureBrowser,
  origin: string,
): Promise<CapturePage> {
  const page = await capture.context.newPage();
  const externalRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin || url.protocol === "data:") {
      await route.continue();
      return;
    }
    externalRequests.push(url.href);
    await route.abort("blockedbyclient");
  });
  return { page, externalRequests, close: () => page.close() };
}

function captureUrl(
  origin: string,
  input: PlannedComponentExampleImage,
): string {
  const url = new URL("/catalogue/example-images/", origin);
  url.searchParams.set("component", input.slug);
  url.searchParams.set("example", input.exampleId);
  url.searchParams.set("theme", input.theme);
  return url.href;
}

async function captureImage(
  target: CapturePage,
  origin: string,
  input: PlannedComponentExampleImage,
): Promise<Uint8Array> {
  const source = `${input.slug}/${input.exampleId}/${input.theme}`;
  const page = target.page;
  try {
    const failures: string[] = [];
    const consoleListener = (message: { type(): string; text(): string }) => {
      if (message.type() === "error") {
        failures.push(`console: ${message.text()}`);
      }
    };
    const pageErrorListener = (error: Error) =>
      failures.push(`exception: ${error.message}`);
    const responseListener = (
      response: { status(): number; url(): string },
    ) => {
      if (response.status() >= 400) {
        failures.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    };
    page.on("console", consoleListener);
    page.on("pageerror", pageErrorListener);
    page.on("response", responseListener);
    const externalStart = target.externalRequests.length;
    try {
      await page.emulateMedia({
        colorScheme: input.theme,
        reducedMotion: componentExampleCaptureContract.reducedMotion,
      });
      await page.goto(captureUrl(origin, input), {
        waitUntil: "domcontentloaded",
      });
      await page.waitForFunction(() => {
        const state = (globalThis as typeof globalThis & {
          __discernExampleCapture?: BrowserCaptureState;
        }).__discernExampleCapture;
        return state?.status === "ready" || state?.status === "error";
      });
      const state = await page.evaluate(() =>
        (globalThis as typeof globalThis & {
          __discernExampleCapture?: BrowserCaptureState;
        }).__discernExampleCapture
      );
      if (state === undefined || state.status === "error") {
        throw new Error(
          state === undefined
            ? "capture route exposed no state"
            : state.message,
        );
      }
      if (
        state.contractVersion !== componentExampleCaptureContract.version ||
        !state.fontsLoaded || state.activeAnimations !== 0
      ) {
        throw new Error(
          `invalid readiness evidence: ${JSON.stringify(state)}`,
        );
      }
      const external = target.externalRequests.slice(externalStart);
      if (external.length > 0) {
        failures.push(`external network: ${external.join(", ")}`);
      }
      if (failures.length > 0) throw new Error(failures.join("; "));
      if (state.region === undefined) {
        throw new Error("capture readiness exposed no region");
      }
      if (
        state.region.x < 0 || state.region.y < 0 ||
        state.documentWidth === undefined ||
        state.documentHeight === undefined ||
        state.region.x + state.region.width > state.documentWidth ||
        state.region.y + state.region.height > state.documentHeight
      ) {
        throw new Error(
          `capture region escapes its document: ${JSON.stringify(state)}`,
        );
      }
      validateComponentExampleCaptureFitsViewport(source, {
        width: state.documentWidth,
        height: state.documentHeight,
      });
      const bytes = await page.screenshot(
        componentExampleScreenshotOptions(state.region),
      );
      assertCanonicalPng(bytes, source);
      const dimensions = pngDimensions(bytes);
      if (
        dimensions.width !== state.region.width ||
        dimensions.height !== state.region.height
      ) {
        throw new Error(
          `PNG ${dimensions.width}×${dimensions.height} differs from capture region ${state.region.width}×${state.region.height}`,
        );
      }
      return bytes;
    } finally {
      page.off("console", consoleListener);
      page.off("pageerror", pageErrorListener);
      page.off("response", responseListener);
    }
  } catch (error) {
    throw new Error(
      `${source}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function manifestSource(manifest: ComponentExampleImageManifest): string {
  return `/* Generated by scripts/component-example-images.ts. Do not edit. */
import type { ComponentExampleImageManifest } from "../example-images/contract.ts";

export const componentExampleImageManifest: ComponentExampleImageManifest = ${
    JSON.stringify(manifest, null, 2)
  };
`;
}

async function atomicWrite(url: URL, bytes: Uint8Array): Promise<void> {
  const temporary = new URL(`${url.pathname}.tmp`, url);
  await Deno.writeFile(temporary, bytes);
  await Deno.rename(temporary, url);
}

/**
 * Decide whether the committed bytes still show what this capture rendered.
 *
 * Chromium re-rasterizes identical source with occasional variation below the
 * perceptual floor. Rewriting the file for that produces reviewable churn that
 * carries no meaning, so a difference inside the declared raster tolerance
 * keeps the committed artifact and its recorded hash.
 */
async function committedRasterStillShows(
  committedBytes: Uint8Array,
  capturedBytes: Uint8Array,
  source: string,
): Promise<boolean> {
  const committed = await decodeCanonicalPngRaster(
    committedBytes,
    `${source} (committed)`,
  );
  const captured = await decodeCanonicalPngRaster(
    capturedBytes,
    `${source} (captured)`,
  );
  return rasterDifferenceIsImperceptible(
    compareCanonicalPngRasters(committed, captured),
  );
}

async function applyUpdate(
  plan: readonly PlannedComponentExampleImage[],
  captured: readonly CapturedImage[],
  sourceHash: `sha256:${string}`,
): Promise<{
  readonly changed: number;
  readonly removed: number;
  readonly retained: readonly string[];
  readonly totalBytes: number;
}> {
  await Deno.mkdir(IMAGE_ROOT, { recursive: true });
  const current = [];
  for await (const entry of Deno.readDir(IMAGE_ROOT)) {
    if (entry.isFile) current.push(entry.name);
  }
  let changed = 0;
  let totalBytes = 0;
  const retained: string[] = [];
  const entries: ComponentExampleImageManifestEntry[] = [];
  for (const image of captured) {
    const target = new URL(
      image.entry.assetPath.replace(/^catalogue\//u, ""),
      new URL("../catalogue/", import.meta.url),
    );
    const existing = await readIfPresent(target);
    if (
      existing !== undefined &&
      await componentExampleContentHash(existing) === image.entry.contentHash
    ) {
      entries.push(image.entry);
      totalBytes += existing.length;
      continue;
    }
    if (
      existing !== undefined &&
      await committedRasterStillShows(
        existing,
        image.bytes,
        image.entry.assetPath,
      )
    ) {
      entries.push({
        ...image.entry,
        contentHash: await componentExampleContentHash(existing),
      });
      retained.push(image.entry.assetPath);
      totalBytes += existing.length;
      continue;
    }
    await atomicWrite(target, image.bytes);
    entries.push(image.entry);
    totalBytes += image.bytes.length;
    changed += 1;
  }
  const orphans = orphanedComponentExampleImageFiles(plan, current);
  for (const filename of orphans) {
    await Deno.remove(new URL(filename, IMAGE_ROOT));
  }
  const manifest: ComponentExampleImageManifest = {
    captureContractVersion: componentExampleCaptureContract.version,
    sourceHash,
    entries,
  };
  const nextManifest = encoder.encode(manifestSource(manifest));
  const currentManifest = await readIfPresent(MANIFEST_URL);
  if (
    currentManifest === undefined ||
    await componentExampleContentHash(currentManifest) !==
      await componentExampleContentHash(nextManifest)
  ) {
    await atomicWrite(MANIFEST_URL, nextManifest);
    changed += 1;
  }
  return { changed, removed: orphans.length, retained, totalBytes };
}

async function componentNames(): Promise<ReadonlyMap<string, string>> {
  return new Map(
    (await loadComponentSources()).map(({ meta }) => [
      meta.slug,
      meta.name,
    ]),
  );
}

async function capturedEntry(
  input: PlannedComponentExampleImage,
  componentName: string,
  bytes: Uint8Array,
): Promise<CapturedImage> {
  const dimensions = pngDimensions(bytes);
  const assetPath = `catalogue/generated/example-images/${input.filename}`;
  return {
    bytes,
    entry: {
      slug: input.slug,
      componentName,
      exampleId: input.exampleId,
      label: input.label,
      theme: input.theme,
      assetPath,
      assetUrl: `/${assetPath}`,
      ...dimensions,
      contentHash: await componentExampleContentHash(bytes),
      captureContractVersion: componentExampleCaptureContract.version,
    },
  };
}

async function withCaptureServer<T>(
  operation: (origin: string) => Promise<T>,
): Promise<T> {
  const server = Deno.serve({
    hostname: "127.0.0.1",
    port: 0,
    onListen: () => undefined,
  }, catalogueServer.fetch);
  const address = server.addr;
  if (address.transport !== "tcp") {
    await server.shutdown();
    throw new Error("Component example capture server did not bind TCP");
  }
  try {
    return await operation(`http://127.0.0.1:${address.port}`);
  } finally {
    await server.shutdown();
  }
}

async function updateImages(): Promise<void> {
  const started = performance.now();
  const executablePath = await assertRuntime(true);
  await assertGeneratedExampleRegistryCurrent();
  const plan = planComponentExampleImages(imageSources());
  const names = await componentNames();
  const buildStarted = performance.now();
  await buildDesignSystem();
  const buildMs = performance.now() - buildStarted;
  const sourceHash = await componentExampleCaptureSourceHash();
  let browserMs = 0;
  let captureMs = 0;
  let captured: readonly CapturedImage[] = [];
  await withCaptureServer(async (origin) => {
    const browserStarted = performance.now();
    const capture = await startCaptureBrowser(executablePath);
    browserMs = performance.now() - browserStarted;
    try {
      captured = await withCapturePages(
        () => openCapturePage(capture, origin),
        componentExampleCaptureContract.capturePages,
        async (pages) => {
          const captureStarted = performance.now();
          const images = await mapCaptureLanes(
            plan,
            pages,
            async (input, target) => {
              const name = names.get(input.slug);
              if (name === undefined) {
                throw new Error(`No source Metadata name for ${input.slug}`);
              }
              return await capturedEntry(
                input,
                name,
                await captureImage(target, origin, input),
              );
            },
          );
          captureMs = performance.now() - captureStarted;
          return images;
        },
      );
    } finally {
      await capture.context.close();
      await capture.browser.close();
    }
  });
  if (await componentExampleCaptureSourceHash() !== sourceHash) {
    throw new Error(
      "Capture inputs changed while images were rendering; rerun the update",
    );
  }
  const applied = await applyUpdate(plan, captured, sourceHash);
  const timing: CaptureTiming = {
    buildMs,
    browserMs,
    captureMs,
    totalMs: performance.now() - started,
  };
  console.log(
    `Updated ${captured.length} Component example images (${applied.totalBytes} bytes); ${applied.changed} files changed, ${applied.retained.length} retained through imperceptible raster variation, and ${applied.removed} orphans removed. ` +
      `Build ${(timing.buildMs / 1000).toFixed(2)}s, browser ${
        (timing.browserMs / 1000).toFixed(2)
      }s, capture ${(timing.captureMs / 1000).toFixed(2)}s (${
        (timing.captureMs / captured.length).toFixed(1)
      }ms/image), total ${(timing.totalMs / 1000).toFixed(2)}s.`,
  );
  for (const assetPath of applied.retained) {
    console.log(`  retained ${assetPath}`);
  }
}

async function imageFiles(): Promise<string[]> {
  const files: string[] = [];
  try {
    for await (const entry of Deno.readDir(IMAGE_ROOT)) {
      if (entry.isFile) files.push(entry.name);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return [];
    throw error;
  }
  return files.toSorted();
}

async function verifyArtifacts(
  plan: readonly PlannedComponentExampleImage[],
): Promise<void> {
  if (
    componentExampleImageManifest.captureContractVersion !==
      componentExampleCaptureContract.version
  ) {
    throw new Error("Generated image manifest uses a stale capture contract");
  }
  validateComponentExampleImageCoverage(plan, componentExampleImageManifest);
  const files = await imageFiles();
  const expectedFiles = plan.map(({ filename }) => filename).toSorted();
  if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
    throw new Error(
      `Generated image files are missing, stale, or orphaned. Expected ${expectedFiles.length}, found ${files.length}. Run \`deno task catalogue:images --update\`.`,
    );
  }
  for (const entry of componentExampleImageManifest.entries) {
    if (
      entry.captureContractVersion !==
        componentExampleCaptureContract.version ||
      entry.width <= 0 || entry.height <= 0 ||
      entry.assetPath.startsWith("/") ||
      entry.assetUrl !== `/${entry.assetPath}`
    ) {
      throw new Error(
        `Invalid generated image manifest entry ${entry.slug}/${entry.exampleId}/${entry.theme}`,
      );
    }
    const bytes = await Deno.readFile(new URL(entry.assetUrl.slice(1), ROOT));
    assertCanonicalPng(bytes, entry.assetPath);
    const dimensions = pngDimensions(bytes);
    if (
      dimensions.width !== entry.width || dimensions.height !== entry.height
    ) {
      throw new Error(
        `${entry.assetPath} dimensions are ${dimensions.width}×${dimensions.height}, manifest records ${entry.width}×${entry.height}`,
      );
    }
    if (await componentExampleContentHash(bytes) !== entry.contentHash) {
      throw new Error(`${entry.assetPath} content hash is stale`);
    }
  }
}

/** Fail closed when a manifest omits, invents, or reorders one planned image. */
export function validateComponentExampleImageCoverage(
  plan: readonly PlannedComponentExampleImage[],
  manifest: ComponentExampleImageManifest,
): void {
  const expectedKeys = plan.map(({ slug, exampleId, theme }) =>
    `${slug}/${exampleId}/${theme}`
  );
  const actualKeys = manifest.entries.map((entry) =>
    `${entry.slug}/${entry.exampleId}/${entry.theme}`
  );
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error(
      "Generated image manifest does not cover the current canonical Web example order. Run `deno task catalogue:images --update`.",
    );
  }
}

function witnessInputs(
  plan: readonly PlannedComponentExampleImage[],
): readonly PlannedComponentExampleImage[] {
  if (plan.length === 0) throw new Error("No Web examples to verify");
  const candidates = [plan[0], plan[Math.floor(plan.length / 2)], plan.at(-1)];
  const byKey = new Map<string, PlannedComponentExampleImage>();
  for (const candidate of candidates) {
    if (candidate !== undefined) byKey.set(candidate.filename, candidate);
  }
  return [...byKey.values()];
}

/**
 * Treat subpixel raster noise as non-semantic while exact capture geometry holds.
 * Committed PNG hashes still protect the stored artifact from corruption.
 */
export function validateComponentExampleRepeatGeometry(
  source: string,
  first: { readonly width: number; readonly height: number },
  second: { readonly width: number; readonly height: number },
  committed: { readonly width: number; readonly height: number },
): void {
  if (
    first.width !== second.width || first.height !== second.height ||
    first.width !== committed.width || first.height !== committed.height
  ) {
    throw new Error(
      `${source} geometry changed across live captures or differs from the committed manifest`,
    );
  }
}

async function verifyImages(): Promise<void> {
  const started = performance.now();
  const executablePath = await assertRuntime(false);
  await assertGeneratedExampleRegistryCurrent();
  const plan = planComponentExampleImages(imageSources());
  await verifyArtifacts(plan);
  const sourceHash = await componentExampleCaptureSourceHash();
  if (componentExampleImageManifest.sourceHash !== sourceHash) {
    throw new Error(
      "Generated Component example images are stale for the current capture inputs. Run `deno task catalogue:images --update` on the canonical raster platform.",
    );
  }
  const buildStarted = performance.now();
  await buildDesignSystem();
  const buildMs = performance.now() - buildStarted;
  const witnesses = witnessInputs(plan);
  const canonicalRaster = platformMatchesByteContract();
  await withCaptureServer(async (origin) => {
    const capture = await startCaptureBrowser(executablePath);
    try {
      await withCapturePages(
        () => openCapturePage(capture, origin),
        componentExampleCaptureContract.capturePages,
        (pages) =>
          mapCaptureLanes(witnesses, pages, async (input, target) => {
            const source = `${input.slug}/${input.exampleId}/${input.theme}`;
            const first = await captureImage(target, origin, input);
            const second = await captureImage(target, origin, input);
            const committed = componentExampleImageManifest.entries.find(
              (entry) =>
                entry.slug === input.slug &&
                entry.exampleId === input.exampleId &&
                entry.theme === input.theme,
            );
            if (committed === undefined) {
              throw new Error("Witness has no manifest entry");
            }
            validateComponentExampleRepeatGeometry(
              source,
              pngDimensions(first),
              pngDimensions(second),
              committed,
            );
            if (!canonicalRaster) return;
            const committedBytes = await Deno.readFile(
              new URL(committed.assetUrl.slice(1), ROOT),
            );
            if (
              !await committedRasterStillShows(committedBytes, second, source)
            ) {
              throw new Error(
                `${source} no longer rasterizes as the committed image shows, past the declared raster tolerance. Run \`deno task catalogue:images --update\` if the change is intended.`,
              );
            }
          }),
      );
    } finally {
      await capture.context.close();
      await capture.browser.close();
    }
  });
  const actualBytes = await Promise.all(
    componentExampleImageManifest.entries.map(async (entry) =>
      (await Deno.stat(new URL(entry.assetUrl.slice(1), ROOT))).size
    ),
  );
  console.log(
    `Verified ${plan.length} Component example images (${
      actualBytes.reduce((sum, bytes) => sum + bytes, 0)
    } bytes) and ${witnesses.length} repeat-capture witnesses in ${
      ((performance.now() - started) / 1000).toFixed(2)
    }s (build ${(buildMs / 1000).toFixed(2)}s; exact live geometry compared${
      canonicalRaster ? ", committed rasters compared within tolerance" : ""
    }).`,
  );
}

function posture(): "update" | "verify" {
  if (Deno.args.length !== 1) {
    throw new TypeError(
      "Use exactly one posture: `deno task catalogue:images --update` or `deno task catalogue:images --verify`.",
    );
  }
  if (Deno.args[0] === "--update") return "update";
  if (Deno.args[0] === "--verify") return "verify";
  throw new TypeError(
    `Unknown Component example image posture ${Deno.args[0]}`,
  );
}

if (import.meta.main) {
  if (posture() === "update") await updateImages();
  else await verifyImages();
}
