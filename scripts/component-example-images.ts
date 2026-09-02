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
import { componentRegistry } from "../src/generated/component-registry.ts";
import { componentExampleRegistry } from "./generated/component-examples.ts";
import { buildDesignSystem } from "./build.ts";
import {
  type ComponentSource,
  generateSources,
  loadComponentSources,
} from "./generate.ts";
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

const CAPTURE_SHARED_INPUTS = [
  "assets/behaviors/",
  "assets/fonts.css",
  "assets/fonts/",
  "assets/grain.css",
  "assets/textures/grain.png",
  "catalogue/example-images/capture.css",
  "catalogue/example-images/index.html",
  "catalogue/styles/components.css",
  "src/styles/",
  "src/theme/",
  "src/tokens/",
] as const;

const CAPTURE_GRAPH_ENTRY = new URL(
  "../catalogue/example-images/capture.tsx",
  import.meta.url,
);
const CAPTURE_REGISTRY = new URL(
  "../catalogue/generated/example-image-registry.ts",
  import.meta.url,
);

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
    omitBackground: true,
    scale: "device",
  };
}

/**
 * Open one capture document, reuse it for the whole run, and always close it.
 *
 * Opening a document costs roughly 700ms against the ~220ms a capture then
 * needs, so the run reuses a single page. Reuse is safe only because no
 * capture takes Chromium's beyond-viewport screenshot path, which permanently
 * changes how its page rasterizes text — every capture proves it through
 * `validateComponentExampleCaptureFitsViewport`.
 *
 * One page, not several. Readiness settles on painted frames, and concurrent
 * renderers can change that cadence, so an example that prepares an interaction
 * may be measured mid-settle. Sequential capture keeps one settled geometry
 * protocol until readiness can converge independently of frame cadence.
 */
export async function withCapturePage<
  P extends { close(): Promise<void> },
  T,
>(
  open: () => Promise<P>,
  operation: (page: P) => Promise<T>,
): Promise<T> {
  const page = await open();
  try {
    return await operation(page);
  } finally {
    await page.close();
  }
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
    !chunks.includes("IDAT") || chunks.some((type) => !allowed.has(type)) ||
    bytes[24] !== 8 || (bytes[25] !== 2 && bytes[25] !== 6)
  ) {
    throw new Error(
      `${source} is not a canonical 8-bit RGB or RGBA PNG: ${
        chunks.join(", ")
      }`,
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

type CaptureSourceInput = {
  readonly path: string;
  readonly contents: Uint8Array;
};

function jsonRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).toSorted(([left], [right]) =>
      left.localeCompare(right)
    ).map(([key, child]) => [key, canonicalJson(child)]),
  );
}

/**
 * Capture inputs include only executable configuration that can affect the
 * rendering graph. Release identity, tasks, and publish metadata cannot change
 * a rendered example and therefore do not invalidate its image.
 */
export function componentExampleCaptureConfiguration(
  denoJson: unknown,
  packageJson: unknown,
): unknown {
  const deno = jsonRecord(denoJson);
  const packageRecord = jsonRecord(packageJson);
  const dependencies = jsonRecord(packageRecord.devDependencies);
  return canonicalJson({
    deno: {
      compilerOptions: deno.compilerOptions,
      imports: deno.imports,
      nodeModulesDir: deno.nodeModulesDir,
      unstable: deno.unstable,
    },
    package: {
      type: packageRecord.type,
      devDependencies: {
        "playwright-core": dependencies["playwright-core"],
        react: dependencies.react,
        "react-dom": dependencies["react-dom"],
      },
    },
  });
}

/** Hash source bytes with the capture-relevant portion of repository config. */
export async function componentExampleCaptureInputHash(
  sources: readonly CaptureSourceInput[],
  denoJson: unknown,
  packageJson: unknown,
): Promise<`sha256:${string}`> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  const append = (path: string, contents: Uint8Array): void => {
    const pathBytes = encoder.encode(`${path}\0`);
    chunks.push(pathBytes, contents, encoder.encode("\0"));
    length += pathBytes.length + contents.length + 1;
  };
  for (
    const source of sources.toSorted((left, right) =>
      left.path.localeCompare(right.path)
    )
  ) {
    append(source.path, source.contents);
  }
  append(
    "<capture-configuration>",
    encoder.encode(JSON.stringify(
      componentExampleCaptureConfiguration(denoJson, packageJson),
    )),
  );
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return await componentExampleContentHash(joined);
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

export interface ComponentExampleCaptureDependency {
  readonly code?: { readonly specifier: string };
}

export interface ComponentExampleCaptureDependencyModule {
  readonly specifier: string;
  readonly local?: string;
  readonly dependencies?: readonly ComponentExampleCaptureDependency[];
}

export interface ComponentExampleCaptureDependencyGraph {
  readonly root: string;
  readonly modules: readonly ComponentExampleCaptureDependencyModule[];
}

/**
 * Enumerate only local modules reachable from the supplied rendering roots.
 * An unimported private source cannot become capture evidence merely by living
 * beneath the same broad directory as a Component.
 */
export function componentExampleCaptureDependencyPaths(
  graph: ComponentExampleCaptureDependencyGraph,
  roots: readonly string[],
  projectRoot: URL,
  blocked: ReadonlySet<string> = new Set(),
): readonly string[] {
  const projectPath = fromFileUrl(projectRoot).replace(/\/$/u, "");
  const modules = new Map(graph.modules.map((module) => [
    module.specifier,
    module,
  ]));
  const visited = new Set<string>();
  const paths = new Set<string>();
  const visit = (specifier: string): void => {
    if (visited.has(specifier) || blocked.has(specifier)) return;
    visited.add(specifier);
    const module = modules.get(specifier);
    if (module === undefined) return;
    if (
      module.local !== undefined &&
      (module.local === projectPath ||
        module.local.startsWith(`${projectPath}/`))
    ) {
      paths.add(module.local.slice(projectPath.length + 1));
    }
    for (const dependency of module.dependencies ?? []) {
      if (dependency.code !== undefined) visit(dependency.code.specifier);
    }
  };
  for (const root of roots) visit(root);
  return [...paths].toSorted((left, right) => left.localeCompare(right));
}

async function captureDependencyGraph(): Promise<
  ComponentExampleCaptureDependencyGraph
> {
  const result = await new Deno.Command(Deno.execPath(), {
    args: ["info", "--json", fromFileUrl(CAPTURE_GRAPH_ENTRY)],
    cwd: fromFileUrl(ROOT),
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) {
    throw new Error(
      `Could not resolve the Component example capture graph: ${
        new TextDecoder().decode(result.stderr).trim()
      }`,
    );
  }
  const parsed = JSON.parse(
    new TextDecoder().decode(result.stdout),
  ) as {
    readonly modules?: readonly ComponentExampleCaptureDependencyModule[];
  };
  if (!Array.isArray(parsed.modules)) {
    throw new TypeError("Deno capture graph exposed no module population");
  }
  return { root: CAPTURE_GRAPH_ENTRY.href, modules: parsed.modules };
}

async function captureSourceInputs(
  paths: readonly string[],
): Promise<readonly CaptureSourceInput[]> {
  return await Promise.all(
    [...new Set(paths)].toSorted().map(async (path) => ({
      path,
      contents: await Deno.readFile(new URL(path, ROOT)),
    })),
  );
}

async function componentStyleInputs(
  slug: string,
  sources: readonly ComponentSource[],
): Promise<readonly CaptureSourceInput[]> {
  const dependencyEntries = new Map(componentRegistry.map((entry) => [
    entry.meta.slug,
    entry,
  ]));
  const sourceEntries = new Map(sources.map((source) => [
    source.meta.slug,
    source,
  ]));
  const visited = new Set<string>();
  const inputs: CaptureSourceInput[] = [];
  const visit = async (candidate: string): Promise<void> => {
    if (visited.has(candidate)) return;
    visited.add(candidate);
    const entry = dependencyEntries.get(candidate);
    const source = sourceEntries.get(candidate);
    if (entry === undefined || source === undefined) {
      throw new TypeError(
        `No generated Component style entry for ${candidate}`,
      );
    }
    inputs.push({
      path: source.cssUrl.pathname.slice(fromFileUrl(ROOT).length),
      contents: await Deno.readFile(source.cssUrl),
    });
    for (const dependency of entry.dependencies) await visit(dependency);
  };
  await visit(slug);
  return inputs.toSorted((left, right) => left.path.localeCompare(right.path));
}

function captureSourceKey(
  input: Pick<PlannedComponentExampleImage, "slug" | "exampleId" | "theme">,
): string {
  return `${input.slug}/${input.exampleId}/${input.theme}`;
}

/** Select exactly the source or artifact entries that require Chromium. */
export function componentExampleImagesNeedingCapture(
  plan: readonly PlannedComponentExampleImage[],
  reusableKeys: ReadonlySet<string>,
): readonly PlannedComponentExampleImage[] {
  return plan.filter((input) => !reusableKeys.has(captureSourceKey(input)));
}

interface ComponentExampleCaptureSourceHashes {
  readonly overall: `sha256:${string}`;
  readonly entries: ReadonlyMap<string, `sha256:${string}`>;
}

async function componentExampleCaptureSourceHashes(
  plan: readonly PlannedComponentExampleImage[],
  sources: readonly ComponentSource[],
): Promise<ComponentExampleCaptureSourceHashes> {
  const graph = await captureDependencyGraph();
  const sharedGraphPaths = componentExampleCaptureDependencyPaths(
    graph,
    [CAPTURE_GRAPH_ENTRY.href],
    ROOT,
    new Set([CAPTURE_REGISTRY.href]),
  );
  const sharedStaticPaths = await repositoryCaptureSourcePaths(
    ROOT,
    CAPTURE_SHARED_INPUTS,
  );
  const sharedInputs = await captureSourceInputs([
    ...sharedGraphPaths,
    ...sharedStaticPaths,
  ]);
  const [denoJson, packageJson] = await Promise.all([
    Deno.readTextFile(new URL("../deno.json", import.meta.url)).then(
      JSON.parse,
    ),
    Deno.readTextFile(new URL("../package.json", import.meta.url)).then(
      JSON.parse,
    ),
  ]);
  const hashesBySlug = new Map<string, `sha256:${string}`>();
  for (const source of sources) {
    const paths = componentExampleCaptureDependencyPaths(
      graph,
      [source.metaUrl.href, source.examplesUrl.href],
      ROOT,
    );
    hashesBySlug.set(
      source.meta.slug,
      await componentExampleCaptureInputHash(
        [
          ...sharedInputs,
          ...await captureSourceInputs(paths),
          ...await componentStyleInputs(source.meta.slug, sources),
        ],
        denoJson,
        packageJson,
      ),
    );
  }
  const entries = new Map<string, `sha256:${string}`>();
  for (const input of plan) {
    const hash = hashesBySlug.get(input.slug);
    if (hash === undefined) {
      throw new TypeError(`No capture source fingerprint for ${input.slug}`);
    }
    entries.set(captureSourceKey(input), hash);
  }
  const overall = await componentExampleCaptureInputHash(
    [...entries].map(([key, hash]) => ({
      path: `<entry:${key}>`,
      contents: encoder.encode(hash),
    })),
    {},
    {},
  );
  return { overall, entries };
}

/** Hash every repository-owned input that can affect capture pixels or facts. */
export async function componentExampleCaptureSourceHash(): Promise<
  `sha256:${string}`
> {
  const plan = planComponentExampleImages(imageSources());
  return (await componentExampleCaptureSourceHashes(
    plan,
    await loadComponentSources(),
  )).overall;
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

async function assertRuntime(): Promise<string> {
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
  if (!platformMatchesByteContract()) {
    const actual = `${Deno.build.os}/${Deno.build.arch}/${Deno.osRelease()}`;
    const expected = componentExampleCaptureContract.bytePlatform;
    throw new Error(
      `Image updates require the canonical raster platform ${expected.os}/${expected.arch}/${expected.release}; received ${actual}. Verification reads source and committed artifacts and does not launch Chromium.`,
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
  const generated = await generateSources();
  const actualExamples = await Deno.readTextFile(
    new URL("./generated/component-examples.ts", import.meta.url),
  );
  const actualRegistry = await Deno.readTextFile(
    new URL("../src/generated/component-registry.ts", import.meta.url),
  );
  if (
    actualExamples !== generated.componentExamples ||
    actualRegistry !== generated.registry
  ) {
    throw new Error(
      "Canonical Component image facts are stale. Run `deno task codegen` before capturing images.",
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
  url.searchParams.set("representative", input.representative ? "1" : "0");
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
        dimensions.width !==
          state.region.width *
            componentExampleCaptureContract.deviceScaleFactor ||
        dimensions.height !==
          state.region.height *
            componentExampleCaptureContract.deviceScaleFactor
      ) {
        throw new Error(
          `PNG ${dimensions.width}×${dimensions.height} differs from ${state.region.width}×${state.region.height} CSS pixels at ${componentExampleCaptureContract.deviceScaleFactor}× density`,
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

async function reusableManifestEntries(
  plan: readonly PlannedComponentExampleImage[],
  sourceHashes: ComponentExampleCaptureSourceHashes,
): Promise<ReadonlyMap<string, ComponentExampleImageManifestEntry>> {
  if (
    componentExampleImageManifest.captureContractVersion !==
      componentExampleCaptureContract.version
  ) return new Map();
  const reusable = new Map<string, ComponentExampleImageManifestEntry>();
  const entries = new Map(componentExampleImageManifest.entries.map((entry) => [
    captureSourceKey(entry),
    entry,
  ]));
  for (const input of plan) {
    const key = captureSourceKey(input);
    const sourceHash = sourceHashes.entries.get(key);
    const entry = entries.get(key);
    if (
      sourceHash === undefined || entry === undefined ||
      entry.sourceHash !== sourceHash ||
      entry.captureContractVersion !==
        componentExampleCaptureContract.version ||
      entry.density !== componentExampleCaptureContract.deviceScaleFactor ||
      entry.pixelWidth !== entry.width * entry.density ||
      entry.pixelHeight !== entry.height * entry.density ||
      entry.assetPath !==
        `catalogue/generated/example-images/${input.filename}` ||
      entry.assetUrl !== `/${entry.assetPath}`
    ) continue;
    let bytes: Uint8Array;
    try {
      bytes = await Deno.readFile(new URL(entry.assetUrl.slice(1), ROOT));
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) continue;
      throw error;
    }
    try {
      assertCanonicalPng(bytes, entry.assetPath);
      if (
        JSON.stringify(pngDimensions(bytes)) !== JSON.stringify({
            width: entry.pixelWidth,
            height: entry.pixelHeight,
          }) || await componentExampleContentHash(bytes) !== entry.contentHash
      ) continue;
      reusable.set(key, entry);
    } catch (error) {
      if (error instanceof Error) continue;
      throw error;
    }
  }
  return reusable;
}

async function applyUpdate(
  plan: readonly PlannedComponentExampleImage[],
  captured: readonly CapturedImage[],
  sourceHashes: ComponentExampleCaptureSourceHashes,
  reusable: ReadonlyMap<string, ComponentExampleImageManifestEntry>,
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
  const capturedByKey = new Map(captured.map((image) => [
    captureSourceKey(image.entry),
    image,
  ]));
  for (const input of plan) {
    const key = captureSourceKey(input);
    const image = capturedByKey.get(key);
    if (image === undefined) {
      const entry = reusable.get(key);
      if (entry === undefined) {
        throw new Error(`No captured or reusable image for ${key}`);
      }
      const bytes = await Deno.readFile(new URL(entry.assetUrl.slice(1), ROOT));
      entries.push(entry);
      retained.push(entry.assetPath);
      totalBytes += bytes.length;
      continue;
    }
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
    sourceHash: sourceHashes.overall,
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

function componentNames(
  sources: readonly ComponentSource[],
): ReadonlyMap<string, string> {
  return new Map(
    sources.map(({ meta }) => [
      meta.slug,
      meta.name,
    ]),
  );
}

async function capturedEntry(
  input: PlannedComponentExampleImage,
  componentName: string,
  bytes: Uint8Array,
  sourceHash: `sha256:${string}`,
): Promise<CapturedImage> {
  const pixels = pngDimensions(bytes);
  const density = componentExampleCaptureContract.deviceScaleFactor;
  if (pixels.width % density !== 0 || pixels.height % density !== 0) {
    throw new Error(
      `${input.filename} raster ${pixels.width}×${pixels.height} is not divisible by ${density}× density`,
    );
  }
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
      width: pixels.width / density,
      height: pixels.height / density,
      pixelWidth: pixels.width,
      pixelHeight: pixels.height,
      density,
      contentHash: await componentExampleContentHash(bytes),
      sourceHash,
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
  await assertGeneratedExampleRegistryCurrent();
  const plan = planComponentExampleImages(imageSources());
  const sources = await loadComponentSources();
  const names = componentNames(sources);
  const buildStarted = performance.now();
  await buildDesignSystem();
  const buildMs = performance.now() - buildStarted;
  const sourceHashes = await componentExampleCaptureSourceHashes(plan, sources);
  const reusable = await reusableManifestEntries(plan, sourceHashes);
  const pending = componentExampleImagesNeedingCapture(
    plan,
    new Set(reusable.keys()),
  );
  let browserMs = 0;
  let captureMs = 0;
  const captured: CapturedImage[] = [];
  if (pending.length > 0) {
    const executablePath = await assertRuntime();
    await withCaptureServer(async (origin) => {
      const browserStarted = performance.now();
      const capture = await startCaptureBrowser(executablePath);
      browserMs = performance.now() - browserStarted;
      try {
        await withCapturePage(
          () => openCapturePage(capture, origin),
          async (target) => {
            const captureStarted = performance.now();
            for (const input of pending) {
              const name = names.get(input.slug);
              const sourceHash = sourceHashes.entries.get(
                captureSourceKey(input),
              );
              if (name === undefined || sourceHash === undefined) {
                throw new Error(`No source facts for ${input.slug}`);
              }
              captured.push(
                await capturedEntry(
                  input,
                  name,
                  await captureImage(target, origin, input),
                  sourceHash,
                ),
              );
            }
            captureMs = performance.now() - captureStarted;
          },
        );
      } finally {
        await capture.context.close();
        await capture.browser.close();
      }
    });
    const finalHashes = await componentExampleCaptureSourceHashes(
      plan,
      sources,
    );
    if (finalHashes.overall !== sourceHashes.overall) {
      throw new Error(
        "Capture inputs changed while images were rendering; rerun the update",
      );
    }
  }
  const applied = await applyUpdate(plan, captured, sourceHashes, reusable);
  const timing: CaptureTiming = {
    buildMs,
    browserMs,
    captureMs,
    totalMs: performance.now() - started,
  };
  const averageCaptureMs = captured.length === 0
    ? "n/a"
    : `${(timing.captureMs / captured.length).toFixed(1)}ms/image`;
  console.log(
    `Updated ${plan.length} Component example images (${applied.totalBytes} bytes); ${captured.length} captured, ${applied.retained.length} source-current artifacts reused, ${applied.changed} files changed, and ${applied.removed} orphans removed. ` +
      `Build ${(timing.buildMs / 1000).toFixed(2)}s, browser ${
        (timing.browserMs / 1000).toFixed(2)
      }s, capture ${
        (timing.captureMs / 1000).toFixed(2)
      }s (${averageCaptureMs}), total ${(timing.totalMs / 1000).toFixed(2)}s.`,
  );
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
  sourceHashes: ComponentExampleCaptureSourceHashes,
): Promise<void> {
  if (
    componentExampleImageManifest.captureContractVersion !==
      componentExampleCaptureContract.version
  ) {
    throw new Error("Generated image manifest uses a stale capture contract");
  }
  if (componentExampleImageManifest.sourceHash !== sourceHashes.overall) {
    throw new Error(
      "Generated Component example images are stale for the current rendering sources. Run `deno task catalogue:images --update` on the canonical raster platform.",
    );
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
    const key = captureSourceKey(entry);
    if (
      entry.captureContractVersion !==
        componentExampleCaptureContract.version ||
      entry.sourceHash !== sourceHashes.entries.get(key) ||
      entry.width <= 0 || entry.height <= 0 ||
      typeof entry.pixelWidth !== "number" ||
      typeof entry.pixelHeight !== "number" ||
      entry.pixelWidth <= 0 || entry.pixelHeight <= 0 ||
      entry.density !== componentExampleCaptureContract.deviceScaleFactor ||
      entry.pixelWidth !== entry.width * entry.density ||
      entry.pixelHeight !== entry.height * entry.density ||
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
      dimensions.width !== entry.pixelWidth ||
      dimensions.height !== entry.pixelHeight
    ) {
      throw new Error(
        `${entry.assetPath} dimensions are ${dimensions.width}×${dimensions.height}, manifest records ${entry.pixelWidth}×${entry.pixelHeight} physical pixels`,
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

async function verifyImages(): Promise<void> {
  const started = performance.now();
  await assertGeneratedExampleRegistryCurrent();
  const plan = planComponentExampleImages(imageSources());
  const buildStarted = performance.now();
  await buildDesignSystem();
  const buildMs = performance.now() - buildStarted;
  const sourceHashes = await componentExampleCaptureSourceHashes(
    plan,
    await loadComponentSources(),
  );
  await verifyArtifacts(plan, sourceHashes);
  const actualBytes = await Promise.all(
    componentExampleImageManifest.entries.map(async (entry) =>
      (await Deno.stat(new URL(entry.assetUrl.slice(1), ROOT))).size
    ),
  );
  console.log(
    `Verified ${plan.length} Component example images (${
      actualBytes.reduce((sum, bytes) => sum + bytes, 0)
    } bytes) from source fingerprints and committed artifacts in ${
      ((performance.now() - started) / 1000).toFixed(2)
    }s (build ${(buildMs / 1000).toFixed(2)}s; Chromium not launched).`,
  );
}

export function componentExampleImagePostureEffects(
  value: "update" | "verify",
): {
  readonly build: true;
  readonly browser: "when-stale" | "never";
  readonly writes: boolean;
} {
  return value === "update"
    ? { build: true, browser: "when-stale", writes: true }
    : { build: true, browser: "never", writes: false };
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
