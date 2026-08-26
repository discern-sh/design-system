import type { EmbeddedRuntimeAsset } from "../src/runtime-assets.ts";
import {
  DIAGRAM_RELEASE_POSTURES,
  type DiagramKindMeta,
} from "../src/diagram/kind-meta.ts";
import { DIAGRAM_BUDGET_REMEDIES } from "../src/diagram/errors.ts";
import {
  CHART_CLI_HONESTY_TIERS,
  CHART_RELEASE_POSTURES,
  type ChartCliHonesty,
  type ChartKindMeta,
} from "../src/chart/kind-meta.ts";
import { CHART_BUDGET_REMEDIES } from "../src/chart/errors.ts";
import { CHART_REFUSED_FORMS } from "../src/chart/refusals.ts";
import {
  componentBehaviors,
  componentGroups,
  type ComponentMeta,
} from "../src/types/component-meta.ts";
import { cssClassNames } from "./css-syntax.ts";
import {
  camelIdentifier,
  type GeneratedKindFamilySources,
  generateKindFamilySources,
  type KindFamilyConfig,
  type KindFamilySource,
  loadKindFamilySources,
  pascalIdentifier,
  relativeImport,
  walk,
} from "./kind-family.ts";

const COMPONENT_ROOT = new URL("../src/components/", import.meta.url);
const ASSET_ROOT = new URL("../assets/", import.meta.url);
const BEHAVIOR_ROOT = new URL("../assets/behaviors/", import.meta.url);
const GENERATED_ROOT = new URL("../src/generated/", import.meta.url);
const STYLE_ROOT = new URL("../src/styles/", import.meta.url);
const DIAGRAM_KIND_ROOT = new URL("../src/diagram/kinds/", import.meta.url);
const CHART_KIND_ROOT = new URL("../src/chart/kinds/", import.meta.url);

export interface ComponentSource {
  readonly metaUrl: URL;
  readonly implementationUrl: URL;
  readonly cssUrl: URL;
  readonly cliUrl: URL;
  readonly meta: ComponentMeta;
}

export interface GeneratedSources {
  readonly registry: string;
  readonly assets: string;
  readonly behaviors: string;
  readonly react: string;
  readonly cliRegistry: string;
  readonly cliRenderers: string;
  readonly baseStyles: string;
  readonly diagramMetadata: string;
  readonly diagramRegistry: string;
  readonly diagramSpec: string;
  readonly diagramDispatch: string;
  readonly diagramExports: string;
  readonly diagramCliRegistry: string;
  readonly chartMetadata: string;
  readonly chartRegistry: string;
  readonly chartSpec: string;
  readonly chartDispatch: string;
  readonly chartExports: string;
  readonly chartCliRegistry: string;
}

/** Canonical source anatomy discovered for one diagram kind. */
export interface DiagramKindSource extends KindFamilySource {
  readonly meta: DiagramKindMeta;
}

type ComponentMetaCandidate =
  & Omit<ComponentMeta, "cli">
  & { readonly cli?: ComponentMeta["cli"] };

/** Enforce the two-way relationship between CLI Metadata and renderer files. */
export function validateCliStance(
  meta: ComponentMetaCandidate,
  hasRenderer: boolean,
  source: string,
): void {
  if (meta.cli === undefined) {
    throw new Error(`${source} has no declared CLI stance`);
  }
  if (meta.cli.stance === "rendered" && !hasRenderer) {
    throw new Error(
      `${source} declares a CLI renderer but has no .cli.ts file`,
    );
  }
  if (hasRenderer && meta.cli.stance !== "rendered") {
    throw new Error(`${source} has a .cli.ts file but no rendered CLI stance`);
  }
  if (meta.cli.stance === "exempt" && meta.cli.reason.trim() === "") {
    throw new Error(`${source} declares an exempt CLI stance without a reason`);
  }
}

/** Reject renderer modules that have no matching Component Metadata authority. */
export function validateCliInventory(files: readonly URL[]): void {
  const fileSet = new Set(files.map((url) => url.pathname));
  for (
    const cliUrl of files.filter((url) => url.pathname.endsWith(".cli.ts"))
  ) {
    const metaPath = cliUrl.pathname.replace(/\.cli\.ts$/u, ".meta.ts");
    if (!fileSet.has(metaPath)) {
      throw new Error(
        `${decodeURIComponent(cliUrl.pathname)} has no matching .meta.ts file`,
      );
    }
  }
}

/** Discover the canonical component inventory and validate its fixed anatomy. */
export async function loadComponentSources(): Promise<ComponentSource[]> {
  const files = await walk(COMPONENT_ROOT);
  const fileSet = new Set(files.map((url) => url.pathname));
  validateCliInventory(files);
  const sources: ComponentSource[] = [];
  for (
    const metaUrl of files.filter((url) => url.pathname.endsWith(".meta.ts"))
  ) {
    const implementationUrl = new URL(
      metaUrl.pathname.replace(/\.meta\.ts$/, ".tsx"),
      metaUrl,
    );
    const cssUrl = new URL(
      metaUrl.pathname.replace(/\.meta\.ts$/, ".css"),
      metaUrl,
    );
    const cliUrl = new URL(
      metaUrl.pathname.replace(/\.meta\.ts$/, ".cli.ts"),
      metaUrl,
    );
    if (!fileSet.has(implementationUrl.pathname)) {
      throw new Error(`Missing implementation for ${metaUrl.pathname}`);
    }
    if (!fileSet.has(cssUrl.pathname)) {
      throw new Error(`Missing stylesheet for ${metaUrl.pathname}`);
    }
    const module = await import(metaUrl.href) as { default: ComponentMeta };
    validateCliStance(
      module.default,
      fileSet.has(cliUrl.pathname),
      decodeURIComponent(metaUrl.pathname),
    );
    sources.push({
      metaUrl,
      implementationUrl,
      cssUrl,
      cliUrl,
      meta: module.default,
    });
  }
  return sources.toSorted((a, b) =>
    componentGroups.indexOf(a.meta.group) -
      componentGroups.indexOf(b.meta.group) ||
    a.meta.order - b.meta.order || a.meta.slug.localeCompare(b.meta.slug)
  );
}

/** Family enrolment facts for the built-in diagram kind set. */
function diagramKindFamily(root: URL): KindFamilyConfig {
  return {
    word: "diagram",
    typeName: "Diagram",
    kindRoot: root,
    budgetRemedies: DIAGRAM_BUDGET_REMEDIES,
    releasePostures: DIAGRAM_RELEASE_POSTURES,
    cliStances: ["description", "enhanced"],
    cli: {
      moduleStance: "enhanced",
      registryFile: "diagram-cli-registry.ts",
      contractsModule: "../cli/diagram-kinds.ts",
    },
    generatedFiles: {
      spec: "diagram-spec.ts",
      metadata: "diagram-metadata.ts",
      registry: "diagram-registry.ts",
      dispatch: "diagram-dispatch.ts",
      exports: "diagram-exports.ts",
    },
    modules: {
      kindMeta: "../diagram/kind-meta.ts",
      errors: "../diagram/errors.ts",
      conformance: "../diagram/conformance.ts",
      validation: "../diagram/validation.ts",
      scene: "../diagram/scene.ts",
    },
  };
}

/**
 * Enforce the chart stance–honesty pairing at generation time: an enhanced
 * kind declares exactly one honesty tier, and a description kind declares
 * none.
 */
function validateChartCliMeta(
  cli: Record<string, unknown>,
  source: string,
): void {
  if (cli.stance === "enhanced") {
    if (
      !CHART_CLI_HONESTY_TIERS.includes(cli.honesty as ChartCliHonesty) ||
      Object.keys(cli).toSorted().join(",") !== "honesty,stance"
    ) {
      throw new Error(
        `${source} declares an enhanced chart CLI stance without exactly one valid honesty tier`,
      );
    }
    return;
  }
  if (Object.keys(cli).length !== 1) {
    throw new Error(
      `${source} declares chart CLI facts beyond its description stance`,
    );
  }
}

/** Family enrolment facts for the built-in chart kind set. */
export function chartKindFamily(root: URL): KindFamilyConfig {
  return {
    word: "chart",
    typeName: "Chart",
    kindRoot: root,
    budgetRemedies: CHART_BUDGET_REMEDIES,
    releasePostures: CHART_RELEASE_POSTURES,
    cliStances: ["description", "enhanced"],
    validateCliMeta: validateChartCliMeta,
    authorGuideCliLine: (cli) => {
      if (cli.stance !== "enhanced") return `CLI stance: ${cli.stance}.`;
      const honesty = (cli as Record<string, unknown>).honesty;
      if (typeof honesty !== "string") {
        throw new Error("enhanced chart CLI Metadata has no honesty tier");
      }
      return `CLI stance: enhanced; honesty tier: ${honesty}.`;
    },
    authorGuideAppendix: [
      "## Refused forms",
      "",
      ...CHART_REFUSED_FORMS.map(({ form, remedy }) => `- ${form} — ${remedy}`),
      "",
    ],
    cli: {
      moduleStance: "enhanced",
      registryFile: "chart-cli-registry.ts",
      contractsModule: "../cli/chart-kinds.ts",
    },
    generatedFiles: {
      spec: "chart-spec.ts",
      metadata: "chart-metadata.ts",
      registry: "chart-registry.ts",
      dispatch: "chart-dispatch.ts",
      exports: "chart-exports.ts",
    },
    modules: {
      kindMeta: "../chart/kind-meta.ts",
      errors: "../chart/errors.ts",
      conformance: "../chart/conformance.ts",
      validation: "../chart/validation.ts",
      scene: "../chart/scene.ts",
    },
  };
}

/** Canonical source anatomy discovered for one chart kind. */
export interface ChartKindSource extends KindFamilySource {
  readonly meta: ChartKindMeta;
}

/** Discover chart kinds and reject every incomplete or ambiguous anatomy. */
export async function loadChartKindSources(
  root: URL = CHART_KIND_ROOT,
): Promise<ChartKindSource[]> {
  return await loadKindFamilySources(
    chartKindFamily(root),
  ) as ChartKindSource[];
}

/** Generated source family proving one canonical chart-kind set. */
export type GeneratedChartSources = GeneratedKindFamilySources & {
  readonly cliRegistry: string;
};

/** Render every chart-kind consumer from one discovered source inventory. */
export async function generateChartKindSources(
  root: URL = CHART_KIND_ROOT,
): Promise<GeneratedChartSources> {
  const family = chartKindFamily(root);
  const generated = await generateKindFamilySources(family, GENERATED_ROOT);
  return { ...generated, cliRegistry: requiredCliRegistry(family, generated) };
}

/** The generated CLI registry a shipped-surface family always carries. */
function requiredCliRegistry(
  family: KindFamilyConfig,
  generated: GeneratedKindFamilySources,
): string {
  if (family.cli === undefined || generated.cliRegistry === undefined) {
    throw new Error(
      `${family.word} family generation produced no CLI registry`,
    );
  }
  return generated.cliRegistry;
}

/** Discover diagram kinds and reject every incomplete or ambiguous anatomy. */
export async function loadDiagramKindSources(
  root: URL = DIAGRAM_KIND_ROOT,
): Promise<DiagramKindSource[]> {
  return await loadKindFamilySources(
    diagramKindFamily(root),
  ) as DiagramKindSource[];
}

/** Decoded Component-owned class names recorded in the generated registry. */
export function componentOwnedClassNames(
  source: string,
): `discern-${string}`[] {
  return cssClassNames(source).filter(
    (name): name is `discern-${string}` => name.startsWith("discern-"),
  );
}

function cssTokenNames(source: string): `--discern-${string}`[] {
  return [
    ...new Set(
      [...source.matchAll(/(?<![-_a-zA-Z0-9])(--discern-[_a-zA-Z0-9-]+)/g)]
        .map((match) => match[1] as `--discern-${string}`),
    ),
  ].toSorted();
}

function implementationDependencies(
  source: string,
  implementationUrl: URL,
  components: readonly ComponentSource[],
): string[] {
  const dependencies = new Set<string>();
  for (
    const match of source.matchAll(
      /(?:from\s+|import\s*)["']([^"']+\.tsx)["']/g,
    )
  ) {
    const specifier = match[1];
    if (specifier === undefined) continue;
    const target = new URL(specifier, implementationUrl).href;
    const dependency = components.find((component) =>
      component.implementationUrl.href === target
    );
    if (dependency !== undefined) dependencies.add(dependency.meta.slug);
  }
  const canonical = new Map(
    components.map((component, index) => [component.meta.slug, index]),
  );
  return [...dependencies].toSorted((a, b) =>
    (canonical.get(a) ?? 0) - (canonical.get(b) ?? 0)
  );
}

async function generateComponentRegistry(): Promise<string> {
  const components = await loadComponentSources();
  const imports: string[] = [
    'import type { ComponentRegistryEntry } from "../registry-types.ts";',
  ];
  const entries: string[] = [];
  for (const [index, component] of components.entries()) {
    imports.push(
      `import meta${index} from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, component.metaUrl))
      };`,
    );
    const css = await Deno.readTextFile(component.cssUrl);
    const implementation = await Deno.readTextFile(component.implementationUrl);
    entries.push(`  {
    meta: meta${index},
    css: ${JSON.stringify(css)},
    dependencies: ${
      JSON.stringify(
        implementationDependencies(
          implementation,
          component.implementationUrl,
          components,
        ),
      )
    },
    behaviors: ${JSON.stringify(component.meta.behaviors ?? [])},
    ownedClasses: ${JSON.stringify(componentOwnedClassNames(css))},
    publicTokenNames: ${JSON.stringify(cssTokenNames(css))},
  },`);
  }
  return `/* Generated by scripts/generate.ts. Do not edit. */
${imports.join("\n")}

export const componentRegistry = [
${entries.join("\n")}
] satisfies readonly ComponentRegistryEntry[];
`;
}

async function generateBehaviorSources(): Promise<string> {
  const files = (await walk(BEHAVIOR_ROOT)).filter((url) =>
    url.pathname.endsWith(".js")
  );
  const sources = new Map(
    await Promise.all(files.map(async (url) =>
      [
        url.pathname.slice(url.pathname.lastIndexOf("/") + 1, -3),
        await Deno.readTextFile(url),
      ] as const
    )),
  );
  for (const behavior of componentBehaviors) {
    if (!sources.has(behavior)) {
      throw new Error(`Missing browser behavior source: ${behavior}`);
    }
  }
  for (const behavior of sources.keys()) {
    if (!componentBehaviors.some((candidate) => candidate === behavior)) {
      throw new Error(`Unknown browser behavior source: ${behavior}`);
    }
  }
  const entries = componentBehaviors.map((behavior) =>
    `  ${JSON.stringify(behavior)}: ${JSON.stringify(sources.get(behavior))},`
  );
  return `/* Generated by scripts/generate.ts. Do not edit. */
import type { ComponentBehavior } from "../types/component-meta.ts";

export const browserBehaviorSources = {
${entries.join("\n")}
} satisfies Readonly<Record<ComponentBehavior, string>>;
`;
}

async function generateReactModule(): Promise<string> {
  const components = await loadComponentSources();
  const exports = components.map((component) => {
    const modUrl = new URL("mod.ts", component.metaUrl);
    return `export * from ${
      JSON.stringify(relativeImport(GENERATED_ROOT, modUrl))
    };`;
  });
  return `/* Generated by scripts/generate.ts. Do not edit. */
${exports.join("\n")}
`;
}

async function generateCliRegistry(): Promise<string> {
  const components = await loadComponentSources();
  const entries = components.map((component) => {
    const stance = component.meta.cli;
    const value = stance.stance === "exempt"
      ? `{ stance: "exempt", reason: ${JSON.stringify(stance.reason)} }`
      : `{ stance: "rendered", modulePath: ${
        JSON.stringify(relativeImport(GENERATED_ROOT, component.cliUrl))
      } }`;
    return `  ${JSON.stringify(component.meta.slug)}: ${value},`;
  });
  return `/* Generated by scripts/generate.ts. Do not edit. */
import type { CliComponentRegistryEntry } from "../cli/contracts.ts";

/** Generated CLI stance and renderer-module facts keyed by component slug. */
export const cliComponentRegistry = {
${entries.join("\n")}
} as const satisfies Readonly<Record<string, CliComponentRegistryEntry>>;
`;
}

async function generateCliRenderers(): Promise<string> {
  const rendered = (await loadComponentSources()).filter((component) =>
    component.meta.cli.stance === "rendered"
  );
  const exports = rendered.flatMap((component) => {
    const pascal = pascalIdentifier(component.meta.slug);
    const camel = camelIdentifier(component.meta.slug);
    const path = JSON.stringify(
      relativeImport(GENERATED_ROOT, component.cliUrl),
    );
    return [
      `export { default as render${pascal}Cli, cliExamples as ${camel}CliExamples } from ${path};`,
      `export type { ${pascal}CliProps } from ${path};`,
    ];
  });
  return `/* Generated by scripts/generate.ts. Do not edit. */
${exports.join("\n")}
`;
}

/** Generated source family proving one canonical diagram-kind set. */
export type GeneratedDiagramSources = GeneratedKindFamilySources & {
  readonly cliRegistry: string;
};

/** Render every diagram-kind consumer from one discovered source inventory. */
export async function generateDiagramKindSources(
  root: URL = DIAGRAM_KIND_ROOT,
): Promise<GeneratedDiagramSources> {
  const family = diagramKindFamily(root);
  const generated = await generateKindFamilySources(family, GENERATED_ROOT);
  return { ...generated, cliRegistry: requiredCliRegistry(family, generated) };
}

function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(offset, offset + 32_768)),
    );
  }
  return btoa(chunks.join(""));
}

function mediaType(path: string): string {
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

async function assetFiles(
  selection: EmbeddedRuntimeAsset["selection"],
  roots: readonly string[],
): Promise<EmbeddedRuntimeAsset[]> {
  const urls: URL[] = [];
  for (const root of roots) {
    const url = new URL(root, ASSET_ROOT);
    const info = await Deno.stat(url);
    if (info.isDirectory) urls.push(...await walk(url));
    else urls.push(url);
  }
  const assets: EmbeddedRuntimeAsset[] = [];
  for (const url of urls) {
    const path = decodeURIComponent(url.pathname).slice(
      decodeURIComponent(ASSET_ROOT.pathname).length,
    );
    const text = path.endsWith(".css") || path.endsWith(".txt");
    assets.push({
      selection,
      path,
      mediaType: mediaType(path),
      encoding: text ? "utf8" : "base64",
      contents: text
        ? await Deno.readTextFile(url)
        : encodeBase64(await Deno.readFile(url)),
    });
  }
  return assets.toSorted((a, b) => a.path.localeCompare(b.path));
}

async function generateAssets(): Promise<string> {
  const assets = [
    ...await assetFiles("fonts", ["fonts.css", "fonts/", "licenses/"]),
    ...await assetFiles("grain", ["grain.css", "textures/"]),
  ];
  const entries = assets.map((asset) => `  ${JSON.stringify(asset)},`).join(
    "\n",
  );
  return `/* Generated by scripts/generate.ts. Do not edit. */
import type { EmbeddedRuntimeAsset } from "../runtime-assets.ts";

export const embeddedRuntimeAssets = [
${entries}
] satisfies readonly EmbeddedRuntimeAsset[];
`;
}

async function generateBaseStyles(): Promise<string> {
  const foundation = await Deno.readTextFile(
    new URL("foundation.css", STYLE_ROOT),
  );
  const utilities = await Deno.readTextFile(
    new URL("utilities.css", STYLE_ROOT),
  );
  return `/* Generated by scripts/generate.ts. Do not edit. */
export const foundationCss: string = ${JSON.stringify(foundation)};

export const utilitiesCss: string = ${JSON.stringify(utilities)};
`;
}

/** Generate the stable source modules used by cached package consumers. */
export async function generateSources(): Promise<GeneratedSources> {
  const diagrams = await generateDiagramKindSources();
  const charts = await generateChartKindSources();
  return {
    registry: await generateComponentRegistry(),
    assets: await generateAssets(),
    behaviors: await generateBehaviorSources(),
    react: await generateReactModule(),
    cliRegistry: await generateCliRegistry(),
    cliRenderers: await generateCliRenderers(),
    baseStyles: await generateBaseStyles(),
    diagramMetadata: diagrams.metadata,
    diagramRegistry: diagrams.registry,
    diagramSpec: diagrams.spec,
    diagramDispatch: diagrams.dispatch,
    diagramExports: diagrams.exports,
    diagramCliRegistry: diagrams.cliRegistry,
    chartMetadata: charts.metadata,
    chartRegistry: charts.registry,
    chartSpec: charts.spec,
    chartDispatch: charts.dispatch,
    chartExports: charts.exports,
    chartCliRegistry: charts.cliRegistry,
  };
}

/** Refresh generated modules after component metadata, CSS, or assets change. */
export async function writeGeneratedSources(): Promise<void> {
  const generated = await generateSources();
  const diagramFamily = diagramKindFamily(DIAGRAM_KIND_ROOT);
  const diagramFiles = diagramFamily.generatedFiles;
  await Deno.mkdir(GENERATED_ROOT, { recursive: true });
  await Deno.writeTextFile(
    new URL("component-registry.ts", GENERATED_ROOT),
    generated.registry,
  );
  await Deno.writeTextFile(
    new URL("assets.ts", GENERATED_ROOT),
    generated.assets,
  );
  await Deno.writeTextFile(
    new URL("behaviors.ts", GENERATED_ROOT),
    generated.behaviors,
  );
  await Deno.writeTextFile(
    new URL("react.ts", GENERATED_ROOT),
    generated.react,
  );
  await Deno.writeTextFile(
    new URL("cli-registry.ts", GENERATED_ROOT),
    generated.cliRegistry,
  );
  await Deno.writeTextFile(
    new URL("cli-renderers.ts", GENERATED_ROOT),
    generated.cliRenderers,
  );
  await Deno.writeTextFile(
    new URL("base-styles.ts", GENERATED_ROOT),
    generated.baseStyles,
  );
  await Deno.writeTextFile(
    new URL(diagramFiles.metadata, GENERATED_ROOT),
    generated.diagramMetadata,
  );
  await Deno.writeTextFile(
    new URL(diagramFiles.registry, GENERATED_ROOT),
    generated.diagramRegistry,
  );
  await Deno.writeTextFile(
    new URL(diagramFiles.spec, GENERATED_ROOT),
    generated.diagramSpec,
  );
  await Deno.writeTextFile(
    new URL(diagramFiles.dispatch, GENERATED_ROOT),
    generated.diagramDispatch,
  );
  await Deno.writeTextFile(
    new URL(diagramFiles.exports, GENERATED_ROOT),
    generated.diagramExports,
  );
  if (diagramFamily.cli !== undefined) {
    await Deno.writeTextFile(
      new URL(diagramFamily.cli.registryFile, GENERATED_ROOT),
      generated.diagramCliRegistry,
    );
  }
  const chartFamily = chartKindFamily(CHART_KIND_ROOT);
  const chartFiles = chartFamily.generatedFiles;
  await Deno.writeTextFile(
    new URL(chartFiles.metadata, GENERATED_ROOT),
    generated.chartMetadata,
  );
  await Deno.writeTextFile(
    new URL(chartFiles.registry, GENERATED_ROOT),
    generated.chartRegistry,
  );
  await Deno.writeTextFile(
    new URL(chartFiles.spec, GENERATED_ROOT),
    generated.chartSpec,
  );
  await Deno.writeTextFile(
    new URL(chartFiles.dispatch, GENERATED_ROOT),
    generated.chartDispatch,
  );
  await Deno.writeTextFile(
    new URL(chartFiles.exports, GENERATED_ROOT),
    generated.chartExports,
  );
  if (chartFamily.cli !== undefined) {
    await Deno.writeTextFile(
      new URL(chartFamily.cli.registryFile, GENERATED_ROOT),
      generated.chartCliRegistry,
    );
  }
}

if (import.meta.main) await writeGeneratedSources();
