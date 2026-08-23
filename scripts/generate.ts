import type { EmbeddedRuntimeAsset } from "../src/runtime-assets.ts";
import {
  DIAGRAM_RELEASE_POSTURES,
  type DiagramKindMeta,
} from "../src/diagram/kind-meta.ts";
import { DIAGRAM_BUDGET_REMEDIES } from "../src/diagram/errors.ts";
import {
  componentBehaviors,
  componentGroups,
  type ComponentMeta,
} from "../src/types/component-meta.ts";
import { cssClassNames } from "./css-syntax.ts";

const COMPONENT_ROOT = new URL("../src/components/", import.meta.url);
const ASSET_ROOT = new URL("../assets/", import.meta.url);
const BEHAVIOR_ROOT = new URL("../assets/behaviors/", import.meta.url);
const GENERATED_ROOT = new URL("../src/generated/", import.meta.url);
const STYLE_ROOT = new URL("../src/styles/", import.meta.url);
const DIAGRAM_KIND_ROOT = new URL("../src/diagram/kinds/", import.meta.url);

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
}

/** Canonical source anatomy discovered for one diagram kind. */
export interface DiagramKindSource {
  readonly directoryUrl: URL;
  readonly metaUrl: URL;
  readonly specUrl: URL;
  readonly validationUrl: URL;
  readonly layoutUrl: URL;
  readonly descriptionUrl: URL;
  readonly fixturesUrl: URL;
  readonly modUrl: URL;
  readonly cliUrl: URL;
  readonly meta: DiagramKindMeta;
}

type ComponentMetaCandidate =
  & Omit<ComponentMeta, "cli">
  & { readonly cli?: ComponentMeta["cli"] };

async function walk(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const url = new URL(entry.name + (entry.isDirectory ? "/" : ""), directory);
    if (entry.isDirectory) files.push(...await walk(url));
    else files.push(url);
  }
  return files.toSorted((a, b) => a.pathname.localeCompare(b.pathname));
}

function relativeImport(fromDirectory: URL, target: URL): string {
  const fromParts = decodeURIComponent(fromDirectory.pathname).split("/")
    .filter(Boolean);
  const toParts = decodeURIComponent(target.pathname).split("/").filter(
    Boolean,
  );
  while (fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }
  return `${"../".repeat(fromParts.length)}${toParts.join("/")}`;
}

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

function diagramSourceName(url: URL): string {
  return decodeURIComponent(url.pathname);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** Enforce complete authored guidance and measurable budgets for one kind. */
export function validateDiagramKindMeta(
  candidate: unknown,
  source: string,
): asserts candidate is DiagramKindMeta {
  if (typeof candidate !== "object" || candidate === null) {
    throw new Error(`${source} must default-export diagram kind Metadata`);
  }
  const meta = candidate as Record<string, unknown>;
  if (
    !nonEmptyString(meta.name) || !nonEmptyString(meta.slug) ||
    !/^[a-z][a-z0-9-]*$/u.test(meta.slug) ||
    !nonEmptyString(meta.description)
  ) {
    throw new Error(
      `${source} has incomplete diagram kind identity or description`,
    );
  }
  if (!Number.isInteger(meta.order) || (meta.order as number) < 0) {
    throw new Error(`${source} has no non-negative integer kind order`);
  }
  for (const field of ["useWhen", "notWhen"] as const) {
    const guidance = meta[field];
    if (
      !Array.isArray(guidance) || guidance.length === 0 ||
      guidance.some((item) => !nonEmptyString(item))
    ) {
      throw new Error(`${source} has incomplete ${field} authoring guidance`);
    }
  }
  if (
    typeof meta.budgets !== "object" || meta.budgets === null ||
    Array.isArray(meta.budgets) || Object.keys(meta.budgets).length === 0
  ) {
    throw new Error(`${source} has no measurable diagram kind budgets`);
  }
  for (
    const [dimension, value] of Object.entries(
      meta.budgets as Record<string, unknown>,
    )
  ) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`${source} has invalid ${dimension} budget Metadata`);
    }
    const budget = value as Record<string, unknown>;
    if (
      typeof budget.limit !== "number" || !Number.isFinite(budget.limit) ||
      budget.limit <= 0 || !nonEmptyString(budget.unit) ||
      !nonEmptyString(budget.description) ||
      !(DIAGRAM_BUDGET_REMEDIES as readonly string[]).includes(
        budget.remedy as string,
      )
    ) {
      throw new Error(`${source} has incomplete ${dimension} budget Metadata`);
    }
  }
  if (
    typeof meta.cli !== "object" || meta.cli === null ||
    !["description", "enhanced"].includes(
      (meta.cli as Record<string, unknown>).stance as string,
    )
  ) {
    throw new Error(`${source} has no valid diagram CLI stance`);
  }
}

/** Enforce the two-way relationship between kind stance and enhanced module. */
export function validateDiagramCliStance(
  meta: DiagramKindMeta,
  hasEnhancedModule: boolean,
  source: string,
): void {
  if (meta.cli.stance === "enhanced" && !hasEnhancedModule) {
    throw new Error(
      `${source} declares enhanced diagram CLI but has no .cli.ts file`,
    );
  }
  if (meta.cli.stance === "description" && hasEnhancedModule) {
    throw new Error(
      `${source} has a .cli.ts file but declares description-only CLI`,
    );
  }
}

/** Reject enhanced kind modules without their matching Metadata authority. */
export function validateDiagramCliInventory(files: readonly URL[]): void {
  const fileSet = new Set(files.map((url) => url.pathname));
  for (
    const cliUrl of files.filter((url) => url.pathname.endsWith(".cli.ts"))
  ) {
    const metaPath = cliUrl.pathname.replace(/\.cli\.ts$/u, ".meta.ts");
    if (!fileSet.has(metaPath)) {
      throw new Error(
        `${diagramSourceName(cliUrl)} has no matching diagram .meta.ts file`,
      );
    }
  }
}

/** Reject partial kind anatomy that lacks a Metadata enrolment authority. */
export function validateDiagramKindInventory(files: readonly URL[]): void {
  const fileSet = new Set(files.map((url) => url.pathname));
  for (const file of files.filter((url) => url.pathname.endsWith(".ts"))) {
    const directoryUrl = new URL("./", file);
    const stem = directoryUrl.pathname.split("/").filter(Boolean).at(-1);
    if (stem === undefined) continue;
    const metaUrl = new URL(`${stem}.meta.ts`, directoryUrl);
    if (!fileSet.has(metaUrl.pathname)) {
      throw new Error(
        `${diagramSourceName(file)} has no matching diagram .meta.ts file`,
      );
    }
    const fileName = file.pathname.slice(file.pathname.lastIndexOf("/") + 1);
    const allowed = new Set([
      `${stem}.meta.ts`,
      `${stem}.spec.ts`,
      `${stem}.validation.ts`,
      `${stem}.layout.ts`,
      `${stem}.description.ts`,
      `${stem}.fixtures.ts`,
      `${stem}.cli.ts`,
      "mod.ts",
    ]);
    if (!allowed.has(fileName)) {
      throw new Error(
        `${diagramSourceName(file)} is outside the fixed diagram kind anatomy`,
      );
    }
  }
}

async function assertDefaultExport(
  url: URL,
  expected: "function" | "array",
): Promise<void> {
  const module = await import(url.href) as { readonly default?: unknown };
  const valid = expected === "function"
    ? typeof module.default === "function"
    : Array.isArray(module.default);
  if (!valid) {
    throw new Error(
      `${diagramSourceName(url)} must default-export a ${expected}`,
    );
  }
}

function releaseRecord(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

function validateDiagramReleaseCorpus(
  value: unknown,
  fixtures: readonly unknown[],
  meta: DiagramKindMeta,
  source: string,
): void {
  const corpus = releaseRecord(
    value,
    `${source} must export one releaseCorpus object`,
  );
  if (corpus.kind !== meta.slug || !Array.isArray(corpus.cases)) {
    throw new Error(`${source} releaseCorpus must identify ${meta.slug}`);
  }
  const cases = corpus.cases;
  if (cases.length === 0) {
    throw new Error(`${source} releaseCorpus must contain valid cases`);
  }
  const observed = new Set<string>();
  const specs: unknown[] = [];
  for (const [index, value] of cases.entries()) {
    const entry = releaseRecord(
      value,
      `${source} release case ${index} must be an object`,
    );
    if (!nonEmptyString(entry.name) || !Array.isArray(entry.postures)) {
      throw new Error(
        `${source} release case ${index} has no posture identity`,
      );
    }
    for (const posture of entry.postures) {
      if (!DIAGRAM_RELEASE_POSTURES.includes(posture as never)) {
        throw new Error(`${source} release case ${index} has unknown posture`);
      }
      observed.add(posture as string);
    }
    specs.push(entry.spec);
  }
  for (const posture of DIAGRAM_RELEASE_POSTURES) {
    if (!observed.has(posture)) {
      throw new Error(`${source} releaseCorpus is missing ${posture} posture`);
    }
  }
  if (
    fixtures.length !== specs.length ||
    fixtures.some((fixture, index) => fixture !== specs[index])
  ) {
    throw new Error(
      `${source} default fixtures must derive from releaseCorpus cases`,
    );
  }
  const refusal = releaseRecord(
    corpus.overBudget,
    `${source} releaseCorpus must contain one overBudget refusal`,
  );
  if (
    typeof refusal.dimension !== "string" ||
    meta.budgets[refusal.dimension] === undefined ||
    refusal.authorAction !== meta.budgets[refusal.dimension]?.remedy ||
    refusal.spec === undefined
  ) {
    throw new Error(
      `${source} overBudget refusal must match one Metadata dimension and remedy`,
    );
  }
  if (!Array.isArray(corpus.invalid) || corpus.invalid.length === 0) {
    throw new Error(`${source} releaseCorpus must contain invalid cases`);
  }
  for (const [index, value] of corpus.invalid.entries()) {
    const invalid = releaseRecord(
      value,
      `${source} invalid release case ${index} must be an object`,
    );
    if (
      !nonEmptyString(invalid.name) || !nonEmptyString(invalid.code) ||
      invalid.spec === undefined
    ) {
      throw new Error(`${source} invalid release case ${index} is incomplete`);
    }
  }
}

/** Discover diagram kinds and reject every incomplete or ambiguous anatomy. */
export async function loadDiagramKindSources(
  root: URL = DIAGRAM_KIND_ROOT,
): Promise<DiagramKindSource[]> {
  const files = await walk(root);
  const fileSet = new Set(files.map((url) => url.pathname));
  validateDiagramCliInventory(files);
  validateDiagramKindInventory(files);
  const sources: DiagramKindSource[] = [];
  for (
    const metaUrl of files.filter((url) => url.pathname.endsWith(".meta.ts"))
  ) {
    const fileName = metaUrl.pathname.slice(
      metaUrl.pathname.lastIndexOf("/") + 1,
    );
    const stem = fileName.slice(0, -".meta.ts".length);
    const directoryUrl = new URL("./", metaUrl);
    const directoryName = directoryUrl.pathname.split("/").filter(Boolean).at(
      -1,
    );
    if (directoryName !== stem) {
      throw new Error(
        `${diagramSourceName(metaUrl)} must match its kind directory name`,
      );
    }
    const urls = {
      specUrl: new URL(`${stem}.spec.ts`, directoryUrl),
      validationUrl: new URL(`${stem}.validation.ts`, directoryUrl),
      layoutUrl: new URL(`${stem}.layout.ts`, directoryUrl),
      descriptionUrl: new URL(`${stem}.description.ts`, directoryUrl),
      fixturesUrl: new URL(`${stem}.fixtures.ts`, directoryUrl),
      modUrl: new URL("mod.ts", directoryUrl),
      cliUrl: new URL(`${stem}.cli.ts`, directoryUrl),
    };
    for (
      const [surface, url] of Object.entries(urls).filter(([name]) =>
        name !== "cliUrl"
      )
    ) {
      if (!fileSet.has(url.pathname)) {
        throw new Error(
          `${diagramSourceName(metaUrl)} is missing required ${surface}`,
        );
      }
    }
    const module = await import(metaUrl.href) as { readonly default?: unknown };
    validateDiagramKindMeta(module.default, diagramSourceName(metaUrl));
    if (module.default.slug !== stem) {
      throw new Error(
        `${
          diagramSourceName(metaUrl)
        } declares slug ${module.default.slug} instead of ${stem}`,
      );
    }
    validateDiagramCliStance(
      module.default,
      fileSet.has(urls.cliUrl.pathname),
      diagramSourceName(metaUrl),
    );
    await assertDefaultExport(urls.validationUrl, "function");
    await assertDefaultExport(urls.layoutUrl, "function");
    await assertDefaultExport(urls.descriptionUrl, "function");
    await assertDefaultExport(urls.fixturesUrl, "array");
    const fixturesModule = await import(urls.fixturesUrl.href) as {
      readonly default: readonly unknown[];
      readonly releaseCorpus?: unknown;
    };
    if (fixturesModule.default.length === 0) {
      throw new Error(
        `${
          diagramSourceName(urls.fixturesUrl)
        } must contain a representative fixture`,
      );
    }
    for (const [index, fixture] of fixturesModule.default.entries()) {
      if (
        typeof fixture !== "object" || fixture === null ||
        (fixture as { readonly kind?: unknown }).kind !== module.default.slug ||
        !nonEmptyString((fixture as { readonly title?: unknown }).title) ||
        !nonEmptyString((fixture as { readonly summary?: unknown }).summary)
      ) {
        throw new Error(
          `${
            diagramSourceName(urls.fixturesUrl)
          } fixture ${index} does not identify ${module.default.slug} with accessible context`,
        );
      }
    }
    validateDiagramReleaseCorpus(
      fixturesModule.releaseCorpus,
      fixturesModule.default,
      module.default,
      diagramSourceName(urls.fixturesUrl),
    );
    if (!/\bexport\b/u.test(await Deno.readTextFile(urls.modUrl))) {
      throw new Error(
        `${
          diagramSourceName(urls.modUrl)
        } must export the kind authoring surface`,
      );
    }
    if (module.default.cli.stance === "enhanced") {
      await assertDefaultExport(urls.cliUrl, "function");
    }
    sources.push({
      directoryUrl,
      metaUrl,
      ...urls,
      meta: module.default,
    });
  }
  const slugs = new Set<string>();
  const orders = new Set<number>();
  for (const source of sources) {
    if (slugs.has(source.meta.slug)) {
      throw new Error(`Duplicate diagram kind slug ${source.meta.slug}`);
    }
    if (orders.has(source.meta.order)) {
      throw new Error(`Duplicate diagram kind order ${source.meta.order}`);
    }
    slugs.add(source.meta.slug);
    orders.add(source.meta.order);
  }
  return sources.toSorted((left, right) =>
    left.meta.order - right.meta.order ||
    left.meta.slug.localeCompare(right.meta.slug)
  );
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

function pascalIdentifier(slug: string): string {
  return slug.split(/[^a-zA-Z0-9]+/u).filter(Boolean).map((part) =>
    `${part[0]?.toLocaleUpperCase() ?? ""}${part.slice(1)}`
  ).join("");
}

function camelIdentifier(slug: string): string {
  const pascal = pascalIdentifier(slug);
  return `${pascal[0]?.toLocaleLowerCase() ?? ""}${pascal.slice(1)}`;
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
export interface GeneratedDiagramSources {
  readonly metadata: string;
  readonly registry: string;
  readonly spec: string;
  readonly dispatch: string;
  readonly exports: string;
  readonly cliRegistry: string;
}

/** Render every diagram-kind consumer from one discovered source inventory. */
export async function generateDiagramKindSources(
  root: URL = DIAGRAM_KIND_ROOT,
): Promise<GeneratedDiagramSources> {
  const kinds = await loadDiagramKindSources(root);
  if (kinds.length === 0) {
    throw new Error(`${diagramSourceName(root)} contains no diagram kinds`);
  }
  const typeImports = kinds.map((kind) => {
    const name = pascalIdentifier(kind.meta.slug);
    return `import type { ${name}DiagramSpec, Validated${name}Diagram } from ${
      JSON.stringify(relativeImport(GENERATED_ROOT, kind.specUrl))
    };`;
  });
  const spec = `/* Generated by scripts/generate.ts. Do not edit. */
${typeImports.join("\n")}

/** Exhaustive built-in diagram authoring union. */
export type DiagramSpec = ${
    kinds.map((kind) => `${pascalIdentifier(kind.meta.slug)}DiagramSpec`).join(
      " | ",
    )
  };

/** Exhaustive normalized union returned by generated validation. */
export type ValidatedDiagram = ${
    kinds.map((kind) => `Validated${pascalIdentifier(kind.meta.slug)}Diagram`)
      .join(" | ")
  };
`;

  const metadataImports = [
    'import type { DiagramKindMeta } from "../diagram/kind-meta.ts";',
  ];
  const metadataEntries: string[] = [];
  kinds.forEach((kind, index) => {
    metadataImports.push(
      `import meta${index} from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, kind.metaUrl))
      };`,
    );
    metadataEntries.push(`  meta${index},`);
  });
  const authorGuide = [
    "# Built-in Diagram kinds",
    "",
    ...kinds.flatMap((kind) => [
      `## ${kind.meta.name} (\`${kind.meta.slug}\`)`,
      "",
      kind.meta.description,
      "",
      `CLI stance: ${kind.meta.cli.stance}.`,
      "",
      "Use when:",
      ...kind.meta.useWhen.map((guidance) => `- ${guidance}`),
      "",
      "Do not use when:",
      ...kind.meta.notWhen.map((guidance) => `- ${guidance}`),
      "",
      "Budgets:",
      ...Object.entries(kind.meta.budgets).map(([dimension, budget]) =>
        `- ${dimension}: ${budget.limit} ${budget.unit}. ${budget.description} Remedy: ${budget.remedy}.`
      ),
      "",
    ]),
  ].join("\n");
  const metadata = `/* Generated by scripts/generate.ts. Do not edit. */
${metadataImports.join("\n")}

/** Canonical public Metadata for every built-in diagram kind. */
export const diagramKindMetadata = [
${metadataEntries.join("\n")}
] satisfies readonly DiagramKindMeta[];

/** Generated Markdown guidance derived from kind Metadata. */
export const diagramKindAuthorGuide = ${JSON.stringify(authorGuide)};
`;

  const registryImports = [
    'import type { DiagramKindRegistryEntry } from "../diagram/kind-meta.ts";',
  ];
  const registryEntries: string[] = [];
  kinds.forEach((kind, index) => {
    registryImports.push(
      `import meta${index} from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, kind.metaUrl))
      };`,
      `import fixtures${index} from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, kind.fixturesUrl))
      };`,
      `import { releaseCorpus as releaseCorpus${index} } from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, kind.fixturesUrl))
      };`,
    );
    registryEntries.push(
      `  { meta: meta${index}, fixtures: fixtures${index}, releaseCorpus: releaseCorpus${index} },`,
    );
  });
  const registry = `/* Generated by scripts/generate.ts. Do not edit. */
${registryImports.join("\n")}

/** Canonical metadata and release evidence for every built-in kind. */
export const diagramKindRegistry = [
${registryEntries.join("\n")}
] satisfies readonly DiagramKindRegistryEntry[];
`;

  const dispatchImports = [
    'import { DiagramValidationError } from "../diagram/errors.ts";',
    'import { conformDiagramScene } from "../diagram/conformance.ts";',
    'import { isDiagramRecord, snapshotDiagramJsonSafe } from "../diagram/validation.ts";',
    'import type { DiagramScene } from "../diagram/scene.ts";',
    'import type { ValidatedDiagram } from "./diagram-spec.ts";',
  ];
  kinds.forEach((kind) => {
    const pascal = pascalIdentifier(kind.meta.slug);
    dispatchImports.push(
      `import validate${pascal} from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, kind.validationUrl))
      };`,
      `import layout${pascal} from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, kind.layoutUrl))
      };`,
      `import describe${pascal} from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, kind.descriptionUrl))
      };`,
    );
  });
  const validationCases = kinds.map((kind) => {
    const pascal = pascalIdentifier(kind.meta.slug);
    return `    case ${JSON.stringify(kind.meta.slug)}:
      return validate${pascal}(spec);`;
  });
  const projectionCases = kinds.map((kind) => {
    const pascal = pascalIdentifier(kind.meta.slug);
    return `    case ${JSON.stringify(kind.meta.slug)}: {
      const validated = validate${pascal}(spec);
      return {
        validated,
        scene: conformDiagramScene(layout${pascal}(validated)),
        description: describe${pascal}(validated),
      };
    }`;
  });
  const semanticsCases = kinds.map((kind) => {
    const pascal = pascalIdentifier(kind.meta.slug);
    return `    case ${JSON.stringify(kind.meta.slug)}: {
      const validated = validate${pascal}(spec);
      return { validated, description: describe${pascal}(validated) };
    }`;
  });
  const dispatch = `/* Generated by scripts/generate.ts. Do not edit. */
${dispatchImports.join("\n")}

function preflight(spec: unknown): {
  readonly kind: string;
  readonly spec: Record<string, unknown>;
} {
  const snapshot = snapshotDiagramJsonSafe(spec);
  if (isDiagramRecord(snapshot) && typeof snapshot.kind === "string") {
    return { kind: snapshot.kind, spec: snapshot };
  }
  throw new DiagramValidationError({
    code: "diagram/invalid-spec",
    message: "Diagram spec must be a data object with a generated kind identity.",
    path: "spec.kind",
    remedy: "Author one of the generated built-in DiagramSpec variants.",
  });
}

function unknownKind(kind: string): never {
  throw new DiagramValidationError({
    code: "diagram/unknown-kind",
    message: \`Unknown diagram kind \${JSON.stringify(kind)}.\`,
    path: "spec.kind",
    facts: { kind },
    remedy: "Use one of the generated built-in diagram kind identities.",
  });
}

/** Internal result shared by projections so one preflight feeds every fact. */
export interface PreparedDiagram {
  readonly validated: ValidatedDiagram;
  readonly scene: DiagramScene;
  readonly description: string;
}

/** Internal semantic result for projections that do not require geometry. */
export interface PreparedDiagramSemantics {
  readonly validated: ValidatedDiagram;
  readonly description: string;
}

/** Complete preflight through the generated kind authority. */
export function validateDiagram(spec: unknown): ValidatedDiagram {
  const input = preflight(spec);
  switch (input.kind) {
${validationCases.join("\n").replaceAll("(spec)", "(input.spec)")}
    default:
      return unknownKind(input.kind);
  }
}

/** Validate once and derive the universal lossless description. */
export function prepareDiagramSemantics(
  spec: unknown,
): PreparedDiagramSemantics {
  const input = preflight(spec);
  switch (input.kind) {
${semanticsCases.join("\n").replaceAll("(spec)", "(input.spec)")}
    default:
      return unknownKind(input.kind);
  }
}

/** Validate once, then derive the conformant scene and lossless description. */
export function prepareDiagram(spec: unknown): PreparedDiagram {
  const input = preflight(spec);
  switch (input.kind) {
${projectionCases.join("\n").replaceAll("(spec)", "(input.spec)")}
    default:
      return unknownKind(input.kind);
  }
}

/** Validate, lay out, and universally conform one semantic diagram. */
export function layoutDiagram(spec: unknown): DiagramScene {
  return prepareDiagram(spec).scene;
}

/** Validate and preserve every terminal-relevant semantic fact in text. */
export function describeDiagram(spec: unknown): string {
  return prepareDiagramSemantics(spec).description;
}
`;

  const exports = `/* Generated by scripts/generate.ts. Do not edit. */
${
    kinds.map((kind) =>
      `export * from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, kind.modUrl))
      };`
    ).join("\n")
  }
`;

  const cliImports = [
    'import type { DiagramKindCliProjection, DiagramKindCliProjectorContext, DiagramKindCliRegistry } from "../cli/diagram-kinds.ts";',
    'import type { ValidatedDiagram } from "./diagram-spec.ts";',
  ];
  const cliEntries: string[] = [];
  const cliCases: string[] = [];
  kinds.forEach((kind) => {
    if (kind.meta.cli.stance === "description") {
      cliEntries.push(
        `  ${JSON.stringify(kind.meta.slug)}: { stance: "description" },`,
      );
      cliCases.push(`    case ${JSON.stringify(kind.meta.slug)}:
      return undefined;`);
      return;
    }
    const projector = `project${pascalIdentifier(kind.meta.slug)}DiagramCli`;
    cliImports.push(
      `import ${projector} from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, kind.cliUrl))
      };`,
    );
    cliEntries.push(
      `  ${
        JSON.stringify(kind.meta.slug)
      }: { stance: "enhanced", project: ${projector} },`,
    );
    cliCases.push(`    case ${JSON.stringify(kind.meta.slug)}:
      return ${projector}(spec, context);`);
  });
  const cliRegistry = `/* Generated by scripts/generate.ts. Do not edit. */
${cliImports.join("\n")}

/** Generated terminal stance keyed exhaustively by diagram kind. */
export const diagramKindCliRegistry = {
${cliEntries.join("\n")}
} as const satisfies DiagramKindCliRegistry;

/** Dispatch an enhanced kind projector, or decline by absence of a projector. */
export function projectDiagramKindCli(
  spec: ValidatedDiagram,
  context: DiagramKindCliProjectorContext,
): DiagramKindCliProjection | undefined {
  switch (spec.kind) {
${cliCases.join("\n")}
  }
}
`;
  return { metadata, registry, spec, dispatch, exports, cliRegistry };
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
  };
}

/** Refresh generated modules after component metadata, CSS, or assets change. */
export async function writeGeneratedSources(): Promise<void> {
  const generated = await generateSources();
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
    new URL("diagram-metadata.ts", GENERATED_ROOT),
    generated.diagramMetadata,
  );
  await Deno.writeTextFile(
    new URL("diagram-registry.ts", GENERATED_ROOT),
    generated.diagramRegistry,
  );
  await Deno.writeTextFile(
    new URL("diagram-spec.ts", GENERATED_ROOT),
    generated.diagramSpec,
  );
  await Deno.writeTextFile(
    new URL("diagram-dispatch.ts", GENERATED_ROOT),
    generated.diagramDispatch,
  );
  await Deno.writeTextFile(
    new URL("diagram-exports.ts", GENERATED_ROOT),
    generated.diagramExports,
  );
  await Deno.writeTextFile(
    new URL("diagram-cli-registry.ts", GENERATED_ROOT),
    generated.diagramCliRegistry,
  );
}

if (import.meta.main) await writeGeneratedSources();
