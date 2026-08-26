/**
 * Kind-family codegen framework: discovery, validation, and generation for
 * every enrolled kind family. A family supplies its identity and vocabulary
 * through {@linkcode KindFamilyConfig}; the machinery here walks the family's
 * kind root, rejects incomplete or ambiguous anatomy, and renders the six
 * generated sources. `scripts/generate.ts` remains the entry point that
 * writes the results.
 */

import type { FamilyKindMeta } from "../src/internal/kind-meta.ts";

/** Recursively list files beneath one directory in stable path order. */
export async function walk(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const url = new URL(entry.name + (entry.isDirectory ? "/" : ""), directory);
    if (entry.isDirectory) files.push(...await walk(url));
    else files.push(url);
  }
  return files.toSorted((a, b) => a.pathname.localeCompare(b.pathname));
}

/** Relative import specifier from one directory to a target module. */
export function relativeImport(fromDirectory: URL, target: URL): string {
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

/** Pascal-case identifier derived from one slug. */
export function pascalIdentifier(slug: string): string {
  return slug.split(/[^a-zA-Z0-9]+/u).filter(Boolean).map((part) =>
    `${part[0]?.toLocaleUpperCase() ?? ""}${part.slice(1)}`
  ).join("");
}

/** Camel-case identifier derived from one slug. */
export function camelIdentifier(slug: string): string {
  const pascal = pascalIdentifier(slug);
  return `${pascal[0]?.toLocaleLowerCase() ?? ""}${pascal.slice(1)}`;
}

function sourceName(url: URL): string {
  return decodeURIComponent(url.pathname);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function indefiniteArticle(word: string): string {
  return /^[aeiou]/iu.test(word) ? "an" : "a";
}

/**
 * A family's shipped terminal projector surface. Until a family declares
 * one, kind Metadata still records each kind's CLI stance at birth, but kind
 * CLI modules are forbidden and no CLI registry is generated — nothing can
 * silently decline. The moment the surface is declared, the two-way stance
 * pairing makes a missing projector module a generation failure.
 */
export interface KindFamilyCliSurface {
  /** The stance that requires — and alone permits — a kind CLI module. */
  readonly moduleStance: string;
  /** Generated CLI registry file name emitted into the generated root. */
  readonly registryFile: string;
  /** CLI contracts module as a specifier relative to the generated root. */
  readonly contractsModule: string;
}

/** Everything one kind family supplies to enrol in the shared machinery. */
export interface KindFamilyConfig {
  /** Lowercase family noun used in messages, codes, and generated docs. */
  readonly word: string;
  /** Pascal-case family stem behind every generated type and symbol name. */
  readonly typeName: string;
  /** Directory whose kind folders form this family's canonical set. */
  readonly kindRoot: URL;
  /** Closed remedy vocabulary admitted by kind budget Metadata. */
  readonly budgetRemedies: readonly string[];
  /** Release postures every kind corpus must cover. */
  readonly releasePostures: readonly string[];
  /** Closed CLI stance vocabulary admitted by kind Metadata. */
  readonly cliStances: readonly string[];
  /** The family's terminal projector surface, once it has shipped. */
  readonly cli?: KindFamilyCliSurface;
  /**
   * Markdown lines appended verbatim after the per-kind guide sections —
   * family-level guidance such as refused forms, sourced from a typed
   * authority rather than hand-edited into the generated file.
   */
  readonly authorGuideAppendix?: readonly string[];
  /**
   * Optional family-owned summary of one kind's terminal contract. The
   * default names only the stance; families with a second terminal
   * dimension, such as chart honesty, must expose it here rather than let
   * generated guidance discard it.
   */
  readonly authorGuideCliLine?: (cli: FamilyKindMeta["cli"]) => string;
  /** Family-specific validation of the whole authored `cli` Metadata value. */
  readonly validateCliMeta?: (
    cli: Record<string, unknown>,
    source: string,
  ) => void;
  /** Generated file names emitted into the generated root. */
  readonly generatedFiles: {
    readonly spec: string;
    readonly metadata: string;
    readonly registry: string;
    readonly dispatch: string;
    readonly exports: string;
  };
  /** Family authority modules as specifiers relative to the generated root. */
  readonly modules: {
    readonly kindMeta: string;
    readonly errors: string;
    readonly conformance: string;
    readonly validation: string;
    readonly scene: string;
  };
}

/** Canonical source anatomy discovered for one enrolled kind. */
export interface KindFamilySource {
  readonly directoryUrl: URL;
  readonly metaUrl: URL;
  readonly specUrl: URL;
  readonly validationUrl: URL;
  readonly layoutUrl: URL;
  readonly descriptionUrl: URL;
  readonly fixturesUrl: URL;
  readonly modUrl: URL;
  readonly cliUrl: URL;
  readonly meta: FamilyKindMeta;
}

/** Generated source family proving one canonical kind set. */
export interface GeneratedKindFamilySources {
  readonly metadata: string;
  readonly registry: string;
  readonly spec: string;
  readonly dispatch: string;
  readonly exports: string;
  /** Present only for a family whose terminal surface has shipped. */
  readonly cliRegistry?: string;
}

/** Enforce complete authored guidance and measurable budgets for one kind. */
function validateKindMeta(
  family: KindFamilyConfig,
  candidate: unknown,
  source: string,
): asserts candidate is FamilyKindMeta {
  if (typeof candidate !== "object" || candidate === null) {
    throw new Error(
      `${source} must default-export ${family.word} kind Metadata`,
    );
  }
  const meta = candidate as Record<string, unknown>;
  if (
    !nonEmptyString(meta.name) || !nonEmptyString(meta.slug) ||
    !/^[a-z][a-z0-9-]*$/u.test(meta.slug) ||
    !nonEmptyString(meta.description)
  ) {
    throw new Error(
      `${source} has incomplete ${family.word} kind identity or description`,
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
    throw new Error(`${source} has no measurable ${family.word} kind budgets`);
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
      !family.budgetRemedies.includes(budget.remedy as string)
    ) {
      throw new Error(`${source} has incomplete ${dimension} budget Metadata`);
    }
  }
  if (
    typeof meta.cli !== "object" || meta.cli === null ||
    !family.cliStances.includes(
      (meta.cli as Record<string, unknown>).stance as string,
    )
  ) {
    throw new Error(`${source} has no valid ${family.word} CLI stance`);
  }
  family.validateCliMeta?.(meta.cli as Record<string, unknown>, source);
}

/** Enforce the two-way relationship between kind stance and CLI module. */
function validateKindCliStance(
  family: KindFamilyConfig,
  meta: FamilyKindMeta,
  hasCliModule: boolean,
  source: string,
): void {
  if (family.cli === undefined) return;
  if (meta.cli.stance === family.cli.moduleStance && !hasCliModule) {
    throw new Error(
      `${source} declares ${family.cli.moduleStance} ${family.word} CLI but has no .cli.ts file`,
    );
  }
  if (meta.cli.stance !== family.cli.moduleStance && hasCliModule) {
    throw new Error(
      `${source} has a .cli.ts file but declares ${meta.cli.stance}-only CLI`,
    );
  }
}

/** Reject kind CLI modules without their matching Metadata authority. */
function validateKindCliInventory(
  family: KindFamilyConfig,
  files: readonly URL[],
): void {
  const fileSet = new Set(files.map((url) => url.pathname));
  for (
    const cliUrl of files.filter((url) => url.pathname.endsWith(".cli.ts"))
  ) {
    const metaPath = cliUrl.pathname.replace(/\.cli\.ts$/u, ".meta.ts");
    if (!fileSet.has(metaPath)) {
      throw new Error(
        `${sourceName(cliUrl)} has no matching ${family.word} .meta.ts file`,
      );
    }
  }
}

/** Reject partial kind anatomy that lacks a Metadata enrolment authority. */
function validateKindInventory(
  family: KindFamilyConfig,
  files: readonly URL[],
): void {
  const fileSet = new Set(files.map((url) => url.pathname));
  for (const file of files.filter((url) => url.pathname.endsWith(".ts"))) {
    const directoryUrl = new URL("./", file);
    const stem = directoryUrl.pathname.split("/").filter(Boolean).at(-1);
    if (stem === undefined) continue;
    const metaUrl = new URL(`${stem}.meta.ts`, directoryUrl);
    if (!fileSet.has(metaUrl.pathname)) {
      throw new Error(
        `${sourceName(file)} has no matching ${family.word} .meta.ts file`,
      );
    }
    const fileName = file.pathname.slice(file.pathname.lastIndexOf("/") + 1);
    if (fileName === `${stem}.cli.ts` && family.cli === undefined) {
      throw new Error(
        `${
          sourceName(file)
        } supplies a kind CLI module before the ${family.word} family's terminal surface exists`,
      );
    }
    const allowed = new Set([
      `${stem}.meta.ts`,
      `${stem}.spec.ts`,
      `${stem}.validation.ts`,
      `${stem}.layout.ts`,
      `${stem}.description.ts`,
      `${stem}.fixtures.ts`,
      ...(family.cli === undefined ? [] : [`${stem}.cli.ts`]),
      "mod.ts",
    ]);
    if (!allowed.has(fileName)) {
      throw new Error(
        `${sourceName(file)} is outside the fixed ${family.word} kind anatomy`,
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
      `${sourceName(url)} must default-export a ${expected}`,
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

function validateKindReleaseCorpus(
  family: KindFamilyConfig,
  value: unknown,
  fixtures: readonly unknown[],
  meta: FamilyKindMeta,
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
      if (!family.releasePostures.includes(posture as string)) {
        throw new Error(`${source} release case ${index} has unknown posture`);
      }
      observed.add(posture as string);
    }
    specs.push(entry.spec);
  }
  for (const posture of family.releasePostures) {
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

/** Discover a family's kinds and reject every incomplete or ambiguous anatomy. */
export async function loadKindFamilySources(
  family: KindFamilyConfig,
): Promise<KindFamilySource[]> {
  const files = await walk(family.kindRoot);
  const fileSet = new Set(files.map((url) => url.pathname));
  validateKindCliInventory(family, files);
  validateKindInventory(family, files);
  const sources: KindFamilySource[] = [];
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
        `${sourceName(metaUrl)} must match its kind directory name`,
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
          `${sourceName(metaUrl)} is missing required ${surface}`,
        );
      }
    }
    const module = await import(metaUrl.href) as { readonly default?: unknown };
    validateKindMeta(family, module.default, sourceName(metaUrl));
    if (module.default.slug !== stem) {
      throw new Error(
        `${
          sourceName(metaUrl)
        } declares slug ${module.default.slug} instead of ${stem}`,
      );
    }
    validateKindCliStance(
      family,
      module.default,
      fileSet.has(urls.cliUrl.pathname),
      sourceName(metaUrl),
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
        `${sourceName(urls.fixturesUrl)} must contain a representative fixture`,
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
            sourceName(urls.fixturesUrl)
          } fixture ${index} does not identify ${module.default.slug} with accessible context`,
        );
      }
    }
    validateKindReleaseCorpus(
      family,
      fixturesModule.releaseCorpus,
      fixturesModule.default,
      module.default,
      sourceName(urls.fixturesUrl),
    );
    if (!/\bexport\b/u.test(await Deno.readTextFile(urls.modUrl))) {
      throw new Error(
        `${sourceName(urls.modUrl)} must export the kind authoring surface`,
      );
    }
    if (
      family.cli !== undefined &&
      module.default.cli.stance === family.cli.moduleStance
    ) {
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
      throw new Error(
        `Duplicate ${family.word} kind slug ${source.meta.slug}`,
      );
    }
    if (orders.has(source.meta.order)) {
      throw new Error(
        `Duplicate ${family.word} kind order ${source.meta.order}`,
      );
    }
    slugs.add(source.meta.slug);
    orders.add(source.meta.order);
  }
  return sources.toSorted((left, right) =>
    left.meta.order - right.meta.order ||
    left.meta.slug.localeCompare(right.meta.slug)
  );
}

/** Render one family's generated consumers from its discovered inventory. */
export async function generateKindFamilySources(
  family: KindFamilyConfig,
  generatedRoot: URL,
): Promise<GeneratedKindFamilySources> {
  const kinds = await loadKindFamilySources(family);
  if (kinds.length === 0) {
    throw new Error(
      `${sourceName(family.kindRoot)} contains no ${family.word} kinds`,
    );
  }
  const familyType = family.typeName;
  const familyCamel = camelIdentifier(family.word);
  const typeImports = kinds.map((kind) => {
    const name = pascalIdentifier(kind.meta.slug);
    return `import type { ${name}${familyType}Spec, Validated${name}${familyType} } from ${
      JSON.stringify(relativeImport(generatedRoot, kind.specUrl))
    };`;
  });
  const spec = `/* Generated by scripts/generate.ts. Do not edit. */
${typeImports.join("\n")}

/** Exhaustive built-in ${family.word} authoring union. */
export type ${familyType}Spec = ${
    kinds.map((kind) => `${pascalIdentifier(kind.meta.slug)}${familyType}Spec`)
      .join(
        " | ",
      )
  };

/** Exhaustive normalized union returned by generated validation. */
export type Validated${familyType} = ${
    kinds.map((kind) =>
      `Validated${pascalIdentifier(kind.meta.slug)}${familyType}`
    )
      .join(" | ")
  };
`;

  const metadataImports = [
    `import type { ${familyType}KindMeta } from ${
      JSON.stringify(family.modules.kindMeta)
    };`,
  ];
  const metadataEntries: string[] = [];
  kinds.forEach((kind, index) => {
    metadataImports.push(
      `import meta${index} from ${
        JSON.stringify(relativeImport(generatedRoot, kind.metaUrl))
      };`,
    );
    metadataEntries.push(`  meta${index},`);
  });
  const authorGuide = [
    `# Built-in ${familyType} kinds`,
    "",
    ...kinds.flatMap((kind) => [
      `## ${kind.meta.name} (\`${kind.meta.slug}\`)`,
      "",
      kind.meta.description,
      "",
      family.authorGuideCliLine?.(kind.meta.cli) ??
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
    ...(family.authorGuideAppendix ?? []),
  ].join("\n");
  const metadata = `/* Generated by scripts/generate.ts. Do not edit. */
${metadataImports.join("\n")}

/** Canonical public Metadata for every built-in ${family.word} kind. */
export const ${familyCamel}KindMetadata = [
${metadataEntries.join("\n")}
] satisfies readonly ${familyType}KindMeta[];

/** Generated Markdown guidance derived from kind Metadata. */
export const ${familyCamel}KindAuthorGuide = ${JSON.stringify(authorGuide)};
`;

  const registryImports = [
    `import type { ${familyType}KindRegistryEntry } from ${
      JSON.stringify(family.modules.kindMeta)
    };`,
  ];
  const registryEntries: string[] = [];
  kinds.forEach((kind, index) => {
    registryImports.push(
      `import meta${index} from ${
        JSON.stringify(relativeImport(generatedRoot, kind.metaUrl))
      };`,
      `import fixtures${index} from ${
        JSON.stringify(relativeImport(generatedRoot, kind.fixturesUrl))
      };`,
      `import { releaseCorpus as releaseCorpus${index} } from ${
        JSON.stringify(relativeImport(generatedRoot, kind.fixturesUrl))
      };`,
    );
    registryEntries.push(
      `  { meta: meta${index}, fixtures: fixtures${index}, releaseCorpus: releaseCorpus${index} },`,
    );
  });
  const registry = `/* Generated by scripts/generate.ts. Do not edit. */
${registryImports.join("\n")}

/** Canonical metadata and release evidence for every built-in kind. */
export const ${familyCamel}KindRegistry = [
${registryEntries.join("\n")}
] satisfies readonly ${familyType}KindRegistryEntry[];
`;

  const dispatchImports = [
    `import { ${familyType}ValidationError } from ${
      JSON.stringify(family.modules.errors)
    };`,
    `import { conform${familyType}Scene } from ${
      JSON.stringify(family.modules.conformance)
    };`,
    `import { is${familyType}Record, snapshot${familyType}JsonSafe } from ${
      JSON.stringify(family.modules.validation)
    };`,
    `import type { ${familyType}Scene } from ${
      JSON.stringify(family.modules.scene)
    };`,
    `import type { Validated${familyType} } from ${
      JSON.stringify(`./${family.generatedFiles.spec}`)
    };`,
  ];
  kinds.forEach((kind) => {
    const pascal = pascalIdentifier(kind.meta.slug);
    dispatchImports.push(
      `import validate${pascal} from ${
        JSON.stringify(relativeImport(generatedRoot, kind.validationUrl))
      };`,
      `import layout${pascal} from ${
        JSON.stringify(relativeImport(generatedRoot, kind.layoutUrl))
      };`,
      `import describe${pascal} from ${
        JSON.stringify(relativeImport(generatedRoot, kind.descriptionUrl))
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
        scene: conform${familyType}Scene(layout${pascal}(validated)),
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
  const snapshot = snapshot${familyType}JsonSafe(spec);
  if (is${familyType}Record(snapshot) && typeof snapshot.kind === "string") {
    return { kind: snapshot.kind, spec: snapshot };
  }
  throw new ${familyType}ValidationError({
    code: "${family.word}/invalid-spec",
    message: "${familyType} spec must be a data object with a generated kind identity.",
    path: "spec.kind",
    remedy: "Author one of the generated built-in ${familyType}Spec variants.",
  });
}

function unknownKind(kind: string): never {
  throw new ${familyType}ValidationError({
    code: "${family.word}/unknown-kind",
    message: \`Unknown ${family.word} kind \${JSON.stringify(kind)}.\`,
    path: "spec.kind",
    facts: { kind },
    remedy: "Use one of the generated built-in ${family.word} kind identities.",
  });
}

/** Internal result shared by projections so one preflight feeds every fact. */
export interface Prepared${familyType} {
  readonly validated: Validated${familyType};
  readonly scene: ${familyType}Scene;
  readonly description: string;
}

/** Internal semantic result for projections that do not require geometry. */
export interface Prepared${familyType}Semantics {
  readonly validated: Validated${familyType};
  readonly description: string;
}

/** Complete preflight through the generated kind authority. */
export function validate${familyType}(spec: unknown): Validated${familyType} {
  const input = preflight(spec);
  switch (input.kind) {
${validationCases.join("\n").replaceAll("(spec)", "(input.spec)")}
    default:
      return unknownKind(input.kind);
  }
}

/** Validate once and derive the universal lossless description. */
export function prepare${familyType}Semantics(
  spec: unknown,
): Prepared${familyType}Semantics {
  const input = preflight(spec);
  switch (input.kind) {
${semanticsCases.join("\n").replaceAll("(spec)", "(input.spec)")}
    default:
      return unknownKind(input.kind);
  }
}

/** Validate once, then derive the conformant scene and lossless description. */
export function prepare${familyType}(spec: unknown): Prepared${familyType} {
  const input = preflight(spec);
  switch (input.kind) {
${projectionCases.join("\n").replaceAll("(spec)", "(input.spec)")}
    default:
      return unknownKind(input.kind);
  }
}

/** Validate, lay out, and universally conform one semantic ${family.word}. */
export function layout${familyType}(spec: unknown): ${familyType}Scene {
  return prepare${familyType}(spec).scene;
}

/** Validate and preserve every terminal-relevant semantic fact in text. */
export function describe${familyType}(spec: unknown): string {
  return prepare${familyType}Semantics(spec).description;
}
`;

  const exports = `/* Generated by scripts/generate.ts. Do not edit. */
${
    kinds.map((kind) =>
      `export * from ${
        JSON.stringify(relativeImport(generatedRoot, kind.modUrl))
      };`
    ).join("\n")
  }
`;

  if (family.cli === undefined) {
    return { metadata, registry, spec, dispatch, exports };
  }
  const cliSurface = family.cli;
  const cliImports = [
    `import type { ${familyType}KindCliProjection, ${familyType}KindCliProjectorContext, ${familyType}KindCliRegistry } from ${
      JSON.stringify(cliSurface.contractsModule)
    };`,
    `import type { Validated${familyType} } from ${
      JSON.stringify(`./${family.generatedFiles.spec}`)
    };`,
  ];
  const cliEntries: string[] = [];
  const cliCases: string[] = [];
  kinds.forEach((kind) => {
    if (kind.meta.cli.stance !== cliSurface.moduleStance) {
      cliEntries.push(
        `  ${JSON.stringify(kind.meta.slug)}: { stance: ${
          JSON.stringify(kind.meta.cli.stance)
        } },`,
      );
      cliCases.push(`    case ${JSON.stringify(kind.meta.slug)}:
      return undefined;`);
      return;
    }
    const projector = `project${
      pascalIdentifier(kind.meta.slug)
    }${familyType}Cli`;
    cliImports.push(
      `import ${projector} from ${
        JSON.stringify(relativeImport(generatedRoot, kind.cliUrl))
      };`,
    );
    cliEntries.push(
      `  ${JSON.stringify(kind.meta.slug)}: { stance: ${
        JSON.stringify(cliSurface.moduleStance)
      }, project: ${projector} },`,
    );
    cliCases.push(`    case ${JSON.stringify(kind.meta.slug)}:
      return ${projector}(spec, context);`);
  });
  const cliRegistry = `/* Generated by scripts/generate.ts. Do not edit. */
${cliImports.join("\n")}

/** Generated terminal stance keyed exhaustively by ${family.word} kind. */
export const ${familyCamel}KindCliRegistry = {
${cliEntries.join("\n")}
} as const satisfies ${familyType}KindCliRegistry;

/** Dispatch ${
    indefiniteArticle(cliSurface.moduleStance)
  } ${cliSurface.moduleStance} kind projector, or decline by absence of a projector. */
export function project${familyType}KindCli(
  spec: Validated${familyType},
  context: ${familyType}KindCliProjectorContext,
): ${familyType}KindCliProjection | undefined {
  switch (spec.kind) {
${cliCases.join("\n")}
  }
}
`;
  return { metadata, registry, spec, dispatch, exports, cliRegistry };
}
