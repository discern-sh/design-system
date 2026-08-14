import type { BuildSummary } from "../src/runtime.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";
import { stripVTControlCharacters } from "node:util";
import type {
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
const DIST_ROOT = new URL(
  `../${DESIGN_SYSTEM_BUILD_OUTPUTS.runtime}`,
  import.meta.url,
);

interface ComponentPaths {
  readonly metaUrl: URL;
  readonly examplesUrl: URL;
  readonly componentUrl: URL;
}

interface ComponentSource extends ComponentPaths {
  readonly meta: ComponentMeta;
  readonly reactExport: string;
  readonly propDocumentation: CataloguePropDocumentation;
  readonly variants: readonly CatalogueVariant[];
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
  if (typeof type.repr === "string" && type.repr.length > 0) {
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

function propDescription(
  property: Record<string, unknown>,
): string | undefined {
  if (property.jsDoc === undefined) return undefined;
  const doc = asRecord(property.jsDoc, "prop jsDoc").doc;
  return typeof doc === "string" && doc.trim() ? doc.trim() : undefined;
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
    return {
      status: "unavailable",
      typeName,
      reason: `${typeName} is a source union (${
        renderDocType(
          definition.tsType,
          `${typeName}.type`,
        )
      }); flattening its branches would hide their contract.`,
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
  const properties = definition.properties === undefined
    ? []
    : asArray(definition.properties, `${typeName}.properties`);
  const props: CatalogueProp[] = properties.map((value, index) => {
    const property = asRecord(value, `${typeName}.properties[${index}]`);
    const description = propDescription(property);
    return {
      name: requiredString(
        property.name,
        `${typeName}.properties[${index}].name`,
      ),
      type: renderDocType(
        property.tsType,
        `${typeName}.properties[${index}].type`,
      ),
      required: property.optional !== true,
      ...(description === undefined ? {} : { description }),
    };
  });
  return { status: "available", typeName, inheritedTypes, props };
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

function extractVariants(symbols: readonly unknown[]): CatalogueVariant[] {
  const variants: CatalogueVariant[] = [];
  for (const value of symbols) {
    const symbol = asRecord(value, "deno doc symbol");
    const typeName = requiredString(symbol.name, "deno doc symbol.name");
    if (typeName.endsWith("Props")) continue;
    const declaration = symbolDeclaration(symbols, typeName);
    if (declaration?.kind !== "typeAlias") continue;
    const definition = asRecord(
      declaration.def,
      `deno doc declaration ${typeName}.def`,
    );
    const values = literalUnionValues(definition.tsType);
    if (values !== undefined && values.length > 0) {
      variants.push({ typeName, values });
    }
  }
  return variants;
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
): Promise<ComponentSource[]> {
  const metadata = await Promise.all(paths.map(async (source) => {
    const module = await import(source.metaUrl.href) as {
      default: ComponentMeta;
    };
    return module.default;
  }));
  const command = new Deno.Command(Deno.execPath(), {
    cwd: decodeURIComponent(ROOT.pathname),
    args: [
      "doc",
      "--json",
      ...paths.map(({ componentUrl }) =>
        decodeURIComponent(componentUrl.pathname)
      ),
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

  return paths.map((source, index) => {
    const meta = metadata[index];
    if (meta === undefined) {
      throw new TypeError(`Missing metadata for ${source.metaUrl.pathname}`);
    }
    const reactExport = pascalCase(meta.slug);
    const document = asRecord(
      nodes[source.componentUrl.href],
      `deno doc node for ${source.componentUrl.pathname}`,
    );
    const symbols = asArray(
      document.symbols,
      `deno doc symbols for ${source.componentUrl.pathname}`,
    );
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
      variants: extractVariants(symbols),
    };
  });
}

async function discoverComponents(): Promise<ComponentSource[]> {
  const files = await walk(COMPONENT_ROOT);
  const metaFiles = files.filter((url) => url.pathname.endsWith(".meta.ts"))
    .sort((a, b) => a.pathname.localeCompare(b.pathname));
  const paths = metaFiles.map((metaUrl) => {
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
    return { metaUrl, examplesUrl, componentUrl };
  });
  return await enrichComponentSources(paths);
}

async function generateRegistry(
  sources: readonly ComponentSource[],
  packageVersion: string,
): Promise<void> {
  const imports: string[] = [];
  const entries: string[] = [];
  for (const [index, source] of sources.entries()) {
    imports.push(
      `import meta${index} from ${
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
      cliPreview = `renderedCliPreview(renderCli${index}, cliExamples${index})`;
    } else {
      cliPreview = `meta${index}.cli`;
    }
    entries.push(
      `  { meta: meta${index}, Examples: examples${index}.default, states: statesFrom(examples${index}, ${
        JSON.stringify(source.examplesUrl.pathname)
      }), conformance: scenariosFrom(examples${index}, ${
        JSON.stringify(source.examplesUrl.pathname)
      }), reactExport: ${
        JSON.stringify(source.reactExport)
      }, selection: selectionFrom(meta${index}, ${
        JSON.stringify(source.reactExport)
      }), propDocumentation: ${
        JSON.stringify(source.propDocumentation)
      }, variants: ${JSON.stringify(source.variants)}, cli: ${cliPreview} },`,
    );
  }
  const registry = `/* Generated by scripts/build.ts. Do not edit. */
import type { ComponentType } from "react";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../src/cli/contracts.ts";
import type { ComponentMeta } from "../../src/types/component-meta.ts";
import type {
  CatalogueExampleState,
  CataloguePropDocumentation,
  CatalogueVariant,
  ConformanceScenario,
} from "../conformance.ts";
${imports.join("\n")}

function statesFrom(
  module: object,
  source: string,
): readonly CatalogueExampleState[] {
  const states = "catalogueStates" in module
    ? module.catalogueStates
    : [{
      name: "default",
      label: "Default",
      Example: "default" in module ? module.default : undefined,
    }];
  if (!Array.isArray(states)) {
    throw new TypeError(\`\${source} catalogueStates export must be an array\`);
  }
  const names = new Set<string>();
  for (const value of states) {
    if (typeof value !== "object" || value === null) {
      throw new TypeError(\`\${source} contains a non-object Catalogue state\`);
    }
    const state = value as {
      readonly name?: unknown;
      readonly label?: unknown;
      readonly Example?: unknown;
    };
    if (
      typeof state.name !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.name)
    ) {
      throw new TypeError(
        \`\${source} Catalogue state names must be stable kebab-case\`,
      );
    }
    if (names.has(state.name)) {
      throw new TypeError(
        \`\${source} repeats Catalogue state \${state.name}\`,
      );
    }
    if (typeof state.label !== "string" || !state.label.trim()) {
      throw new TypeError(
        \`\${source} Catalogue state \${state.name} needs a label\`,
      );
    }
    if (
      typeof state.Example !== "function" &&
      (typeof state.Example !== "object" || state.Example === null)
    ) {
      throw new TypeError(
        \`\${source} Catalogue state \${state.name} needs an Example\`,
      );
    }
    names.add(state.name);
  }
  return states as readonly CatalogueExampleState[];
}

function scenariosFrom(
  module: object,
  source: string,
): readonly ConformanceScenario[] {
  const scenarios = "conformance" in module ? module.conformance : [];
  if (!Array.isArray(scenarios)) {
    throw new TypeError(\`\${source} conformance export must be an array\`);
  }
  return scenarios as readonly ConformanceScenario[];
}

export interface CatalogueSelection {
  readonly component: string;
  readonly group: string;
  readonly reactImport: string;
}

export interface CatalogueCliExample {
  readonly name: string;
  readonly props: unknown;
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
  render: CliRenderer<Props>,
  examples: readonly CliExample<Props>[],
): CatalogueCliRenderedPreview {
  if (examples.length === 0) {
    throw new TypeError("Rendered CLI Components need a Catalogue example");
  }
  return {
    stance: "rendered",
    render: (props, capabilities) =>
      render(props as Readonly<Props>, capabilities),
    examples: examples.map(({ name, props }) => ({ name, props })),
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
  readonly Examples: ComponentType;
  readonly states: readonly CatalogueExampleState[];
  readonly conformance: readonly ConformanceScenario[];
  readonly reactExport: string;
  readonly selection: CatalogueSelection;
  readonly propDocumentation: CataloguePropDocumentation;
  readonly variants: readonly CatalogueVariant[];
  readonly cli: CatalogueCliPreview;
}

export const packageVersion = ${JSON.stringify(packageVersion)};
export const registry: readonly RegistryEntry[] = [
${entries.join("\n")}
];
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

async function bundleCatalogue(): Promise<void> {
  const command = new Deno.Command(Deno.execPath(), {
    cwd: decodeURIComponent(ROOT.pathname),
    args: [
      "bundle",
      "--platform=browser",
      "--format=esm",
      "--sourcemap=linked",
      "catalogue/app.tsx",
      "--output=dist/catalogue.js",
    ],
    stdout: "inherit",
    stderr: "inherit",
  });
  const result = await command.output();
  if (!result.success) {
    throw new Error(`Catalogue bundle failed with exit code ${result.code}`);
  }
}

/** Build the React catalogue and its explicit all-component runtime. */
export async function buildDesignSystem(): Promise<BuildSummary> {
  await writeGeneratedSources();
  const sources = await discoverComponents();
  await generateRegistry(sources, await packageVersion());
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
  return summary;
}

if (import.meta.main) {
  const summary = await buildDesignSystem();
  console.log(
    `Built ${summary.components} components and ${summary.tokens} tokens.`,
  );
}
