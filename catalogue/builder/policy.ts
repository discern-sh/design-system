/**
 * The interface builder's single trust boundary. Saved files, restored state,
 * inspector values, preview props, and emitted object literals all pass
 * through these framework-neutral predicates before they become live data.
 */
import type { BuilderDocument } from "./model.ts";

/** Defendable per-document ceilings, including the 100-snapshot history cost. */
export const BUILDER_DOCUMENT_LIMITS = {
  inputBytes: 256 * 1024,
  treeDepth: 32,
  totalNodes: 500,
  childrenPerSlot: 100,
  propsPerNode: 128,
  identifierBytes: 128,
  nameBytes: 120,
  textBytes: 16 * 1024,
  stringBytes: 16 * 1024,
  jsonSourceBytes: 16 * 1024,
  jsonDepth: 16,
  jsonValues: 2_048,
  jsonKeysPerObject: 128,
  jsonKeyBytes: 128,
} as const;

/** Raised when a document or authored value is not safe to accept. */
export class BuilderDocumentError extends Error {
  override readonly name = "BuilderDocumentError";
}

/** Registry-derived facts every accepted Component node must obey. */
export interface BuilderDocumentPolicy {
  readonly knownSlugs: ReadonlySet<string>;
  readonly modeledPropsBySlug: ReadonlyMap<string, ReadonlySet<string>>;
  /** Every canonical Component prop that additional props may not shadow. */
  readonly reservedPropsBySlug: ReadonlyMap<string, ReadonlySet<string>>;
}

const encoder = new TextEncoder();
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const REACT_ESCAPE_KEYS = new Set([
  "dangerouslySetInnerHTML",
  "key",
  "ref",
  "srcDoc",
]);
const URL_ATTRIBUTE_NAMES = new Set([
  "action",
  "cite",
  "formaction",
  "href",
  "poster",
  "src",
  "xlinkhref",
]);
const ACTIVE_URL_PROTOCOLS = new Set(["data:", "javascript:", "vbscript:"]);

interface DocumentValidationState {
  readonly policy: BuilderDocumentPolicy;
  readonly seenIds: Set<string>;
  totalNodes: number;
  authoredBytes: number;
}

interface ChildTask {
  readonly value: unknown;
  readonly path: string;
  readonly depth: number;
}

interface JsonTask {
  readonly value: unknown;
  readonly path: string;
  readonly depth: number;
}

function fail(path: string, expectation: string): never {
  throw new BuilderDocumentError(`${path} ${expectation}.`);
}

/** UTF-8 size, matching browser File.size rather than UTF-16 code units. */
export function builderValueBytes(value: string): number {
  return encoder.encode(value).byteLength;
}

function plainRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "must be a plain object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(path, "must be a plain object");
  }
  return value as Record<string, unknown>;
}

function onlyKeys(
  record: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail(propertyPath(path, key), "is not supported");
  }
}

function boundedString(
  value: unknown,
  path: string,
  maximumBytes: number,
  allowEmpty = false,
): string {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) {
    fail(path, allowEmpty ? "must be a string" : "must be a non-empty string");
  }
  const bytes = builderValueBytes(value);
  if (bytes > maximumBytes) {
    fail(path, `must be at most ${maximumBytes} bytes; received ${bytes}`);
  }
  return value;
}

function addAuthoredBytes(
  state: DocumentValidationState,
  value: string,
  path: string,
): void {
  state.authoredBytes += builderValueBytes(value);
  if (state.authoredBytes > BUILDER_DOCUMENT_LIMITS.inputBytes) {
    fail(
      path,
      `makes document authored content exceed ${BUILDER_DOCUMENT_LIMITS.inputBytes} bytes`,
    );
  }
}

function propertyPath(path: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function safePropName(name: string, path: string): void {
  const jsxSafe = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ||
    /^(?:aria|data)-[a-z][a-z0-9._-]*$/.test(name);
  if (!jsxSafe) {
    fail(path, `holds ${JSON.stringify(name)}, not a JSX-safe prop name`);
  }
  if (PROTOTYPE_KEYS.has(name)) {
    fail(path, `cannot use prototype-sensitive prop ${JSON.stringify(name)}`);
  }
  if (REACT_ESCAPE_KEYS.has(name)) {
    fail(path, `cannot use React escape hatch ${JSON.stringify(name)}`);
  }
  if (/^on/i.test(name)) {
    fail(path, `cannot use executable handler prop ${JSON.stringify(name)}`);
  }
}

function urlBearingName(name: string): boolean {
  const normalized = name.toLowerCase();
  return URL_ATTRIBUTE_NAMES.has(normalized) ||
    /(?:href|url|uri)$/.test(normalized);
}

function safeUrlValue(name: string, value: unknown, path: string): void {
  if (!urlBearingName(name) || typeof value !== "string") return;
  let protocol: string;
  try {
    protocol = new URL(value, "https://discern.invalid/").protocol
      .toLowerCase();
  } catch {
    return;
  }
  if (ACTIVE_URL_PROTOCOLS.has(protocol)) {
    fail(path, `cannot use an executable ${name} URL`);
  }
}

function validateJsonValue(value: unknown, path: string): void {
  const stack: JsonTask[] = [{ value, path, depth: 0 }];
  let values = 0;
  while (stack.length > 0) {
    const task = stack.pop();
    if (task === undefined) break;
    values += 1;
    if (values > BUILDER_DOCUMENT_LIMITS.jsonValues) {
      fail(
        task.path,
        `exceeds ${BUILDER_DOCUMENT_LIMITS.jsonValues} JSON values`,
      );
    }
    if (task.depth > BUILDER_DOCUMENT_LIMITS.jsonDepth) {
      fail(
        task.path,
        `exceeds JSON depth ${BUILDER_DOCUMENT_LIMITS.jsonDepth}`,
      );
    }
    const current = task.value;
    if (current === null || typeof current === "boolean") continue;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        fail(task.path, "must be a finite JSON number");
      }
      continue;
    }
    if (typeof current === "string") {
      boundedString(
        current,
        task.path,
        BUILDER_DOCUMENT_LIMITS.stringBytes,
        true,
      );
      continue;
    }
    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) {
        stack.push({
          value: current[index],
          path: `${task.path}[${index}]`,
          depth: task.depth + 1,
        });
      }
      continue;
    }
    const record = plainRecord(current, task.path);
    const entries = Object.entries(record);
    if (entries.length > BUILDER_DOCUMENT_LIMITS.jsonKeysPerObject) {
      fail(
        task.path,
        `must hold at most ${BUILDER_DOCUMENT_LIMITS.jsonKeysPerObject} JSON keys; received ${entries.length}`,
      );
    }
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (entry === undefined) continue;
      const [key, member] = entry;
      const memberPath = propertyPath(task.path, key);
      boundedString(
        key,
        memberPath,
        BUILDER_DOCUMENT_LIMITS.jsonKeyBytes,
        false,
      );
      if (PROTOTYPE_KEYS.has(key)) {
        fail(
          memberPath,
          `cannot use prototype-sensitive key ${JSON.stringify(key)}`,
        );
      }
      if (REACT_ESCAPE_KEYS.has(key)) {
        fail(memberPath, `cannot use React escape key ${JSON.stringify(key)}`);
      }
      if (/^on/i.test(key)) {
        fail(
          memberPath,
          `cannot use executable handler key ${JSON.stringify(key)}`,
        );
      }
      safeUrlValue(key, member, memberPath);
      stack.push({ value: member, path: memberPath, depth: task.depth + 1 });
    }
  }
}

/** Parse one raw JSON source and apply the recursive object-literal policy. */
export function parseBuilderJson(
  source: string,
  path: string,
): unknown {
  const bytes = builderValueBytes(source);
  if (bytes > BUILDER_DOCUMENT_LIMITS.jsonSourceBytes) {
    fail(
      path,
      `must be at most ${BUILDER_DOCUMENT_LIMITS.jsonSourceBytes} bytes; received ${bytes}`,
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    fail(path, "must contain valid JSON");
  }
  validateJsonValue(value, path);
  return value;
}

/**
 * Parse additional props as one safe object. Modeled values always win by
 * construction: a second spelling is rejected instead of relying on spread
 * order in React or TSX.
 */
export function parseAdditionalProps(
  source: string,
  reservedProps: ReadonlySet<string>,
  path: string,
): Readonly<Record<string, unknown>> {
  const value = parseBuilderJson(source, path);
  const record = plainRecord(value, path);
  for (const [name, member] of Object.entries(record)) {
    const memberPath = propertyPath(path, name);
    safePropName(name, memberPath);
    if (name === "children" || reservedProps.has(name)) {
      fail(
        memberPath,
        `cannot override modeled prop or canonical Component prop ${
          JSON.stringify(name)
        }`,
      );
    }
    safeUrlValue(name, member, memberPath);
  }
  return record;
}

function validatePropValue(
  name: string,
  value: unknown,
  path: string,
  state: DocumentValidationState,
  stack: ChildTask[],
  childDepth: number,
): void {
  const record = plainRecord(value, path);
  if (typeof record.kind !== "string") fail(`${path}.kind`, "must be a string");
  switch (record.kind) {
    case "string": {
      onlyKeys(record, new Set(["kind", "value"]), path);
      const scalar = boundedString(
        record.value,
        `${path}.value`,
        BUILDER_DOCUMENT_LIMITS.stringBytes,
        true,
      );
      addAuthoredBytes(state, scalar, `${path}.value`);
      safeUrlValue(name, scalar, `${path}.value`);
      return;
    }
    case "number":
      onlyKeys(record, new Set(["kind", "value"]), path);
      if (typeof record.value !== "number" || !Number.isFinite(record.value)) {
        fail(`${path}.value`, "must be a finite number");
      }
      return;
    case "boolean":
      onlyKeys(record, new Set(["kind", "value"]), path);
      if (typeof record.value !== "boolean") {
        fail(`${path}.value`, "must be a boolean");
      }
      return;
    case "json": {
      onlyKeys(record, new Set(["kind", "source"]), path);
      const source = boundedString(
        record.source,
        `${path}.source`,
        BUILDER_DOCUMENT_LIMITS.jsonSourceBytes,
      );
      addAuthoredBytes(state, source, `${path}.source`);
      const parsed = parseBuilderJson(source, `${path}.source`);
      safeUrlValue(name, parsed, `${path}.source`);
      return;
    }
    case "slot": {
      onlyKeys(record, new Set(["kind", "children"]), path);
      if (!Array.isArray(record.children)) {
        fail(`${path}.children`, "must be an array");
      }
      if (record.children.length > BUILDER_DOCUMENT_LIMITS.childrenPerSlot) {
        fail(
          `${path}.children`,
          `must hold at most ${BUILDER_DOCUMENT_LIMITS.childrenPerSlot} children; received ${record.children.length}`,
        );
      }
      for (let index = record.children.length - 1; index >= 0; index -= 1) {
        stack.push({
          value: record.children[index],
          path: `${path}.children[${index}]`,
          depth: childDepth,
        });
      }
      return;
    }
    default:
      fail(`${path}.kind`, "must name a known prop value kind");
  }
}

/** Validate a parsed or locally-produced document without recursive calls. */
export function assertBuilderDocument(
  value: unknown,
  policy: BuilderDocumentPolicy,
  inputBytes?: number,
): asserts value is BuilderDocument {
  if (
    inputBytes !== undefined &&
    inputBytes > BUILDER_DOCUMENT_LIMITS.inputBytes
  ) {
    fail(
      "document",
      `must be at most ${BUILDER_DOCUMENT_LIMITS.inputBytes} input bytes; received ${inputBytes}`,
    );
  }
  const document = plainRecord(value, "document");
  onlyKeys(document, new Set(["version", "name", "children"]), "document");
  if (document.version !== 1) fail("document.version", "must be 1");
  const name = boundedString(
    document.name,
    "document.name",
    BUILDER_DOCUMENT_LIMITS.nameBytes,
    true,
  );
  if (!Array.isArray(document.children)) {
    fail("document.children", "must be an array");
  }
  if (document.children.length > BUILDER_DOCUMENT_LIMITS.childrenPerSlot) {
    fail(
      "document.children",
      `must hold at most ${BUILDER_DOCUMENT_LIMITS.childrenPerSlot} children; received ${document.children.length}`,
    );
  }
  const state: DocumentValidationState = {
    policy,
    seenIds: new Set(),
    totalNodes: 0,
    authoredBytes: builderValueBytes(name),
  };
  const stack: ChildTask[] = [];
  for (let index = document.children.length - 1; index >= 0; index -= 1) {
    stack.push({
      value: document.children[index],
      path: `document.children[${index}]`,
      depth: 1,
    });
  }
  while (stack.length > 0) {
    const task = stack.pop();
    if (task === undefined) break;
    if (task.depth > BUILDER_DOCUMENT_LIMITS.treeDepth) {
      fail(
        task.path,
        `exceeds tree depth ${BUILDER_DOCUMENT_LIMITS.treeDepth}`,
      );
    }
    state.totalNodes += 1;
    if (state.totalNodes > BUILDER_DOCUMENT_LIMITS.totalNodes) {
      fail(
        task.path,
        `exceeds ${BUILDER_DOCUMENT_LIMITS.totalNodes} total nodes`,
      );
    }
    const child = plainRecord(task.value, task.path);
    const id = boundedString(
      child.id,
      `${task.path}.id`,
      BUILDER_DOCUMENT_LIMITS.identifierBytes,
    );
    addAuthoredBytes(state, id, `${task.path}.id`);
    if (state.seenIds.has(id)) fail(`${task.path}.id`, "repeats an earlier id");
    state.seenIds.add(id);
    if (child.kind === "text") {
      onlyKeys(child, new Set(["kind", "id", "text"]), task.path);
      const text = boundedString(
        child.text,
        `${task.path}.text`,
        BUILDER_DOCUMENT_LIMITS.textBytes,
        true,
      );
      addAuthoredBytes(state, text, `${task.path}.text`);
      continue;
    }
    if (child.kind !== "component") {
      fail(`${task.path}.kind`, 'must be "text" or "component"');
    }
    onlyKeys(
      child,
      new Set(["kind", "id", "slug", "props", "extra"]),
      task.path,
    );
    const slug = boundedString(
      child.slug,
      `${task.path}.slug`,
      BUILDER_DOCUMENT_LIMITS.identifierBytes,
    );
    addAuthoredBytes(state, slug, `${task.path}.slug`);
    if (!state.policy.knownSlugs.has(slug)) {
      fail(
        `${task.path}.slug`,
        `names unknown component ${JSON.stringify(slug)}`,
      );
    }
    const modeledProps = state.policy.modeledPropsBySlug.get(slug);
    if (modeledProps === undefined) {
      fail(
        `${task.path}.slug`,
        `has no document policy for component ${JSON.stringify(slug)}`,
      );
    }
    const props = plainRecord(child.props ?? {}, `${task.path}.props`);
    const propEntries = Object.entries(props);
    if (propEntries.length > BUILDER_DOCUMENT_LIMITS.propsPerNode) {
      fail(
        `${task.path}.props`,
        `must hold at most ${BUILDER_DOCUMENT_LIMITS.propsPerNode} props; received ${propEntries.length}`,
      );
    }
    for (const [prop, propValue] of propEntries) {
      const propPath = propertyPath(`${task.path}.props`, prop);
      boundedString(
        prop,
        propPath,
        BUILDER_DOCUMENT_LIMITS.identifierBytes,
      );
      safePropName(prop, propPath);
      if (!modeledProps.has(prop)) {
        fail(
          propPath,
          `is not a modeled prop of component ${
            JSON.stringify(slug)
          }; use additional props for safe passthrough values`,
        );
      }
      addAuthoredBytes(state, prop, propPath);
      validatePropValue(
        prop,
        propValue,
        propPath,
        state,
        stack,
        task.depth + 1,
      );
    }
    if (child.extra !== undefined) {
      const extra = boundedString(
        child.extra,
        `${task.path}.extra`,
        BUILDER_DOCUMENT_LIMITS.jsonSourceBytes,
      );
      addAuthoredBytes(state, extra, `${task.path}.extra`);
      const reservedProps = state.policy.reservedPropsBySlug.get(slug);
      if (reservedProps === undefined) {
        fail(
          `${task.path}.slug`,
          `has no additional-prop policy for component ${JSON.stringify(slug)}`,
        );
      }
      parseAdditionalProps(extra, reservedProps, `${task.path}.extra`);
    }
  }
}

/** Parse a saved source only after its byte ceiling, then validate one walk. */
export function parseBuilderDocument(
  text: string,
  policy: BuilderDocumentPolicy,
): BuilderDocument {
  const bytes = builderValueBytes(text);
  if (bytes > BUILDER_DOCUMENT_LIMITS.inputBytes) {
    fail(
      "document",
      `must be at most ${BUILDER_DOCUMENT_LIMITS.inputBytes} input bytes; received ${bytes}`,
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail("document", "must contain valid JSON");
  }
  assertBuilderDocument(raw, policy, bytes);
  return raw;
}
