/**
 * Export surfaces for builder documents: consumer-idiom TSX source using
 * `@discern-sh/design-system/react`, the runtime bundle selection line, and
 * the JSON save format with validating import.
 */
import type {
  BuilderDocument,
  BuilderNode,
  BuilderPropValue,
  BuilderSlotChild,
} from "./model.ts";

/** How exported TSX resolves a placed slug to its React adapter export. */
export interface ExportNaming {
  readonly slugToExport: ReadonlyMap<string, string>;
}

const REACT_MODULE = "@discern-sh/design-system/react";

/** Raised when a document cannot be exported or parsed; message names the spot. */
export class BuilderDocumentError extends Error {
  override readonly name = "BuilderDocumentError";
}

function exportName(node: BuilderNode, naming: ExportNaming): string {
  const name = naming.slugToExport.get(node.slug);
  if (name === undefined) {
    throw new BuilderDocumentError(
      `The document places unknown component "${node.slug}".`,
    );
  }
  return name;
}

function pascalIdentifier(name: string): string {
  const words = name.match(/[A-Za-z0-9]+/g) ?? [];
  const identifier = words
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join("");
  return /^[A-Za-z]/.test(identifier) ? identifier : "ComposedPage";
}

function safeJsxText(text: string): boolean {
  return !/[{}<>\\]/.test(text) && text === text.trim() && text !== "";
}

function safeAttributeString(text: string): boolean {
  return !/["\\\n\r{}<>]/.test(text);
}

function parsedJsonSource(source: string, spot: string): string {
  try {
    return JSON.stringify(JSON.parse(source));
  } catch {
    throw new BuilderDocumentError(
      `${spot} holds invalid JSON. Fix it before exporting.`,
    );
  }
}

function scalarAttribute(
  name: string,
  value: BuilderPropValue,
  spot: string,
): string {
  switch (value.kind) {
    case "string":
      return safeAttributeString(value.value)
        ? `${name}="${value.value}"`
        : `${name}={${JSON.stringify(value.value)}}`;
    case "number":
      return `${name}={${String(value.value)}}`;
    case "boolean":
      return value.value ? name : `${name}={false}`;
    case "json":
      return `${name}={${parsedJsonSource(value.source, spot)}}`;
    case "slot":
      throw new BuilderDocumentError(`${spot} is a slot, not a scalar.`);
  }
}

function renderChild(
  child: BuilderSlotChild,
  naming: ExportNaming,
  indent: number,
): string {
  const pad = "  ".repeat(indent);
  if (child.kind === "text") {
    return safeJsxText(child.text)
      ? `${pad}${child.text}`
      : `${pad}{${JSON.stringify(child.text)}}`;
  }
  return renderNode(child, naming, indent);
}

function slotExpression(
  children: readonly BuilderSlotChild[],
  naming: ExportNaming,
): string {
  const only = children.length === 1 ? children[0] : undefined;
  if (only !== undefined && only.kind === "text") {
    return safeAttributeString(only.text)
      ? `"${only.text}"`
      : `{${JSON.stringify(only.text)}}`;
  }
  if (only !== undefined) {
    return `{\n${renderNode(only, naming, 1)}\n}`;
  }
  const body = children
    .map((child) => renderChild(child, naming, 2))
    .join("\n");
  return `{\n  <>\n${body}\n  </>\n}`;
}

function renderNode(
  node: BuilderNode,
  naming: ExportNaming,
  indent: number,
): string {
  const pad = "  ".repeat(indent);
  const tag = exportName(node, naming);
  const attributes: string[] = [];
  let childSlot: readonly BuilderSlotChild[] = [];
  for (const [name, value] of Object.entries(node.props)) {
    const spot = `<${tag}> prop "${name}"`;
    if (value.kind !== "slot") {
      attributes.push(scalarAttribute(name, value, spot));
      continue;
    }
    if (value.children.length === 0) continue;
    if (name === "children") {
      childSlot = value.children;
      continue;
    }
    attributes.push(`${name}=${slotExpression(value.children, naming)}`);
  }
  if (node.extra !== undefined) {
    const source = parsedJsonSource(node.extra, `<${tag}> additional props`);
    attributes.push(`{...${source}}`);
  }

  const inlineAttributes = attributes.length === 0 ? "" : ` ${attributes.join(" ")}`;
  const multiline = attributes.some((attribute) => attribute.includes("\n")) ||
    pad.length + tag.length + inlineAttributes.length > 76;
  const open = multiline
    ? `${pad}<${tag}\n${
      attributes.map((attribute) =>
        `${pad}  ${attribute.split("\n").join(`\n${pad}  `)}`
      ).join("\n")
    }\n${pad}`
    : `${pad}<${tag}${inlineAttributes}`;

  if (childSlot.length === 0) return multiline ? `${open}/>` : `${open} />`;
  const body = childSlot
    .map((child) => renderChild(child, naming, indent + 1))
    .join("\n");
  return `${open}>\n${body}\n${pad}</${tag}>`;
}

/** Consumer-ready TSX source for the document's component tree. */
export function documentToTsx(
  document: BuilderDocument,
  naming: ExportNaming,
): string {
  const names = collectExportNames(document, naming);
  const importList = names.join(", ");
  const importLine = importList.length + REACT_MODULE.length + 26 <= 80
    ? `import { ${importList} } from "${REACT_MODULE}";`
    : `import {\n${names.map((name) => `  ${name},`).join("\n")}\n} from "${REACT_MODULE}";`;

  const componentName = pascalIdentifier(document.name);
  const body = document.children.length === 0
    ? "  return null;"
    : document.children.length === 1 && document.children[0] !== undefined
    ? `  return (\n${renderChild(document.children[0], naming, 2)}\n  );`
    : `  return (\n    <>\n${
      document.children.map((child) => renderChild(child, naming, 3)).join("\n")
    }\n    </>\n  );`;

  const header = names.length === 0 ? "" : `${importLine}\n\n`;
  return `${header}/** ${document.name} — composed with the Discern interface builder. */\nexport function ${componentName}() {\n${body}\n}\n`;
}

function collectExportNames(
  document: BuilderDocument,
  naming: ExportNaming,
): readonly string[] {
  const names = new Set<string>();
  const visit = (children: readonly BuilderSlotChild[]): void => {
    for (const child of children) {
      if (child.kind !== "component") continue;
      names.add(exportName(child, naming));
      for (const value of Object.values(child.props)) {
        if (value.kind === "slot") visit(value.children);
      }
    }
  };
  visit(document.children);
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** The bundle-selection line consumer sites paste into their emitter config. */
export function documentSelectionSnippet(document: BuilderDocument): string {
  const slugs = new Set<string>();
  const visit = (children: readonly BuilderSlotChild[]): void => {
    for (const child of children) {
      if (child.kind !== "component") continue;
      slugs.add(child.slug);
      for (const value of Object.values(child.props)) {
        if (value.kind === "slot") visit(value.children);
      }
    }
  };
  visit(document.children);
  const sorted = [...slugs].sort((a, b) => a.localeCompare(b));
  return `components: [${sorted.map((slug) => JSON.stringify(slug)).join(", ")}],`;
}

/** The document's JSON save format. */
export function serializeDocument(document: BuilderDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

function fail(path: string, expectation: string): never {
  throw new BuilderDocumentError(`${path} ${expectation}.`);
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "must be an object");
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string" || value === "") {
    fail(path, "must be a non-empty string");
  }
  return value;
}

function parsePropValue(value: unknown, path: string, state: ParseState): BuilderPropValue {
  const record = asRecord(value, path);
  switch (record.kind) {
    case "string":
      return typeof record.value === "string"
        ? { kind: "string", value: record.value }
        : fail(`${path}.value`, "must be a string");
    case "number":
      return typeof record.value === "number" && Number.isFinite(record.value)
        ? { kind: "number", value: record.value }
        : fail(`${path}.value`, "must be a finite number");
    case "boolean":
      return typeof record.value === "boolean"
        ? { kind: "boolean", value: record.value }
        : fail(`${path}.value`, "must be a boolean");
    case "json":
      return { kind: "json", source: asString(record.source, `${path}.source`) };
    case "slot": {
      if (!Array.isArray(record.children)) {
        fail(`${path}.children`, "must be an array");
      }
      return {
        kind: "slot",
        children: record.children.map((child, index) =>
          parseChild(child, `${path}.children[${index}]`, state)
        ),
      };
    }
    default:
      return fail(`${path}.kind`, "must name a known prop value kind");
  }
}

interface ParseState {
  readonly knownSlugs: ReadonlySet<string>;
  readonly seenIds: Set<string>;
}

function parseChild(
  value: unknown,
  path: string,
  state: ParseState,
): BuilderSlotChild {
  const record = asRecord(value, path);
  const id = asString(record.id, `${path}.id`);
  if (state.seenIds.has(id)) fail(`${path}.id`, "repeats an earlier id");
  state.seenIds.add(id);
  if (record.kind === "text") {
    return typeof record.text === "string"
      ? { kind: "text", id, text: record.text }
      : fail(`${path}.text`, "must be a string");
  }
  if (record.kind !== "component") {
    fail(`${path}.kind`, 'must be "text" or "component"');
  }
  const slug = asString(record.slug, `${path}.slug`);
  if (!state.knownSlugs.has(slug)) {
    fail(`${path}.slug`, `names unknown component "${slug}"`);
  }
  const propsRecord = asRecord(record.props ?? {}, `${path}.props`);
  const props: Record<string, BuilderPropValue> = {};
  for (const [name, propValue] of Object.entries(propsRecord)) {
    props[name] = parsePropValue(propValue, `${path}.props.${name}`, state);
  }
  const extra = record.extra === undefined
    ? undefined
    : asString(record.extra, `${path}.extra`);
  return {
    kind: "component",
    id,
    slug,
    props,
    ...(extra === undefined ? {} : { extra }),
  };
}

/** Parse and validate a saved document against the known component set. */
export function parseDocument(
  text: string,
  knownSlugs: ReadonlySet<string>,
): BuilderDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BuilderDocumentError("The file is not valid JSON.");
  }
  const record = asRecord(raw, "document");
  if (record.version !== 1) fail("document.version", "must be 1");
  const name = asString(record.name, "document.name");
  if (!Array.isArray(record.children)) {
    fail("document.children", "must be an array");
  }
  const state: ParseState = { knownSlugs, seenIds: new Set() };
  return {
    version: 1,
    name,
    children: record.children.map((child, index) =>
      parseChild(child, `document.children[${index}]`, state)
    ),
  };
}
