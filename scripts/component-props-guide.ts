/**
 * Project the React adapter's documented props into the author guide.
 *
 * The facts come from `deno doc --json --private` over every Component's
 * implementation and `mod.ts`, so the guide states the props interface,
 * what it extends, each property with its type and one-line doc, and every
 * package type the properties reference — item shapes and tone unions
 * included — without a consumer running `deno doc` symbol by symbol.
 * The renderer is pure; `scripts/generate.ts` runs the documenter.
 */

/** One `deno doc --json` type node; only the kinds the renderer reads are typed. */
export interface DocumentedType {
  readonly kind: string;
  readonly repr?: string;
  readonly value?: unknown;
}

/** One documented property of an interface or type literal. */
export interface DocumentedProperty {
  readonly name: string;
  readonly optional?: boolean;
  readonly readonly?: boolean;
  readonly tsType?: DocumentedType;
  readonly jsDoc?: { readonly doc?: string };
}

/** One declaration beneath a documented symbol. */
export interface DocumentedDeclaration {
  readonly kind: string;
  readonly declarationKind?: string;
  readonly location: { readonly filename: string };
  readonly jsDoc?: { readonly doc?: string };
  readonly def?: {
    readonly extends?: readonly DocumentedType[];
    readonly properties?: readonly DocumentedProperty[];
    readonly tsType?: DocumentedType;
    readonly typeParams?: readonly { readonly name: string }[];
  };
}

/** One symbol from the `symbols` list of a documented module. */
export interface DocumentedSymbol {
  readonly name: string;
  readonly declarations: readonly DocumentedDeclaration[];
}

/** The `deno doc --json` document: modules keyed by specifier. */
export interface DocumentedGraph {
  readonly nodes: Readonly<
    Record<string, { readonly symbols?: readonly DocumentedSymbol[] }>
  >;
}

interface TypeRefValue {
  readonly typeName?: string;
  readonly typeParams?: readonly DocumentedType[];
  readonly resolution?: {
    readonly kind: string;
    readonly specifier?: string;
    readonly name?: string;
  };
}

interface Reference {
  readonly name: string;
  /** The module the reference should resolve in, when the doc says so. */
  readonly filename?: string;
}

const MAXIMUM_DEPTH = 4;

function asTypes(value: unknown): readonly DocumentedType[] {
  return Array.isArray(value) ? value as DocumentedType[] : [];
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
}

/** Render one documented type the way an author would write it. */
export function formatDocumentedType(type: DocumentedType | undefined): string {
  if (type === undefined) return "unknown";
  const value = record(type.value);
  switch (type.kind) {
    case "keyword":
      return String(type.value ?? type.repr ?? "unknown");
    case "literal": {
      if (value.kind === "string") return JSON.stringify(value.string);
      if (value.kind === "template") return `\`${type.repr ?? ""}\``;
      return String(type.repr ?? value.number ?? value.boolean ?? "");
    }
    case "typeRef": {
      const ref = type.value as TypeRefValue;
      const name = ref.typeName ?? type.repr ?? "unknown";
      const params = ref.typeParams ?? [];
      return params.length === 0
        ? name
        : `${name}<${params.map(formatDocumentedType).join(", ")}>`;
    }
    case "union":
      return asTypes(type.value).map(formatDocumentedType).join(" | ");
    case "intersection":
      return asTypes(type.value).map(formatDocumentedType).join(" & ");
    case "array": {
      const inner = type.value as DocumentedType;
      const rendered = formatDocumentedType(inner);
      return inner.kind === "union" || inner.kind === "intersection" ||
          inner.kind === "fnOrConstructor"
        ? `(${rendered})[]`
        : `${rendered}[]`;
    }
    case "typeOperator":
      return `${String(value.operator)} ${
        formatDocumentedType(value.tsType as DocumentedType)
      }`;
    case "parenthesized":
      return `(${formatDocumentedType(type.value as DocumentedType)})`;
    case "typeQuery":
      return `typeof ${String(type.value ?? type.repr ?? "")}`;
    case "indexedAccess":
      return `${formatDocumentedType(value.objType as DocumentedType)}[${
        formatDocumentedType(value.indexType as DocumentedType)
      }]`;
    case "tuple":
      return `[${asTypes(type.value).map(formatDocumentedType).join(", ")}]`;
    case "fnOrConstructor": {
      const params = (Array.isArray(value.params) ? value.params : []) as {
        readonly name?: string;
        readonly optional?: boolean;
        readonly tsType?: DocumentedType;
      }[];
      const rendered = params.map((param) =>
        `${param.name ?? "argument"}${param.optional ? "?" : ""}: ${
          formatDocumentedType(param.tsType)
        }`
      ).join(", ");
      return `${value.constructor ? "new " : ""}(${rendered}) => ${
        formatDocumentedType(value.tsType as DocumentedType)
      }`;
    }
    case "typeLiteral": {
      const properties =
        (Array.isArray(value.properties)
          ? value.properties
          : []) as DocumentedProperty[];
      return `{ ${properties.map(formatProperty).join("; ")} }`;
    }
    default:
      return type.repr === undefined || type.repr === ""
        ? "unknown"
        : type.repr;
  }
}

function formatProperty(property: DocumentedProperty): string {
  return `${property.name}${property.optional ? "?" : ""}: ${
    formatDocumentedType(property.tsType)
  }`;
}

function firstSentence(doc: string | undefined): string | undefined {
  if (doc === undefined) return undefined;
  const line = doc.split("\n").map((part) => part.trim()).filter(Boolean)[0];
  return line === undefined
    ? undefined
    : line.replaceAll(/\{@linkcode ([^}]+)\}/gu, "`$1`");
}

function referencesIn(
  type: DocumentedType | undefined,
  filename: string,
  out: Reference[],
): void {
  if (type === undefined) return;
  const value = record(type.value);
  if (type.kind === "typeRef") {
    const ref = type.value as TypeRefValue;
    const resolution = ref.resolution;
    if (ref.typeName !== undefined && resolution !== undefined) {
      if (resolution.kind === "local") {
        out.push({ name: ref.typeName, filename });
      } else if (
        resolution.kind === "import" && resolution.specifier?.startsWith(".")
      ) {
        out.push({
          name: resolution.name ?? ref.typeName,
          filename: new URL(resolution.specifier, filename).href,
        });
      }
    }
    for (const param of ref.typeParams ?? []) {
      referencesIn(param, filename, out);
    }
    return;
  }
  if (type.kind === "typeQuery") {
    out.push({ name: String(type.value ?? ""), filename });
    return;
  }
  for (const child of asTypes(type.value)) referencesIn(child, filename, out);
  for (const key of ["tsType", "objType", "indexType"] as const) {
    if (value[key] !== undefined) {
      referencesIn(value[key] as DocumentedType, filename, out);
    }
  }
  if (Array.isArray(value.params)) {
    for (
      const param of value.params as { readonly tsType?: DocumentedType }[]
    ) {
      referencesIn(param.tsType, filename, out);
    }
  }
  if (Array.isArray(value.properties)) {
    for (const property of value.properties as DocumentedProperty[]) {
      referencesIn(property.tsType, filename, out);
    }
  }
  if (type.kind === "array" && typeof type.value === "object") {
    referencesIn(type.value as DocumentedType, filename, out);
  }
}

/** Every documented declaration, indexed by module and by bare name. */
export class DocumentedSymbolIndex {
  readonly #byModule = new Map<string, Map<string, DocumentedDeclaration>>();
  readonly #byName = new Map<string, DocumentedDeclaration[]>();

  constructor(graph: DocumentedGraph) {
    for (const node of Object.values(graph.nodes)) {
      for (const symbol of node.symbols ?? []) {
        for (const declaration of symbol.declarations) {
          const filename = declaration.location.filename;
          const module = this.#byModule.get(filename) ?? new Map();
          if (!module.has(symbol.name)) module.set(symbol.name, declaration);
          this.#byModule.set(filename, module);
          const named = this.#byName.get(symbol.name) ?? [];
          if (!named.includes(declaration)) named.push(declaration);
          this.#byName.set(symbol.name, named);
        }
      }
    }
  }

  /** Resolve a reference in its own module first, then anywhere by name. */
  resolve(reference: Reference): DocumentedDeclaration | undefined {
    if (reference.filename !== undefined) {
      const local = this.#byModule.get(reference.filename)?.get(reference.name);
      if (local !== undefined) return local;
    }
    const candidates = this.#byName.get(reference.name) ?? [];
    if (reference.filename !== undefined) {
      const folder = reference.filename.slice(
        0,
        reference.filename.lastIndexOf("/") + 1,
      );
      const sibling = candidates.find((candidate) =>
        candidate.location.filename.startsWith(folder)
      );
      if (sibling !== undefined) return sibling;
    }
    return candidates[0];
  }
}

function declarationLine(
  name: string,
  declaration: DocumentedDeclaration,
): string {
  const doc = firstSentence(declaration.jsDoc?.doc);
  const suffix = doc === undefined ? "" : ` — ${doc}`;
  const def = declaration.def ?? {};
  if (declaration.kind === "interface") {
    const extended = (def.extends ?? []).map(formatDocumentedType);
    const properties = (def.properties ?? []).map(formatProperty);
    const shape = `{ ${properties.join("; ")} }`;
    return `- ${name}: ${
      extended.length === 0 ? shape : `${extended.join(" & ")} & ${shape}`
    }${suffix}`;
  }
  if (declaration.kind === "typeAlias") {
    return `- ${name}: ${formatDocumentedType(def.tsType)}${suffix}`;
  }
  if (declaration.kind === "variable") {
    return `- ${name}: ${formatDocumentedType(def.tsType)}${suffix}`;
  }
  return `- ${name}: ${declaration.kind}${suffix}`;
}

/**
 * Render the props block for one Component: the props declaration, every
 * property with its type and doc, then each referenced package type.
 * Throws when the documented surface lacks the props type, so a Component
 * whose adapter stops exporting `<Pascal>Props` fails generation.
 */
export function renderComponentPropsGuide(
  index: DocumentedSymbolIndex,
  pascal: string,
): readonly string[] {
  const propsName = `${pascal}Props`;
  const props = index.resolve({ name: propsName });
  if (props === undefined) {
    throw new Error(
      `${propsName} is not documented on the React surface; every Component adapter exports <Pascal>Props`,
    );
  }
  const filename = props.location.filename;
  const def = props.def ?? {};
  const lines: string[] = [];
  const pending: Reference[] = [];
  if (props.kind === "interface") {
    const extended = (def.extends ?? []).map(formatDocumentedType);
    lines.push(
      `Props: \`${propsName}\`${
        extended.length === 0 ? "" : ` extends ${extended.join(", ")}`
      }.`,
    );
    for (const extend of def.extends ?? []) {
      referencesIn(extend, filename, pending);
    }
    for (const property of def.properties ?? []) {
      const doc = firstSentence(property.jsDoc?.doc);
      lines.push(
        `- ${formatProperty(property)}${doc === undefined ? "" : ` — ${doc}`}`,
      );
      referencesIn(property.tsType, filename, pending);
    }
  } else {
    lines.push(
      `Props: \`${propsName}\` is ${formatDocumentedType(def.tsType)}.`,
    );
    referencesIn(def.tsType, filename, pending);
  }
  const rendered = new Set<string>([propsName]);
  let depth = 0;
  let frontier = pending;
  while (frontier.length > 0 && depth < MAXIMUM_DEPTH) {
    const next: Reference[] = [];
    for (const reference of frontier) {
      if (rendered.has(reference.name)) continue;
      rendered.add(reference.name);
      const declaration = index.resolve(reference);
      if (declaration === undefined) continue;
      lines.push(declarationLine(reference.name, declaration));
      const inner = declaration.def ?? {};
      for (const extend of inner.extends ?? []) {
        referencesIn(extend, declaration.location.filename, next);
      }
      for (const property of inner.properties ?? []) {
        referencesIn(property.tsType, declaration.location.filename, next);
      }
      referencesIn(inner.tsType, declaration.location.filename, next);
    }
    frontier = next;
    depth += 1;
  }
  return lines;
}
