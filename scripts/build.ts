import type { BuildSummary } from "../src/runtime.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";
import type { ComponentExampleDefinition } from "../src/types/component-examples.ts";
import { resolveComponentExampleVocabulary } from "../src/types/component-examples.ts";
import { stripVTControlCharacters } from "node:util";
import type {
  CatalogueObjectType,
  CatalogueProp,
  CataloguePropDocumentation,
  CatalogueVariant,
} from "../catalogue/conformance.ts";
import { writeGeneratedSources } from "./generate.ts";

const ROOT = new URL("../", import.meta.url);
const COMPONENT_ROOT = new URL("../src/components/", import.meta.url);
export const DESIGN_SYSTEM_BUILD_OUTPUTS = {
  runtime: "dist/",
  catalogueRegistry: "catalogue/generated/",
} as const;
const GENERATED_ROOT = new URL(
  `../${DESIGN_SYSTEM_BUILD_OUTPUTS.catalogueRegistry}`,
  import.meta.url,
);
const CATALOGUE_ROOT = new URL("../catalogue/", import.meta.url);
const DIST_ROOT = new URL(
  `../${DESIGN_SYSTEM_BUILD_OUTPUTS.runtime}`,
  import.meta.url,
);

interface ComponentPaths {
  readonly metaUrl: URL;
  readonly examplesUrl: URL;
  readonly componentUrl: URL;
  readonly vocabularyUrls: readonly URL[];
}

interface ComponentSource extends ComponentPaths {
  readonly meta: ComponentMeta;
  readonly reactExport: string;
  readonly propDocumentation: CataloguePropDocumentation;
  readonly variants: readonly CatalogueVariant[];
  readonly objectTypes: readonly CatalogueObjectType[];
}

/** Types declared by shared modules that sit outside any one component. */
interface SharedTypeFacts {
  readonly variants: readonly CatalogueVariant[];
  readonly objectTypes: readonly CatalogueObjectType[];
}

const textDecoder = new TextDecoder();

async function walk(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const url = new URL(entry.name + (entry.isDirectory ? "/" : ""), directory);
    if (entry.isDirectory) files.push(...await walk(url));
    else files.push(url);
  }
  return files;
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

function asRecord(
  value: unknown,
  context: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, context: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${context} must be an array`);
  }
  return value;
}

function requiredString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${context} must be a non-empty string`);
  }
  return value;
}

function pascalCase(slug: string): string {
  const name = slug.split("-").map((part) =>
    `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`
  ).join("");
  if (!name) throw new TypeError("Component slug cannot be empty");
  return name;
}

function renderDocType(value: unknown, context: string): string {
  const type = asRecord(value, context);
  // deno doc's repr drops the quotes from string literals, so literal-bearing
  // kinds render from their structure to keep `"a" | "b"` distinguishable
  // from a union of type references.
  const structuralKind = type.kind === "literal" || type.kind === "union" ||
    type.kind === "intersection";
  if (
    !structuralKind && typeof type.repr === "string" && type.repr.length > 0
  ) {
    return type.repr;
  }
  const kind = requiredString(type.kind, `${context}.kind`);
  if (kind === "keyword" && typeof type.value === "string") {
    return type.value;
  }
  if (kind === "typeRef") {
    const reference = asRecord(type.value, `${context}.value`);
    return requiredString(reference.typeName, `${context}.value.typeName`);
  }
  if (kind === "literal") {
    const literal = asRecord(type.value, `${context}.value`);
    if (typeof literal.string === "string") {
      return JSON.stringify(literal.string);
    }
    if (typeof literal.number === "number") return String(literal.number);
    if (typeof literal.boolean === "boolean") return String(literal.boolean);
  }
  if (kind === "array") {
    return `${renderDocType(type.value, `${context}.value`)}[]`;
  }
  if (kind === "typeOperator") {
    const operator = asRecord(type.value, `${context}.value`);
    return `${requiredString(operator.operator, `${context}.value.operator`)} ${
      renderDocType(operator.tsType, `${context}.value.tsType`)
    }`;
  }
  if (kind === "union" || kind === "intersection") {
    const separator = kind === "union" ? " | " : " & ";
    return asArray(type.value, `${context}.value`).map((member, index) =>
      renderDocType(member, `${context}.value[${index}]`)
    ).join(separator);
  }
  if (kind === "fnOrConstructor") {
    const callable = asRecord(type.value, `${context}.value`);
    const parameters = asArray(callable.params, `${context}.value.params`).map(
      (parameterValue, index) => {
        const parameter = asRecord(
          parameterValue,
          `${context}.value.params[${index}]`,
        );
        if (parameter.kind !== "identifier") {
          throw new TypeError(
            `Unsupported ${context} parameter kind: ${String(parameter.kind)}`,
          );
        }
        return `${
          requiredString(
            parameter.name,
            `${context}.value.params[${index}].name`,
          )
        }${parameter.optional === true ? "?" : ""}: ${
          renderDocType(
            parameter.tsType,
            `${context}.value.params[${index}].type`,
          )
        }`;
      },
    );
    const signature = `(${parameters.join(", ")}) => ${
      renderDocType(callable.tsType, `${context}.value.returnType`)
    }`;
    return callable["constructor"] === true ? `new ${signature}` : signature;
  }
  throw new TypeError(`Unsupported ${context} kind: ${kind}`);
}

function symbolDeclaration(
  symbols: readonly unknown[],
  name: string,
): Record<string, unknown> | undefined {
  const symbol = symbols.find((candidate) => {
    const value = asRecord(candidate, "deno doc symbol");
    return value.name === name;
  });
  if (symbol === undefined) return undefined;
  const declarations = asArray(
    asRecord(symbol, `deno doc symbol ${name}`).declarations,
    `deno doc symbol ${name}.declarations`,
  );
  const declaration = declarations.at(0);
  return declaration === undefined
    ? undefined
    : asRecord(declaration, `deno doc declaration ${name}`);
}

/**
 * The module's exported symbols. The doc pass runs with `--private` so
 * union Props branches can resolve their unexported common interfaces, but
 * only exported names may become public variants or object types.
 */
function exportedSymbolNames(symbols: readonly unknown[]): readonly string[] {
  return symbols.flatMap((value) => {
    const symbol = asRecord(value, "deno doc symbol");
    const name = requiredString(symbol.name, "deno doc symbol.name");
    const declaration = symbolDeclaration(symbols, name);
    return declaration?.declarationKind === "export" ? [name] : [];
  });
}

function propDescription(
  property: Record<string, unknown>,
): string | undefined {
  if (property.jsDoc === undefined) return undefined;
  const doc = asRecord(property.jsDoc, "prop jsDoc").doc;
  return typeof doc === "string" && doc.trim() ? doc.trim() : undefined;
}

function propsFromProperties(
  values: readonly unknown[],
  context: string,
): CatalogueProp[] {
  return values.map((value, index) => {
    const property = asRecord(value, `${context}.properties[${index}]`);
    const description = propDescription(property);
    return {
      name: requiredString(
        property.name,
        `${context}.properties[${index}].name`,
      ),
      type: renderDocType(
        property.tsType,
        `${context}.properties[${index}].type`,
      ),
      required: property.optional !== true,
      ...(description === undefined ? {} : { description }),
    };
  });
}

function interfaceProps(
  definition: Record<string, unknown>,
  context: string,
): CatalogueProp[] {
  return propsFromProperties(
    definition.properties === undefined
      ? []
      : asArray(definition.properties, `${context}.properties`),
    context,
  );
}

/**
 * The literal members of one union branch: a type alias intersecting a
 * common interface with an own-member type literal, plus opaque references
 * (the inherited HTML attribute surface) collected as inherited names.
 * Later intersection members override earlier ones by name.
 */
function branchProps(
  symbols: readonly unknown[],
  branchName: string,
  inherited: string[],
): readonly CatalogueProp[] | undefined {
  const declaration = symbolDeclaration(symbols, branchName);
  if (declaration?.kind !== "typeAlias") return undefined;
  const definition = asRecord(
    declaration.def,
    `deno doc declaration ${branchName}.def`,
  );
  const branchType = unparenthesized(definition.tsType);
  const parts = branchType.kind === "intersection"
    ? asArray(branchType.value, `${branchName}.members`)
    : [definition.tsType];
  const byName = new Map<string, CatalogueProp>();
  for (const [index, partValue] of parts.entries()) {
    const part = unparenthesized(partValue);
    const context = `${branchName}.members[${index}]`;
    if (part.kind === "typeLiteral") {
      const literal = asRecord(part.value, context);
      for (
        const prop of propsFromProperties(
          literal.properties === undefined
            ? []
            : asArray(literal.properties, `${context}.properties`),
          context,
        )
      ) {
        byName.set(prop.name, prop);
      }
      continue;
    }
    if (part.kind === "typeRef") {
      const reference = asRecord(part.value, context);
      const refName = requiredString(reference.typeName, `${context}.typeName`);
      const refDeclaration = symbolDeclaration(symbols, refName);
      if (refDeclaration?.kind === "interface") {
        const refDefinition = asRecord(
          refDeclaration.def,
          `deno doc declaration ${refName}.def`,
        );
        for (const prop of interfaceProps(refDefinition, refName)) {
          byName.set(prop.name, prop);
        }
        continue;
      }
      inherited.push(renderDocType(partValue, context));
      continue;
    }
    return undefined;
  }
  return [...byName.values()];
}

/**
 * Documentation for a Props alias declared as a union of branch aliases —
 * the linked/static component pattern. Each branch resolves to its literal
 * members and the union merges to the surface the branches share: a prop
 * stays required only when every branch requires it, `never`-typed markers
 * drop out, and diverging types join into a union.
 */
function mergedUnionDocumentation(
  symbols: readonly unknown[],
  typeName: string,
  definition: Record<string, unknown>,
): CataloguePropDocumentation | undefined {
  const union = asRecord(definition.tsType, `${typeName}.type`);
  if (union.kind !== "union") return undefined;
  const inherited: string[] = [];
  const branches: (readonly CatalogueProp[])[] = [];
  for (
    const [index, memberValue] of asArray(union.value, `${typeName}.members`)
      .entries()
  ) {
    const member = unparenthesized(memberValue);
    if (member.kind !== "typeRef") return undefined;
    const reference = asRecord(member.value, `${typeName}.members[${index}]`);
    const branch = branchProps(
      symbols,
      requiredString(
        reference.typeName,
        `${typeName}.members[${index}].typeName`,
      ),
      inherited,
    );
    if (branch === undefined) return undefined;
    branches.push(branch);
  }
  if (branches.length < 2) return undefined;

  const names: string[] = [];
  for (const branch of branches) {
    for (const prop of branch) {
      if (!names.includes(prop.name)) names.push(prop.name);
    }
  }
  const props: CatalogueProp[] = [];
  for (const name of names) {
    const occurrences = branches.map((branch) =>
      branch.find((prop) => prop.name === name)
    );
    const present = occurrences.flatMap((prop) =>
      prop === undefined || prop.type === "never" ? [] : [prop]
    );
    if (present.length === 0) continue;
    const types = [...new Set(present.map((prop) => prop.type))];
    const description = present.find((prop) => prop.description !== undefined)
      ?.description;
    props.push({
      name,
      type: types.join(" | "),
      required: occurrences.every((prop) =>
        prop !== undefined && prop.type !== "never" && prop.required
      ),
      ...(description === undefined ? {} : { description }),
    });
  }
  return {
    status: "available",
    typeName,
    inheritedTypes: [...new Set(inherited)],
    props,
  };
}

function extractPropDocumentation(
  symbols: readonly unknown[],
  typeName: string,
): CataloguePropDocumentation {
  const declaration = symbolDeclaration(symbols, typeName);
  if (declaration === undefined) {
    return {
      status: "unavailable",
      typeName,
      reason:
        `No exported ${typeName} declaration was found in the component source.`,
    };
  }
  const kind = requiredString(
    declaration.kind,
    `deno doc declaration ${typeName}.kind`,
  );
  const definition = asRecord(
    declaration.def,
    `deno doc declaration ${typeName}.def`,
  );
  if (kind === "typeAlias") {
    const merged = mergedUnionDocumentation(symbols, typeName, definition);
    if (merged !== undefined) return merged;
    return {
      status: "unavailable",
      typeName,
      reason: `${typeName} is a source union (${
        renderDocType(
          definition.tsType,
          `${typeName}.type`,
        )
      }) whose branches do not merge into one documented surface.`,
    };
  }
  if (kind !== "interface") {
    return {
      status: "unavailable",
      typeName,
      reason: `${typeName} is a ${kind}, not a flat source interface.`,
    };
  }

  const inheritedTypes = declaration.def === undefined ||
      definition.extends === undefined
    ? []
    : asArray(definition.extends, `${typeName}.extends`).map((value, index) =>
      renderDocType(value, `${typeName}.extends[${index}]`)
    );
  return {
    status: "available",
    typeName,
    inheritedTypes,
    props: interfaceProps(definition, typeName),
  };
}

function literalUnionValues(value: unknown): readonly string[] | undefined {
  const type = asRecord(value, "variant type");
  if (type.kind !== "union") return undefined;
  const values: string[] = [];
  for (
    const [index, memberValue] of asArray(type.value, "variant members")
      .entries()
  ) {
    const member = asRecord(memberValue, `variant member ${index}`);
    if (member.kind !== "literal") return undefined;
    const literal = asRecord(member.value, `variant member ${index}.value`);
    if (typeof literal.string === "string") values.push(literal.string);
    else if (typeof literal.number === "number") {
      values.push(String(literal.number));
    } else if (typeof literal.boolean === "boolean") {
      values.push(String(literal.boolean));
    } else return undefined;
  }
  return values;
}

function unparenthesized(value: unknown): Record<string, unknown> {
  const type = asRecord(value, "variant type");
  return type.kind === "parenthesized"
    ? asRecord(type.value, "parenthesized variant type")
    : type;
}

/**
 * Values of a `(typeof someConstArray)[number]` alias, resolved through the
 * const tuple it indexes — the codebase's canonical derived-union pattern.
 */
function indexedConstUnionValues(
  tsType: unknown,
  symbols: readonly unknown[],
): readonly string[] | undefined {
  const type = asRecord(tsType, "variant type");
  if (type.kind !== "indexedAccess") return undefined;
  const access = asRecord(type.value, "indexedAccess value");
  const indexType = asRecord(access.indexType, "indexedAccess indexType");
  if (indexType.kind !== "keyword" || indexType.value !== "number") {
    return undefined;
  }
  const objType = unparenthesized(access.objType);
  if (objType.kind !== "typeQuery" || typeof objType.value !== "string") {
    return undefined;
  }
  const constant = symbolDeclaration(symbols, objType.value);
  if (constant?.kind !== "variable") return undefined;
  const definition = asRecord(constant.def, `deno doc const ${objType.value}`);
  const arrayType = asRecord(definition.tsType, `${objType.value} type`);
  if (arrayType.kind !== "array") return undefined;
  return literalUnionValues(arrayType.value);
}

function extractVariants(symbols: readonly unknown[]): CatalogueVariant[] {
  const variants: CatalogueVariant[] = [];
  for (const typeName of exportedSymbolNames(symbols)) {
    if (typeName.endsWith("Props")) continue;
    const declaration = symbolDeclaration(symbols, typeName);
    if (declaration?.kind !== "typeAlias") continue;
    const definition = asRecord(
      declaration.def,
      `deno doc declaration ${typeName}.def`,
    );
    const values = literalUnionValues(definition.tsType) ??
      indexedConstUnionValues(definition.tsType, symbols);
    if (values !== undefined && values.length > 0) {
      variants.push({ typeName, values });
    }
  }
  return variants;
}

/** Exported non-Props interfaces: the object shapes props may reference. */
function extractObjectTypes(
  symbols: readonly unknown[],
): CatalogueObjectType[] {
  const objectTypes: CatalogueObjectType[] = [];
  for (const typeName of exportedSymbolNames(symbols)) {
    if (typeName.endsWith("Props")) continue;
    const declaration = symbolDeclaration(symbols, typeName);
    if (declaration?.kind !== "interface") continue;
    const definition = asRecord(
      declaration.def,
      `deno doc declaration ${typeName}.def`,
    );
    objectTypes.push({
      typeName,
      props: interfaceProps(definition, typeName),
    });
  }
  return objectTypes;
}

export function assertKnownDocWarnings(stderr: string): void {
  const normalized = stripVTControlCharacters(stderr);
  if (!normalized) return;
  const known =
    "Warning Failed resolving types. Could not find package 'global.d.ts'";
  if (
    !normalized.startsWith(known) ||
    normalized.slice(known.length).includes("\nWarning")
  ) {
    throw new Error(`deno doc emitted an unexpected warning:\n${stderr}`);
  }
}

async function enrichComponentSources(
  paths: readonly ComponentPaths[],
  sharedModules: readonly URL[],
): Promise<{
  readonly sources: ComponentSource[];
  readonly shared: SharedTypeFacts;
}> {
  const metadata = await Promise.all(paths.map(async (source) => {
    const module = await import(source.metaUrl.href) as {
      default: ComponentMeta;
      componentExampleVocabulary?: unknown;
    };
    if (!Array.isArray(module.componentExampleVocabulary)) {
      throw new TypeError(
        `${source.metaUrl.pathname} must export componentExampleVocabulary`,
      );
    }
    const exampleVocabulary = module
      .componentExampleVocabulary as readonly ComponentExampleDefinition[];
    resolveComponentExampleVocabulary(module.default, exampleVocabulary);
    return module.default;
  }));
  const command = new Deno.Command(Deno.execPath(), {
    cwd: decodeURIComponent(ROOT.pathname),
    args: [
      "doc",
      "--json",
      // Unexported symbols stay documentable so union Props branches can
      // resolve their common interfaces; exported-only filters guard the
      // public surfaces.
      "--private",
      ...paths.map(({ componentUrl }) =>
        decodeURIComponent(componentUrl.pathname)
      ),
      ...paths.flatMap(({ vocabularyUrls }) =>
        vocabularyUrls.map((url) => decodeURIComponent(url.pathname))
      ),
      ...sharedModules.map((url) => decodeURIComponent(url.pathname)),
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  const stderr = textDecoder.decode(output.stderr).trim();
  if (!output.success) {
    throw new Error(
      `deno doc failed with exit code ${output.code}${
        stderr ? `:\n${stderr}` : ""
      }`,
    );
  }
  assertKnownDocWarnings(stderr);
  const parsed: unknown = JSON.parse(textDecoder.decode(output.stdout));
  const nodes = asRecord(
    asRecord(parsed, "deno doc output").nodes,
    "deno doc nodes",
  );

  const moduleSymbols = (url: URL): readonly unknown[] =>
    asArray(
      asRecord(nodes[url.href], `deno doc node for ${url.pathname}`).symbols,
      `deno doc symbols for ${url.pathname}`,
    );

  const sources = paths.map((source, index) => {
    const meta = metadata[index];
    if (meta === undefined) {
      throw new TypeError(`Missing metadata for ${source.metaUrl.pathname}`);
    }
    const reactExport = pascalCase(meta.slug);
    const symbols = moduleSymbols(source.componentUrl);
    const vocabularySymbols = source.vocabularyUrls.flatMap(moduleSymbols);
    if (symbolDeclaration(symbols, reactExport) === undefined) {
      throw new TypeError(
        `${source.componentUrl.pathname} does not export the registry-derived adapter name ${reactExport}`,
      );
    }
    return {
      ...source,
      meta,
      reactExport,
      propDocumentation: extractPropDocumentation(
        symbols,
        `${reactExport}Props`,
      ),
      variants: [
        ...extractVariants(symbols),
        ...extractVariants(vocabularySymbols),
      ],
      objectTypes: [
        ...extractObjectTypes(symbols),
        ...extractObjectTypes(vocabularySymbols),
      ],
    };
  });

  const shared: SharedTypeFacts = {
    variants: sharedModules.flatMap((url) =>
      extractVariants(moduleSymbols(url))
    ),
    objectTypes: sharedModules.flatMap((url) =>
      extractObjectTypes(moduleSymbols(url))
    ),
  };
  return { sources, shared };
}

async function discoverComponents(): Promise<{
  readonly sources: ComponentSource[];
  readonly shared: SharedTypeFacts;
}> {
  const files = await walk(COMPONENT_ROOT);
  const metaFiles = files.filter((url) => url.pathname.endsWith(".meta.ts"))
    .sort((a, b) => a.pathname.localeCompare(b.pathname));
  const paths = metaFiles.map((metaUrl) => {
    const componentDirectory = metaUrl.pathname.replace(/[^/]+$/, "");
    const examplesUrl = new URL(
      metaUrl.pathname.replace(/\.meta\.ts$/, ".examples.tsx"),
      metaUrl,
    );
    const componentUrl = new URL(
      metaUrl.pathname.replace(/\.meta\.ts$/, ".tsx"),
      metaUrl,
    );
    if (!files.some((file) => file.pathname === examplesUrl.pathname)) {
      throw new Error(`Missing examples for ${metaUrl.pathname}`);
    }
    if (!files.some((file) => file.pathname === componentUrl.pathname)) {
      throw new Error(`Missing component source for ${metaUrl.pathname}`);
    }
    const vocabularyUrls = files.filter((file) =>
      file.pathname.replace(/[^/]+$/, "") === componentDirectory &&
      (file.pathname.endsWith(".types.ts") ||
        file.pathname.endsWith(".shared.ts"))
    ).sort((a, b) => a.pathname.localeCompare(b.pathname));
    return { metaUrl, examplesUrl, componentUrl, vocabularyUrls };
  });
  // Shared modules: .ts files in the component tree outside any component
  // folder (e.g. layout/space.ts) — the home of cross-component types.
  const componentDirectories = new Set(
    metaFiles.map((url) => url.pathname.replace(/[^/]+$/, "")),
  );
  const sharedModules = files
    .filter((url) =>
      url.pathname.endsWith(".ts") && !url.pathname.endsWith(".meta.ts") &&
      !componentDirectories.has(url.pathname.replace(/[^/]+$/, ""))
    )
    .sort((a, b) => a.pathname.localeCompare(b.pathname));
  return await enrichComponentSources(paths, sharedModules);
}

async function generateRegistry(
  sources: readonly ComponentSource[],
  shared: SharedTypeFacts,
  packageVersion: string,
): Promise<void> {
  const imports: string[] = [];
  const entries: string[] = [];
  for (const [index, source] of sources.entries()) {
    imports.push(
      `import meta${index}, { componentExampleVocabulary as componentExampleVocabulary${index} } from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, source.metaUrl))
      };`,
      `import * as examples${index} from ${
        JSON.stringify(relativeImport(GENERATED_ROOT, source.examplesUrl))
      };`,
    );
    let cliPreview: string;
    if (source.meta.cli.stance === "rendered") {
      const cliUrl = new URL(
        source.metaUrl.pathname.replace(/\.meta\.ts$/, ".cli.ts"),
        source.metaUrl,
      );
      imports.push(
        `import renderCli${index}, { cliExamples as cliExamples${index} } from ${
          JSON.stringify(relativeImport(GENERATED_ROOT, cliUrl))
        };`,
      );
      cliPreview =
        `renderedCliPreview(meta${index}, componentExampleVocabulary${index}, renderCli${index}, cliExamples${index})`;
    } else {
      cliPreview = `meta${index}.cli`;
    }
    entries.push(
      `  { meta: meta${index}, canonicalExamples: resolveComponentExampleVocabulary(meta${index}, componentExampleVocabulary${index}), webExamples: examplesFrom(meta${index}, componentExampleVocabulary${index}, examples${index}, ${
        JSON.stringify(source.examplesUrl.pathname)
      }), conformance: scenariosFrom(meta${index}, componentExampleVocabulary${index}, examples${index}, ${
        JSON.stringify(source.examplesUrl.pathname)
      }), builderDefaults: builderDefaultsFrom(examples${index}, ${
        JSON.stringify(source.examplesUrl.pathname)
      }), reactExport: ${
        JSON.stringify(source.reactExport)
      }, selection: selectionFrom(meta${index}, ${
        JSON.stringify(source.reactExport)
      }), propDocumentation: ${
        JSON.stringify(source.propDocumentation)
      }, variants: ${JSON.stringify(source.variants)}, objectTypes: ${
        JSON.stringify(source.objectTypes)
      }, cli: ${cliPreview} },`,
    );
  }
  const registry = `/* Generated by scripts/build.ts. Do not edit. */
import type { ComponentType } from "react";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../src/cli/contracts.ts";
import type { ComponentExampleDefinition, ResolvedComponentExampleDefinition } from "../../src/types/component-examples.ts";
import { componentExamplesForSurface, resolveComponentExampleVocabulary, validateComponentExampleImplementations } from "../../src/types/component-examples.ts";
import type { ComponentMeta } from "../../src/types/component-meta.ts";
import type {
  CatalogueExample,
  CatalogueObjectType,
  CataloguePropDocumentation,
  CatalogueVariant,
  ConformanceScenario,
} from "../conformance.ts";
import { validateComponentExampleCaptureDirective } from "../example-images/contract.ts";
${imports.join("\n")}

function builderDefaultsFrom(
  module: object,
  source: string,
): Readonly<Record<string, unknown>> {
  if (!("catalogueBuilderDefaults" in module)) return {};
  const defaults = module.catalogueBuilderDefaults;
  if (
    typeof defaults !== "object" || defaults === null ||
    Array.isArray(defaults)
  ) {
    throw new TypeError(
      \`\${source} catalogueBuilderDefaults export must be a data object\`,
    );
  }
  return defaults as Readonly<Record<string, unknown>>;
}

function examplesFrom(
  meta: ComponentMeta,
  vocabulary: readonly ComponentExampleDefinition[],
  module: object,
  source: string,
): readonly CatalogueExample[] {
  if (!("catalogueExamples" in module)) {
    throw new TypeError(
      \`\${meta.slug} Web examples in \${source} must export catalogueExamples\`,
    );
  }
  const implementations = module.catalogueExamples;
  if (!Array.isArray(implementations)) {
    throw new TypeError(\`\${source} catalogueExamples export must be an array\`);
  }
  const ids: string[] = [];
  const examples: Array<{
    readonly id: string;
    readonly Example: ComponentType;
    readonly capture?: CatalogueExample["capture"];
  }> = [];
  for (const value of implementations) {
    if (typeof value !== "object" || value === null) {
      throw new TypeError(\`\${source} contains a non-object Catalogue example\`);
    }
    const example = value as {
      readonly id?: unknown;
      readonly Example?: unknown;
    };
    if (typeof example.id !== "string") {
      throw new TypeError(
        \`\${meta.slug} Web examples in \${source} contain an invalid id\`,
      );
    }
    if (
      typeof example.Example !== "function" &&
      (typeof example.Example !== "object" || example.Example === null)
    ) {
      throw new TypeError(
        \`\${source} Catalogue example \${example.id} needs an Example\`,
      );
    }
    ids.push(example.id);
    if ("capture" in example && example.capture !== undefined) {
      validateComponentExampleCaptureDirective(
        example.capture as NonNullable<CatalogueExample["capture"]>,
        \`\${meta.slug}/\${example.id}\`,
      );
    }
    examples.push(example as {
      readonly id: string;
      readonly Example: ComponentType;
      readonly capture?: CatalogueExample["capture"];
    });
  }
  validateComponentExampleImplementations(
    meta,
    vocabulary,
    "web",
    ids,
    source,
  );
  const canonical = componentExamplesForSurface(meta, vocabulary, "web");
  return examples.map((example, index) => {
    const definition = canonical[index];
    if (definition === undefined) {
      throw new TypeError(\`\${meta.slug} Web example \${example.id} has no canonical definition\`);
    }
    return {
      id: definition.id,
      label: definition.label,
      Example: example.Example,
      ...(example.capture === undefined ? {} : { capture: example.capture }),
    };
  });
}

function scenariosFrom(
  meta: ComponentMeta,
  vocabulary: readonly ComponentExampleDefinition[],
  module: object,
  source: string,
): readonly ConformanceScenario[] {
  const scenarios = "conformance" in module ? module.conformance : [];
  if (!Array.isArray(scenarios)) {
    throw new TypeError(\`\${source} conformance export must be an array\`);
  }
  const webIds = new Set(
    componentExamplesForSurface(meta, vocabulary, "web").map(({ id }) => id),
  );
  for (const scenario of scenarios) {
    if (
      typeof scenario !== "object" || scenario === null ||
      !("example" in scenario) || typeof scenario.example !== "string" ||
      !webIds.has(scenario.example)
    ) {
      throw new TypeError(
        \`\${meta.slug} conformance scenario in \${source} must name one declared Web example; received \${JSON.stringify(
          typeof scenario === "object" && scenario !== null && "example" in scenario
            ? scenario.example
            : undefined,
        )}\`,
      );
    }
  }
  return scenarios as readonly ConformanceScenario[];
}

export interface CatalogueSelection {
  readonly component: string;
  readonly group: string;
  readonly reactImport: string;
}

export interface CatalogueCliExample {
  readonly id: string;
  readonly label: string;
  readonly props: unknown;
  readonly capabilities?: Readonly<Partial<TerminalCapabilities>>;
}

export interface CatalogueCliRenderedPreview {
  readonly stance: "rendered";
  readonly render: (
    props: unknown,
    capabilities: TerminalCapabilities,
  ) => string;
  readonly examples: readonly CatalogueCliExample[];
}

export interface CatalogueCliExemptPreview {
  readonly stance: "exempt";
  readonly reason: string;
}

export type CatalogueCliPreview =
  | CatalogueCliRenderedPreview
  | CatalogueCliExemptPreview;

function renderedCliPreview<Props>(
  meta: ComponentMeta,
  vocabulary: readonly ComponentExampleDefinition[],
  render: CliRenderer<Props>,
  examples: readonly CliExample<Props>[],
): CatalogueCliRenderedPreview {
  validateComponentExampleImplementations(
    meta,
    vocabulary,
    "cli",
    examples.map(({ name }) => name),
    \`\${meta.slug}.cli.ts\`,
  );
  const canonical = componentExamplesForSurface(meta, vocabulary, "cli");
  return {
    stance: "rendered",
    render: (props, capabilities) =>
      render(props as Readonly<Props>, capabilities),
    examples: examples.map(({ props, capabilities }, index) => {
      const definition = canonical[index];
      if (definition === undefined) {
        throw new TypeError(\`\${meta.slug} CLI example at \${index} has no canonical definition\`);
      }
      return {
        id: definition.id,
        label: definition.label,
        props,
        ...(capabilities === undefined ? {} : { capabilities }),
      };
    }),
  };
}

function selectionFrom(
  meta: ComponentMeta,
  reactExport: string,
): CatalogueSelection {
  return {
    component: "components: [" + JSON.stringify(meta.slug) + "],",
    group: "groups: [" + JSON.stringify(meta.group) + "],",
    reactImport:
      "import { " + reactExport +
      ' } from "@discern-sh/design-system/react";',
  };
}

export interface RegistryEntry {
  readonly meta: ComponentMeta;
  readonly canonicalExamples: readonly ResolvedComponentExampleDefinition[];
  readonly webExamples: readonly CatalogueExample[];
  readonly conformance: readonly ConformanceScenario[];
  readonly builderDefaults: Readonly<Record<string, unknown>>;
  readonly reactExport: string;
  readonly selection: CatalogueSelection;
  readonly propDocumentation: CataloguePropDocumentation;
  readonly variants: readonly CatalogueVariant[];
  readonly objectTypes: readonly CatalogueObjectType[];
  readonly cli: CatalogueCliPreview;
}

export const packageVersion = ${JSON.stringify(packageVersion)};

/** Variant unions declared by shared modules outside any one component. */
export const sharedModuleVariants: readonly CatalogueVariant[] = ${
    JSON.stringify(shared.variants)
  };

/** Object interfaces declared by shared modules outside any one component. */
export const sharedModuleObjectTypes: readonly CatalogueObjectType[] = ${
    JSON.stringify(shared.objectTypes)
  };

export const registry: readonly RegistryEntry[] = [
${entries.join("\n")}
];

/** Resolve one bounded Web renderer by stable Component slug and example id. */
export function catalogueWebExample(
  slug: string,
  id: string,
): CatalogueExample {
  const entry = registry.find(({ meta }) => meta.slug === slug);
  if (entry === undefined) {
    throw new TypeError(\`Unknown Catalogue Component \${JSON.stringify(slug)}\`);
  }
  const example = entry.webExamples.find((candidate) => candidate.id === id);
  if (example === undefined) {
    throw new TypeError(
      \`\${slug} has no Web-capable canonical example \${JSON.stringify(id)}\`,
    );
  }
  return example;
}
`;
  await Deno.mkdir(GENERATED_ROOT, { recursive: true });
  await Deno.writeTextFile(new URL("registry.ts", GENERATED_ROOT), registry);
}

async function packageVersion(): Promise<string> {
  const parsed: unknown = JSON.parse(
    await Deno.readTextFile(new URL("../deno.json", import.meta.url)),
  );
  const version = asRecord(parsed, "deno.json").version;
  if (typeof version !== "string" || !version.trim()) {
    throw new TypeError("deno.json version must be a non-empty string");
  }
  return version;
}

const CATALOGUE_BUNDLES = [
  { entry: "catalogue/app.tsx", output: "dist/catalogue.js" },
  { entry: "catalogue/builder/app.tsx", output: "dist/builder.js" },
  {
    entry: "catalogue/example-images/capture.tsx",
    output: "dist/example-image-capture.js",
  },
] as const;

async function bundleCatalogue(): Promise<void> {
  for (const { entry, output } of CATALOGUE_BUNDLES) {
    const command = new Deno.Command(Deno.execPath(), {
      cwd: decodeURIComponent(ROOT.pathname),
      args: [
        "bundle",
        "--platform=browser",
        "--format=esm",
        "--sourcemap=linked",
        entry,
        `--output=${output}`,
      ],
      stdout: "inherit",
      stderr: "inherit",
    });
    const result = await command.output();
    if (!result.success) {
      throw new Error(
        `Catalogue bundle ${entry} failed with exit code ${result.code}`,
      );
    }
  }
}

async function writeCatalogueMarkdownAsset(
  source: string,
  svg: string,
): Promise<void> {
  const mount = "/catalogue/";
  if (!source.startsWith(mount)) {
    throw new TypeError(
      "Catalogue Markdown asset source must use the Catalogue mount",
    );
  }
  const target = new URL(source.slice(mount.length), CATALOGUE_ROOT);
  if (!target.pathname.startsWith(GENERATED_ROOT.pathname)) {
    throw new TypeError(
      "Catalogue Markdown asset must stay under catalogue/generated",
    );
  }
  await Deno.mkdir(new URL("./", target), { recursive: true });
  await Deno.writeTextFile(target, svg);
}

async function writeCatalogueMarkdownAssets(): Promise<void> {
  const [
    { renderDiagramSvg },
    { markdownDiagramExampleSource, markdownDiagramExampleSpec },
    { renderChartSvg },
    { markdownChartExampleSource, markdownChartExampleSpec },
  ] = await Promise.all([
    import("../src/diagram/svg.ts"),
    import("../src/diagram/markdown.example.ts"),
    import("../src/chart/svg.ts"),
    import("../src/chart/markdown.example.ts"),
  ]);
  await writeCatalogueMarkdownAsset(
    markdownDiagramExampleSource,
    renderDiagramSvg(markdownDiagramExampleSpec, { theme: "adaptive" }),
  );
  await writeCatalogueMarkdownAsset(
    markdownChartExampleSource,
    renderChartSvg(markdownChartExampleSpec, { theme: "adaptive" }),
  );
}

const LANDING_ROOT = new URL("../dist/landing/", import.meta.url);
const LANDING_BEHAVIORS = new URL(
  "../catalogue/landing/behaviors/",
  import.meta.url,
);

/** Copy every page-owned browser behavior and return the built paths. */
async function copyLandingBehaviors(): Promise<readonly string[]> {
  const scripts: string[] = [];
  for await (const entry of Deno.readDir(LANDING_BEHAVIORS)) {
    if (!entry.isFile || !entry.name.endsWith(".js")) continue;
    scripts.push(entry.name);
  }
  scripts.sort();
  for (const script of scripts) {
    await Deno.copyFile(
      new URL(script, LANDING_BEHAVIORS),
      new URL(script, LANDING_ROOT),
    );
  }
  return scripts;
}

/**
 * Emit the landing page's selection-scoped runtime, then render the static
 * landing document from that emission's own manifest facts. Runs after the
 * all-component emission because each emission replaces its output root.
 */
async function buildLandingPage(version: string): Promise<void> {
  const { emitDesignSystemRuntime } = await import("../src/runtime.ts");
  const { landingSystemFacts } = await import(
    "../catalogue/landing/facts.ts"
  );
  const { landingAssets, landingSelection, renderLandingHtml } = await import(
    "../catalogue/landing/page.tsx"
  );
  const summary = await emitDesignSystemRuntime({
    outputRoot: LANDING_ROOT,
    components: landingSelection,
    assets: landingAssets,
  });
  const pageScripts = await copyLandingBehaviors();
  const css = summary.manifest.integrity.files.find((file) =>
    file.path === "discern.css"
  );
  if (css === undefined) {
    throw new Error("Landing emission recorded no discern.css integrity");
  }
  await Deno.writeTextFile(
    new URL("index.html", LANDING_ROOT),
    renderLandingHtml({
      version,
      system: landingSystemFacts,
      emission: {
        resolvedComponents: summary.manifest.selection.resolvedComponents
          .length,
        cssBytes: css.bytes,
        cssIntegrity: css.integrity,
        scripts: summary.manifest.outputs.scripts,
      },
      pageScripts,
    }),
  );
}

/** Build the React catalogue, its all-component runtime, and the landing page. */
export async function buildDesignSystem(): Promise<BuildSummary> {
  await writeGeneratedSources();
  const { sources, shared } = await discoverComponents();
  const version = await packageVersion();
  await generateRegistry(sources, shared, version);
  await writeCatalogueMarkdownAssets();
  const { emitDesignSystemRuntime } = await import("../src/runtime.ts");
  const summary = await emitDesignSystemRuntime({
    outputRoot: DIST_ROOT,
    all: true,
    assets: ["fonts", "grain"],
  });
  if (summary.components !== sources.length) {
    throw new Error("Catalogue and runtime component discovery disagree");
  }
  await bundleCatalogue();
  await buildLandingPage(version);
  return summary;
}

if (import.meta.main) {
  const summary = await buildDesignSystem();
  console.log(
    `Built ${summary.components} components and ${summary.tokens} tokens.`,
  );
}
