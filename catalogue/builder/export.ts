/**
 * Trustworthy builder exports: accepted JSON, deterministic consumer TSX,
 * explicit callback wiring, and the runtime Component selection.
 */
import type {
  BuilderDocument,
  BuilderNode,
  BuilderPropValue,
  BuilderSlotChild,
} from "./model.ts";
import {
  assertBuilderDocument,
  BuilderDocumentError,
  type BuilderDocumentPolicy,
  parseAdditionalProps,
  parseBuilderDocument,
  parseBuilderJson,
} from "./policy.ts";

export { BuilderDocumentError } from "./policy.ts";

/** One required function prop that source data can never serialize. */
export interface RequiredFunctionProp {
  readonly name: string;
}

/** Registry-derived facts used by validation and TSX naming. */
export interface ExportNaming extends BuilderDocumentPolicy {
  readonly slugToExport: ReadonlyMap<string, string>;
  readonly requiredFunctionPropsBySlug: ReadonlyMap<
    string,
    readonly RequiredFunctionProp[]
  >;
}

interface CallbackBinding {
  readonly nodeId: string;
  readonly prop: string;
  readonly tag: string;
  readonly binding: string;
}

interface RenderContext {
  readonly naming: ExportNaming;
  readonly callbacks: ReadonlyMap<string, CallbackBinding>;
}

const REACT_MODULE = "@discern-sh/design-system/react";

function exportName(node: BuilderNode, naming: ExportNaming): string {
  const name = naming.slugToExport.get(node.slug);
  if (name === undefined) {
    throw new BuilderDocumentError(
      `The document places unknown component ${JSON.stringify(node.slug)}.`,
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

function uniqueIdentifier(
  requested: string,
  reserved: Set<string>,
  collisionSuffix: string,
): string {
  let candidate = requested;
  if (reserved.has(candidate)) candidate = `${candidate}${collisionSuffix}`;
  let suffix = 2;
  while (reserved.has(candidate)) {
    candidate = `${requested}${collisionSuffix}${String(suffix)}`;
    suffix += 1;
  }
  reserved.add(candidate);
  return candidate;
}

function safeJsxText(text: string): boolean {
  return !/[{}<>\\&]/.test(text) && text === text.trim() && text !== "";
}

function safeAttributeString(text: string): boolean {
  return !/["\\\n\r{}<>&]/.test(text);
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (typeof value !== "object" || value === null) return value;
  const record = value as Readonly<Record<string, unknown>>;
  return Object.fromEntries(
    Object.keys(record).sort((left, right) => left.localeCompare(right)).map((
      key,
    ) => [key, canonicalJson(record[key])]),
  );
}

function parsedJsonSource(source: string, spot: string): string {
  return JSON.stringify(canonicalJson(parseBuilderJson(source, spot)));
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

function renderTextBlock(text: string, pad: string): string {
  const line = (value: string): string =>
    safeJsxText(value) ? `${pad}${value}` : `${pad}{${JSON.stringify(value)}}`;
  if (!text.includes("\n")) return line(text);
  return text.split("\n").flatMap((value, index) => [
    ...(index > 0 ? [`${pad}<br />`] : []),
    ...(value === "" ? [] : [line(value)]),
  ]).join("\n");
}

function callbackKey(nodeId: string, prop: string): string {
  return `${nodeId}\u0000${prop}`;
}

function renderChild(
  child: BuilderSlotChild,
  context: RenderContext,
  indent: number,
): string {
  const pad = "  ".repeat(indent);
  if (child.kind === "text") return renderTextBlock(child.text, pad);
  return renderNode(child, context, indent);
}

function slotExpression(
  children: readonly BuilderSlotChild[],
  context: RenderContext,
): string {
  const only = children.length === 1 ? children[0] : undefined;
  if (only !== undefined && only.kind === "text") {
    if (only.text.includes("\n")) {
      return `{\n  <>\n${renderTextBlock(only.text, "    ")}\n  </>\n}`;
    }
    return safeAttributeString(only.text)
      ? `"${only.text}"`
      : `{${JSON.stringify(only.text)}}`;
  }
  if (only !== undefined) {
    return `{\n${renderNode(only, context, 1)}\n}`;
  }
  const body = children
    .map((child) => renderChild(child, context, 2))
    .join("\n");
  return `{\n  <>\n${body}\n  </>\n}`;
}

function renderNode(
  node: BuilderNode,
  context: RenderContext,
  indent: number,
): string {
  const pad = "  ".repeat(indent);
  const tag = exportName(node, context.naming);
  const attributes: string[] = [];
  let childSlot: readonly BuilderSlotChild[] = [];
  const entries = Object.entries(node.props).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  for (const [name, value] of entries) {
    const spot = `<${tag}> prop ${JSON.stringify(name)}`;
    if (value.kind !== "slot") {
      attributes.push(scalarAttribute(name, value, spot));
      continue;
    }
    if (value.children.length === 0) continue;
    if (name === "children") {
      childSlot = value.children;
      continue;
    }
    attributes.push(`${name}=${slotExpression(value.children, context)}`);
  }
  for (
    const required of context.naming.requiredFunctionPropsBySlug.get(
      node.slug,
    ) ?? []
  ) {
    const callback = context.callbacks.get(callbackKey(node.id, required.name));
    if (callback === undefined) {
      throw new BuilderDocumentError(
        `<${tag}> required callback ${
          JSON.stringify(required.name)
        } has no export binding.`,
      );
    }
    attributes.push(`${required.name}={callbacks.${callback.binding}}`);
  }
  if (node.extra !== undefined) {
    const extra = parseAdditionalProps(
      node.extra,
      context.naming.reservedPropsBySlug.get(node.slug) ?? new Set(),
      `<${tag}> additional props`,
    );
    attributes.push(`{...${JSON.stringify(canonicalJson(extra))}}`);
  }

  const inlineAttributes = attributes.length === 0
    ? ""
    : ` ${attributes.join(" ")}`;
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
    .map((child) => renderChild(child, context, indent + 1))
    .join("\n");
  return `${open}>\n${body}\n${pad}</${tag}>`;
}

function collectExportNames(
  document: BuilderDocument,
  naming: ExportNaming,
): readonly string[] {
  const names = new Set<string>();
  const stack = [...document.children].reverse();
  while (stack.length > 0) {
    const child = stack.pop();
    if (child === undefined || child.kind !== "component") continue;
    names.add(exportName(child, naming));
    const slots = Object.entries(child.props)
      .filter((entry) => entry[1].kind === "slot")
      .sort(([left], [right]) => left.localeCompare(right));
    for (let slotIndex = slots.length - 1; slotIndex >= 0; slotIndex -= 1) {
      const slot = slots[slotIndex]?.[1];
      if (slot?.kind !== "slot") continue;
      for (let index = slot.children.length - 1; index >= 0; index -= 1) {
        const nested = slot.children[index];
        if (nested !== undefined) stack.push(nested);
      }
    }
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}

function collectCallbackBindings(
  document: BuilderDocument,
  naming: ExportNaming,
): readonly CallbackBinding[] {
  const bindings: CallbackBinding[] = [];
  const counts = new Map<string, number>();
  const stack = [...document.children].reverse();
  while (stack.length > 0) {
    const child = stack.pop();
    if (child === undefined || child.kind !== "component") continue;
    const tag = exportName(child, naming);
    const baseTag = tag.slice(0, 1).toLowerCase() + tag.slice(1);
    for (
      const required of naming.requiredFunctionPropsBySlug.get(child.slug) ?? []
    ) {
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(required.name)) {
        throw new BuilderDocumentError(
          `<${tag}> required callback ${
            JSON.stringify(required.name)
          } is not JSX-safe.`,
        );
      }
      const base = `${baseTag}${
        required.name.slice(0, 1).toUpperCase() + required.name.slice(1)
      }`;
      const count = (counts.get(base) ?? 0) + 1;
      counts.set(base, count);
      bindings.push({
        nodeId: child.id,
        prop: required.name,
        tag,
        binding: count === 1 ? base : `${base}${String(count)}`,
      });
    }
    const slots = Object.entries(child.props)
      .filter((entry) => entry[1].kind === "slot")
      .sort(([left], [right]) => left.localeCompare(right));
    for (let slotIndex = slots.length - 1; slotIndex >= 0; slotIndex -= 1) {
      const slot = slots[slotIndex]?.[1];
      if (slot?.kind !== "slot") continue;
      for (let index = slot.children.length - 1; index >= 0; index -= 1) {
        const nested = slot.children[index];
        if (nested !== undefined) stack.push(nested);
      }
    }
  }
  return bindings;
}

function importLine(names: readonly string[]): string {
  const importList = names.join(", ");
  return importList.length + REACT_MODULE.length + 26 <= 80
    ? `import { ${importList} } from "${REACT_MODULE}";`
    : `import {\n${
      names.map((name) => `  ${name},`).join("\n")
    }\n} from "${REACT_MODULE}";`;
}

/** Consumer-ready TSX source for the document's component tree. */
export function documentToTsx(
  document: BuilderDocument,
  naming: ExportNaming,
): string {
  assertBuilderDocument(document, naming);
  const names = collectExportNames(document, naming);
  const callbacks = collectCallbackBindings(document, naming);
  const reserved = new Set(names);
  if (callbacks.length > 0) reserved.add("ComponentProps");
  const componentName = uniqueIdentifier(
    pascalIdentifier(document.name),
    reserved,
    "Composition",
  );
  const callbacksName = callbacks.length === 0
    ? undefined
    : uniqueIdentifier(`${componentName}Callbacks`, reserved, "Contract");
  const callbackMap = new Map(
    callbacks.map((callback) => [
      callbackKey(callback.nodeId, callback.prop),
      callback,
    ]),
  );
  const context: RenderContext = { naming, callbacks: callbackMap };
  const only = document.children.length === 1
    ? document.children[0]
    : undefined;
  const body = document.children.length === 0
    ? "  return null;"
    : only !== undefined && only.kind === "component"
    ? `  return (\n${renderNode(only, context, 2)}\n  );`
    : `  return (\n    <>\n${
      document.children.map((child) => renderChild(child, context, 3)).join(
        "\n",
      )
    }\n    </>\n  );`;

  const imports = [
    ...(callbacks.length === 0
      ? []
      : ['import type { ComponentProps } from "react";']),
    ...(names.length === 0 ? [] : [importLine(names)]),
  ];
  const callbackContract = callbacksName === undefined
    ? ""
    : `export interface ${callbacksName} {\n${
      callbacks.map((callback) =>
        `  /** Required by the <${callback.tag}> instance. */\n` +
        `  readonly ${callback.binding}: ComponentProps<typeof ${callback.tag}>[${
          JSON.stringify(callback.prop)
        }];`
      ).join("\n")
    }\n}\n\n`;
  const commentName =
    (document.name.trim() === ""
      ? "Untitled page"
      : document.name.trim().replace(/\s+/g, " "))
      .replaceAll("*/", "*\\/");
  const parameter = callbacksName === undefined
    ? ""
    : `callbacks: ${callbacksName}`;
  const header = imports.length === 0 ? "" : `${imports.join("\n")}\n\n`;
  return `${header}${callbackContract}/** ${commentName} — composed with the Discern interface builder. */\nexport function ${componentName}(${parameter}) {\n${body}\n}\n`;
}

/** The bundle-selection line consumer sites paste into their emitter config. */
export function documentSelectionSnippet(
  document: BuilderDocument,
  policy: BuilderDocumentPolicy,
): string {
  assertBuilderDocument(document, policy);
  const slugs = new Set<string>();
  const stack = [...document.children].reverse();
  while (stack.length > 0) {
    const child = stack.pop();
    if (child === undefined || child.kind !== "component") continue;
    slugs.add(child.slug);
    for (const value of Object.values(child.props)) {
      if (value.kind !== "slot") continue;
      for (let index = value.children.length - 1; index >= 0; index -= 1) {
        const nested = value.children[index];
        if (nested !== undefined) stack.push(nested);
      }
    }
  }
  const sorted = [...slugs].sort((left, right) => left.localeCompare(right));
  return `components: [${
    sorted.map((slug) => JSON.stringify(slug)).join(", ")
  }],`;
}

/** The accepted document's deterministic JSON save format. */
export function serializeDocument(
  document: BuilderDocument,
  policy: BuilderDocumentPolicy,
): string {
  assertBuilderDocument(document, policy);
  return `${JSON.stringify(document, null, 2)}\n`;
}

/** Parse and validate a saved document against the registry-derived policy. */
export function parseDocument(
  text: string,
  policy: BuilderDocumentPolicy,
): BuilderDocument {
  return parseBuilderDocument(text, policy);
}
