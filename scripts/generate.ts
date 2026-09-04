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
import type { ComponentExampleDefinition } from "../src/types/component-examples.ts";
import {
  componentExamplesForSurface,
  resolveComponentExampleVocabulary,
  validateComponentExampleImplementations,
} from "../src/types/component-examples.ts";
import {
  renderComponentAuthorEvals,
  renderComponentAuthorSmokeEvals,
} from "./component-author-evals.ts";
import {
  type ComponentAuthorGuideSource,
  renderComponentAuthorGuide,
} from "./component-author-guide.ts";
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
const SCRIPT_GENERATED_ROOT = new URL("./generated/", import.meta.url);
const SKILL_EVALS_ROOT = new URL(
  "../skills/use-discern-design-system/evals/",
  import.meta.url,
);
const CODEGEN_LOCK = new URL(
  "../node_modules/.cache/discern-design-system-codegen.lock",
  import.meta.url,
);
const STYLE_ROOT = new URL("../src/styles/", import.meta.url);
const DIAGRAM_KIND_ROOT = new URL("../src/diagram/kinds/", import.meta.url);
const CHART_KIND_ROOT = new URL("../src/chart/kinds/", import.meta.url);

export interface ComponentSource {
  readonly metaUrl: URL;
  readonly implementationUrl: URL;
  readonly cssUrl: URL;
  readonly examplesUrl: URL;
  readonly cliUrl: URL;
  readonly meta: ComponentMeta;
  readonly exampleVocabulary: readonly ComponentExampleDefinition[];
}

export interface GeneratedSources {
  readonly registry: string;
  readonly componentMetadata: string;
  readonly componentAuthorEvals: string;
  readonly componentAuthorSmokeEvals: string;
  readonly assets: string;
  readonly behaviors: string;
  readonly react: string;
  readonly cliRegistry: string;
  readonly cliRenderers: string;
  readonly componentExamples: string;
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

/** One text artifact wholly owned by codegen. */
export interface GeneratedOutput {
  readonly target: URL;
  readonly source: string;
}

/** The complete directory roots whose contents codegen owns. */
export const GENERATED_OUTPUT_ROOTS = [
  GENERATED_ROOT,
  SCRIPT_GENERATED_ROOT,
  SKILL_EVALS_ROOT,
] as const;

/** Changes made while reconciling one generated output plan. */
export interface GeneratedReconciliation {
  readonly removed: readonly URL[];
  readonly written: readonly URL[];
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

function exampleImplementationIds(
  value: unknown,
  key: "id" | "name",
  source: string,
  exportName: "catalogueExamples" | "cliExamples",
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${source} must export ${exportName} as an array`);
  }
  return value.map((candidate, index) => {
    if (typeof candidate !== "object" || candidate === null) {
      throw new TypeError(
        `${source} ${exportName}[${index}] must be an object`,
      );
    }
    const id = (candidate as Readonly<Record<string, unknown>>)[key];
    if (typeof id !== "string") {
      throw new TypeError(
        `${source} ${exportName}[${index}] needs a string ${key}`,
      );
    }
    return id;
  });
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
    const examplesUrl = new URL(
      metaUrl.pathname.replace(/\.meta\.ts$/, ".examples.tsx"),
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
    if (!fileSet.has(examplesUrl.pathname)) {
      throw new Error(`Missing examples for ${metaUrl.pathname}`);
    }
    const module = await import(metaUrl.href) as {
      default: ComponentMeta;
      componentExampleVocabulary?: unknown;
    };
    validateCliStance(
      module.default,
      fileSet.has(cliUrl.pathname),
      decodeURIComponent(metaUrl.pathname),
    );
    if (!Array.isArray(module.componentExampleVocabulary)) {
      throw new Error(
        `${
          decodeURIComponent(metaUrl.pathname)
        } must export componentExampleVocabulary`,
      );
    }
    const exampleVocabulary = module
      .componentExampleVocabulary as readonly ComponentExampleDefinition[];
    componentExamplesForSurface(module.default, exampleVocabulary, "web");
    componentExamplesForSurface(module.default, exampleVocabulary, "cli");
    const examplesModule = await import(examplesUrl.href) as Readonly<
      Record<string, unknown>
    >;
    validateComponentExampleImplementations(
      module.default,
      exampleVocabulary,
      "web",
      exampleImplementationIds(
        examplesModule.catalogueExamples,
        "id",
        decodeURIComponent(examplesUrl.pathname),
        "catalogueExamples",
      ),
      decodeURIComponent(examplesUrl.pathname),
    );
    if (module.default.cli.stance === "rendered") {
      const cliModule = await import(cliUrl.href) as Readonly<
        Record<string, unknown>
      >;
      validateComponentExampleImplementations(
        module.default,
        exampleVocabulary,
        "cli",
        exampleImplementationIds(
          cliModule.cliExamples,
          "name",
          decodeURIComponent(cliUrl.pathname),
          "cliExamples",
        ),
        decodeURIComponent(cliUrl.pathname),
      );
    }
    sources.push({
      metaUrl,
      implementationUrl,
      cssUrl,
      examplesUrl,
      cliUrl,
      meta: module.default,
      exampleVocabulary,
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

/** The Metadata and resolved examples the author guide and its eval set read. */
function componentAuthorGuideSource(
  component: ComponentSource,
): ComponentAuthorGuideSource {
  return {
    meta: component.meta,
    examples: resolveComponentExampleVocabulary(
      component.meta,
      component.exampleVocabulary,
    ),
  };
}

async function generateComponentAuthorEvals(): Promise<string> {
  const components = await loadComponentSources();
  return renderComponentAuthorEvals(components.map(componentAuthorGuideSource));
}

async function generateComponentAuthorSmokeEvals(): Promise<string> {
  const components = await loadComponentSources();
  return renderComponentAuthorSmokeEvals(
    components.map(componentAuthorGuideSource),
  );
}

async function generateComponentMetadata(): Promise<string> {
  const components = await loadComponentSources();
  const imports = [
    'import type { ComponentMeta } from "../types/component-meta.ts";',
  ];
  const entries: string[] = [];
  components.forEach((component, index) => {
    imports.push(
      `import meta${index} from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, component.metaUrl))
      };`,
    );
    entries.push(`  meta${index},`);
  });
  const guide = renderComponentAuthorGuide(
    components.map(componentAuthorGuideSource),
  );
  return `/* Generated by scripts/generate.ts. Do not edit. */
${imports.join("\n")}

/** Canonical public Metadata for every built-in Component, in Catalogue order. */
export const componentMetadata = [
${entries.join("\n")}
] satisfies readonly ComponentMeta[];

/** Generated Markdown guidance derived from Component Metadata. */
export const componentAuthorGuide = ${JSON.stringify(guide)};
`;
}

async function bundleBehaviorModule(
  url: URL,
  stack = new Set<string>(),
): Promise<string> {
  if (stack.has(url.href)) {
    throw new Error(`Browser behavior import cycle at ${url.pathname}`);
  }
  const nextStack = new Set(stack).add(url.href);
  let source = await Deno.readTextFile(url);
  const importPattern = /import\s*\{[^}]+\}\s*from\s*(["'])([^"']+)\1;\s*/u;
  while (true) {
    const match = source.match(importPattern);
    if (match === null) break;
    const specifier = match[2];
    if (specifier === undefined || !specifier.startsWith(".")) {
      throw new Error(
        `${url.pathname} browser behavior imports a non-relative module`,
      );
    }
    const dependencyUrl = new URL(specifier, url);
    if (!dependencyUrl.pathname.endsWith(".js")) {
      throw new Error(
        `${url.pathname} browser behavior imports a non-JavaScript module`,
      );
    }
    const dependency = await bundleBehaviorModule(dependencyUrl, nextStack);
    source = source.replace(match[0], `${dependency}\n`);
  }
  source = source.replace(
    /^export\s+(?=(?:const|function|class)\b)/gmu,
    "",
  );
  if (/^\s*(?:import|export)\b/mu.test(source)) {
    throw new Error(
      `${url.pathname} browser behavior contains an unsupported module declaration`,
    );
  }
  return source;
}

async function minifyBehaviorSource(source: string): Promise<string> {
  const entry = await Deno.makeTempFile({ suffix: ".js" });
  try {
    await Deno.writeTextFile(entry, source);
    const result = await new Deno.Command("deno", {
      args: ["bundle", "--minify", entry],
      stdout: "piped",
      stderr: "piped",
    }).output();
    if (!result.success) {
      throw new Error(
        `Browser behavior minification failed: ${
          new TextDecoder().decode(result.stderr).trim()
        }`,
      );
    }
    return new TextDecoder().decode(result.stdout).trim();
  } finally {
    await Deno.remove(entry);
  }
}

async function generateBehaviorSources(): Promise<string> {
  const files = (await walk(BEHAVIOR_ROOT)).filter((url) =>
    url.pathname.endsWith(".js")
  );
  const sources = new Map(
    await Promise.all(files.map(async (url) =>
      [
        url.pathname.slice(url.pathname.lastIndexOf("/") + 1, -3),
        `{${await minifyBehaviorSource(await bundleBehaviorModule(url))}}`,
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

async function generateComponentExamples(): Promise<string> {
  const components = await loadComponentSources();
  const entries = components.map((component) => {
    const value = JSON.stringify(
      resolveComponentExampleVocabulary(
        component.meta,
        component.exampleVocabulary,
      ),
      null,
      2,
    ).replaceAll("\n", "\n  ");
    return `  ${JSON.stringify(component.meta.slug)}: ${value},`;
  });
  const source = `/* Generated by scripts/generate.ts. Do not edit. */
import type { ResolvedComponentExampleDefinition } from "../../src/types/component-examples.ts";

/** Canonical Component example facts for repository-owned review tooling. */
export const componentExampleRegistry = {
${entries.join("\n")}
} as const satisfies Readonly<Record<string, readonly ResolvedComponentExampleDefinition[]>>;
`;
  const command = new Deno.Command("deno", {
    args: ["fmt", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(source));
  await writer.close();
  const result = await child.output();
  if (!result.success) {
    throw new Error(
      `deno fmt failed for the generated Component example registry:\n${
        new TextDecoder().decode(result.stderr)
      }`,
    );
  }
  return new TextDecoder().decode(result.stdout);
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
    componentMetadata: await generateComponentMetadata(),
    componentAuthorEvals: await generateComponentAuthorEvals(),
    componentAuthorSmokeEvals: await generateComponentAuthorSmokeEvals(),
    assets: await generateAssets(),
    behaviors: await generateBehaviorSources(),
    react: await generateReactModule(),
    cliRegistry: await generateCliRegistry(),
    cliRenderers: await generateCliRenderers(),
    componentExamples: await generateComponentExamples(),
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

/** Build the one complete plan for every committed codegen artifact. */
export async function generateOutputPlan(): Promise<
  readonly GeneratedOutput[]
> {
  const generated = await generateSources();
  const diagramFamily = diagramKindFamily(DIAGRAM_KIND_ROOT);
  const diagramFiles = diagramFamily.generatedFiles;
  const outputs: GeneratedOutput[] = [
    {
      target: new URL("component-registry.ts", GENERATED_ROOT),
      source: generated.registry,
    },
    {
      target: new URL("component-metadata.ts", GENERATED_ROOT),
      source: generated.componentMetadata,
    },
    {
      target: new URL("assets.ts", GENERATED_ROOT),
      source: generated.assets,
    },
    {
      target: new URL("behaviors.ts", GENERATED_ROOT),
      source: generated.behaviors,
    },
    {
      target: new URL("react.ts", GENERATED_ROOT),
      source: generated.react,
    },
    {
      target: new URL("cli-registry.ts", GENERATED_ROOT),
      source: generated.cliRegistry,
    },
    {
      target: new URL("cli-renderers.ts", GENERATED_ROOT),
      source: generated.cliRenderers,
    },
    {
      target: new URL("component-examples.ts", SCRIPT_GENERATED_ROOT),
      source: generated.componentExamples,
    },
    {
      target: new URL("base-styles.ts", GENERATED_ROOT),
      source: generated.baseStyles,
    },
    {
      target: new URL("evals.json", SKILL_EVALS_ROOT),
      source: generated.componentAuthorEvals,
    },
    {
      target: new URL("smoke.json", SKILL_EVALS_ROOT),
      source: generated.componentAuthorSmokeEvals,
    },
    {
      target: new URL(diagramFiles.metadata, GENERATED_ROOT),
      source: generated.diagramMetadata,
    },
    {
      target: new URL(diagramFiles.registry, GENERATED_ROOT),
      source: generated.diagramRegistry,
    },
    {
      target: new URL(diagramFiles.spec, GENERATED_ROOT),
      source: generated.diagramSpec,
    },
    {
      target: new URL(diagramFiles.dispatch, GENERATED_ROOT),
      source: generated.diagramDispatch,
    },
    {
      target: new URL(diagramFiles.exports, GENERATED_ROOT),
      source: generated.diagramExports,
    },
  ];
  if (diagramFamily.cli !== undefined) {
    outputs.push({
      target: new URL(diagramFamily.cli.registryFile, GENERATED_ROOT),
      source: generated.diagramCliRegistry,
    });
  }
  const chartFamily = chartKindFamily(CHART_KIND_ROOT);
  const chartFiles = chartFamily.generatedFiles;
  outputs.push(
    {
      target: new URL(chartFiles.metadata, GENERATED_ROOT),
      source: generated.chartMetadata,
    },
    {
      target: new URL(chartFiles.registry, GENERATED_ROOT),
      source: generated.chartRegistry,
    },
    {
      target: new URL(chartFiles.spec, GENERATED_ROOT),
      source: generated.chartSpec,
    },
    {
      target: new URL(chartFiles.dispatch, GENERATED_ROOT),
      source: generated.chartDispatch,
    },
    {
      target: new URL(chartFiles.exports, GENERATED_ROOT),
      source: generated.chartExports,
    },
  );
  if (chartFamily.cli !== undefined) {
    outputs.push({
      target: new URL(chartFamily.cli.registryFile, GENERATED_ROOT),
      source: generated.chartCliRegistry,
    });
  }
  return outputs;
}

interface PlannedRemoval {
  readonly recursive: boolean;
  readonly target: URL;
}

interface GeneratedReconciliationPlan {
  readonly directories: readonly URL[];
  readonly removals: readonly PlannedRemoval[];
  readonly writes: readonly GeneratedOutput[];
}

function generatedChildUrl(
  directory: URL,
  name: string,
  isDirectory: boolean,
): URL {
  return new URL(
    `${encodeURIComponent(name)}${isDirectory ? "/" : ""}`,
    directory,
  );
}

function validateGeneratedPlan(
  roots: readonly URL[],
  outputs: readonly GeneratedOutput[],
): ReadonlyMap<string, ReadonlyMap<string, GeneratedOutput>> {
  const rootHrefs = new Set<string>();
  for (const root of roots) {
    if (
      root.protocol !== "file:" || !root.pathname.endsWith("/") ||
      root.search !== "" || root.hash !== ""
    ) {
      throw new TypeError(
        `Generated root must be an unadorned file directory URL: ${root.href}`,
      );
    }
    if (rootHrefs.has(root.href)) {
      throw new Error(`Duplicate generated root: ${root.href}`);
    }
    rootHrefs.add(root.href);
  }
  for (const left of roots) {
    for (const right of roots) {
      if (left !== right && right.href.startsWith(left.href)) {
        throw new Error(
          `Generated roots must not overlap: ${left.href} and ${right.href}`,
        );
      }
    }
  }

  const byRoot = new Map<string, Map<string, GeneratedOutput>>(
    roots.map((root) => [root.href, new Map()]),
  );
  const outputHrefs = new Set<string>();
  for (const output of outputs) {
    if (
      output.target.protocol !== "file:" ||
      output.target.pathname.endsWith("/") || output.target.search !== "" ||
      output.target.hash !== ""
    ) {
      throw new TypeError(
        `Generated output must be an unadorned file URL: ${output.target.href}`,
      );
    }
    if (outputHrefs.has(output.target.href)) {
      throw new Error(`Duplicate generated output: ${output.target.href}`);
    }
    outputHrefs.add(output.target.href);
    const root = roots.find((candidate) =>
      output.target.href.startsWith(candidate.href)
    );
    if (root === undefined) {
      throw new Error(
        `Generated output is outside every generated root: ${output.target.href}`,
      );
    }
    byRoot.get(root.href)?.set(
      output.target.href.slice(root.href.length),
      output,
    );
  }
  return byRoot;
}

function generatedDirectories(
  root: URL,
  expected: ReadonlyMap<string, GeneratedOutput>,
): ReadonlyMap<string, URL> {
  const directories = new Map<string, URL>([["", root]]);
  for (const relative of expected.keys()) {
    const segments = relative.split("/");
    segments.pop();
    let current = "";
    for (const segment of segments) {
      current = `${current}${segment}/`;
      directories.set(current, new URL(current, root));
    }
  }
  return directories;
}

async function pathKind(
  target: URL,
): Promise<"directory" | "missing" | "other"> {
  try {
    const info = await Deno.lstat(target);
    return info.isDirectory && !info.isSymlink ? "directory" : "other";
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return "missing";
    throw error;
  }
}

async function observeGeneratedDirectory(
  directory: URL,
  prefix: string,
  expected: ReadonlyMap<string, GeneratedOutput>,
  expectedDirectories: ReadonlyMap<string, URL>,
  removals: PlannedRemoval[],
  satisfied: Set<string>,
): Promise<void> {
  const entries = [];
  for await (const entry of Deno.readDir(directory)) entries.push(entry);
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const child = generatedChildUrl(
      directory,
      entry.name,
      entry.isDirectory,
    );
    const relative = `${prefix}${encodeURIComponent(entry.name)}`;
    if (entry.isDirectory) {
      if (expectedDirectories.has(`${relative}/`)) {
        await observeGeneratedDirectory(
          child,
          `${relative}/`,
          expected,
          expectedDirectories,
          removals,
          satisfied,
        );
      } else {
        removals.push({ target: child, recursive: true });
      }
      continue;
    }
    const output = expected.get(relative);
    if (!entry.isFile || output === undefined) {
      removals.push({ target: child, recursive: false });
      continue;
    }
    if (await Deno.readTextFile(child) === output.source) {
      satisfied.add(output.target.href);
    }
  }
}

async function planGeneratedReconciliation(
  roots: readonly URL[],
  outputs: readonly GeneratedOutput[],
): Promise<GeneratedReconciliationPlan> {
  const outputsByRoot = validateGeneratedPlan(roots, outputs);
  const removals: PlannedRemoval[] = [];
  const satisfied = new Set<string>();
  const directories = new Map<string, URL>();

  for (const root of roots) {
    const expected = outputsByRoot.get(root.href) ?? new Map();
    const expectedDirectories = generatedDirectories(root, expected);
    for (const directory of expectedDirectories.values()) {
      directories.set(directory.href, directory);
    }
    const rootKind = await pathKind(root);
    if (rootKind === "other") {
      removals.push({ target: root, recursive: false });
      continue;
    }
    if (rootKind === "missing") continue;
    await observeGeneratedDirectory(
      root,
      "",
      expected,
      expectedDirectories,
      removals,
      satisfied,
    );
  }

  return {
    directories: [...directories.values()].toSorted((left, right) =>
      left.href.length - right.href.length ||
      left.href.localeCompare(right.href)
    ),
    removals: removals.toSorted((left, right) =>
      right.target.href.length - left.target.href.length ||
      left.target.href.localeCompare(right.target.href)
    ),
    writes: outputs.filter((output) => !satisfied.has(output.target.href))
      .toSorted((left, right) =>
        left.target.href.localeCompare(right.target.href)
      ),
  };
}

async function writeGeneratedOutput(output: GeneratedOutput): Promise<void> {
  const directory = new URL("./", output.target);
  const temporary = new URL(
    `.discern-codegen-${crypto.randomUUID()}.tmp`,
    directory,
  );
  try {
    await Deno.writeTextFile(temporary, output.source, {
      createNew: true,
      mode: 0o666,
    });
    await Deno.rename(temporary, output.target);
  } catch (writeError) {
    try {
      await Deno.remove(temporary);
    } catch (cleanupError) {
      if (!(cleanupError instanceof Deno.errors.NotFound)) {
        throw new AggregateError(
          [writeError, cleanupError],
          `Generated output and temporary cleanup both failed: ${output.target.href}`,
        );
      }
    }
    throw writeError;
  }
}

/**
 * Make owned generated roots equal one complete plan. Hidden and ignored files
 * are ordinary unplanned entries, so system debris is removed without special
 * names and a later run automatically handles future variants.
 */
export async function reconcileGeneratedOutputs(
  roots: readonly URL[],
  outputs: readonly GeneratedOutput[],
): Promise<GeneratedReconciliation> {
  const plan = await planGeneratedReconciliation(roots, outputs);
  for (const removal of plan.removals) {
    await Deno.remove(removal.target, { recursive: removal.recursive });
  }
  for (const directory of plan.directories) {
    await Deno.mkdir(directory, { recursive: true });
  }
  for (const output of plan.writes) await writeGeneratedOutput(output);
  return {
    removed: plan.removals.map((removal) => removal.target),
    written: plan.writes.map((output) => output.target),
  };
}

async function withCodegenLock<T>(run: () => Promise<T>): Promise<T> {
  await Deno.mkdir(new URL("./", CODEGEN_LOCK), { recursive: true });
  const lock = await Deno.open(CODEGEN_LOCK, {
    create: true,
    read: true,
    write: true,
  });
  try {
    await lock.lock(true);
    return await run();
  } finally {
    await lock.unlock();
    lock.close();
  }
}

/** Refresh generated modules after component metadata, CSS, or assets change. */
export async function writeGeneratedSources(): Promise<void> {
  await withCodegenLock(async () => {
    await reconcileGeneratedOutputs(
      GENERATED_OUTPUT_ROOTS,
      await generateOutputPlan(),
    );
  });
}

if (import.meta.main) await writeGeneratedSources();
