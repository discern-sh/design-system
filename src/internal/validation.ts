/**
 * Family-neutral data-safety primitives shared by the kind families: plain
 * JSON snapshotting, exact-key checking, hostile-text classification, and the
 * safe identifier grammar. Refusal envelopes stay with the owning family;
 * these functions carry only the facts.
 *
 * @module
 */

/** Whether an unknown value is an ordinary string-keyed record. */
export function isPlainRecord(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Depth ceiling and failure hooks supplied by the owning family. */
export interface JsonSnapshotPolicy {
  readonly rootPath: string;
  readonly maximumDepth: number;
  readonly onTooDeep: (path: string, depth: number) => never;
  readonly onInvalid: (message: string, path: string) => never;
}

function snapshotJsonSafeInner(
  value: unknown,
  path: string,
  depth: number,
  active: Set<object>,
  policy: JsonSnapshotPolicy,
): unknown {
  if (depth > policy.maximumDepth) {
    policy.onTooDeep(path, depth);
  }
  if (
    value === null || typeof value === "string" ||
    typeof value === "boolean"
  ) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      policy.onInvalid(`${path} must be finite.`, path);
    }
    return value;
  }
  if (typeof value !== "object") {
    policy.onInvalid(`${path} is not JSON-safe.`, path);
  }
  const object = value as object;
  if (active.has(object)) policy.onInvalid(`${path} contains a cycle.`, path);
  active.add(object);
  let snapshot: unknown;
  if (Array.isArray(value)) {
    const keys = Reflect.ownKeys(value).filter((key) => key !== "length");
    if (
      keys.length !== value.length ||
      keys.some((key, index) => key !== String(index))
    ) {
      policy.onInvalid(
        `${path} must be a dense JSON array without custom properties.`,
        path,
      );
    }
    const copy: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !("value" in descriptor)) {
        policy.onInvalid(
          `${path}[${index}] must be an ordinary data value.`,
          path,
        );
      }
      copy.push(
        snapshotJsonSafeInner(
          descriptor.value,
          `${path}[${index}]`,
          depth + 1,
          active,
          policy,
        ),
      );
    }
    snapshot = Object.freeze(copy);
  } else if (isPlainRecord(value)) {
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) {
      policy.onInvalid(`${path} must not contain symbol-keyed data.`, path);
    }
    const copy = Object.create(null) as Record<string, unknown>;
    for (const key of (keys as string[]).toSorted()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        policy.onInvalid(
          `${path}.${key} must be an enumerable data property.`,
          path,
        );
      }
      Object.defineProperty(copy, key, {
        enumerable: true,
        configurable: false,
        writable: false,
        value: snapshotJsonSafeInner(
          descriptor.value,
          `${path}.${key}`,
          depth + 1,
          active,
          policy,
        ),
      });
    }
    snapshot = Object.freeze(copy);
  } else {
    policy.onInvalid(`${path} must be a plain data object.`, path);
  }
  active.delete(object);
  return snapshot;
}

/**
 * Inspect once and return an immutable plain-data snapshot, rejecting
 * functions, special objects, cycles, symbol keys, accessor properties, and
 * non-finite numbers through the supplied family hooks.
 */
export function snapshotJsonSafe(
  value: unknown,
  policy: JsonSnapshotPolicy,
): unknown {
  return snapshotJsonSafeInner(value, policy.rootPath, 0, new Set(), policy);
}

/** First unsupported key beyond a declared field set, in sorted order. */
export function findUnsupportedKey(
  value: Record<string, unknown>,
  allowed: readonly string[],
): string | undefined {
  const allowedSet = new Set(allowed);
  return Object.keys(value).filter((key) => !allowedSet.has(key))
    .toSorted()[0];
}

const UNSAFE_TEXT_CATEGORY = /[\p{Cc}\p{Cf}]/u;

function isUnsafeTextCodePoint(codePoint: number): boolean {
  return codePoint <= 0x1f || inRange(codePoint, 0x7f, 0x9f) ||
    codePoint === 0xad || codePoint === 0x61c || codePoint === 0x6dd ||
    codePoint === 0x70f || codePoint === 0x180e || codePoint === 0xfeff ||
    inRange(codePoint, 0x600, 0x605) || inRange(codePoint, 0x890, 0x891) ||
    codePoint === 0x8e2 || inRange(codePoint, 0x200b, 0x200f) ||
    inRange(codePoint, 0x202a, 0x202e) ||
    inRange(codePoint, 0x2060, 0x206f) ||
    inRange(codePoint, 0xd800, 0xdfff) ||
    inRange(codePoint, 0xfdd0, 0xfdef) || (codePoint & 0xffff) >= 0xfffe ||
    inRange(codePoint, 0xfff9, 0xfffb) || codePoint === 0x110bd ||
    codePoint === 0x110cd || codePoint === 0xe0001 ||
    inRange(codePoint, 0xe0020, 0xe007f);
}

function inRange(value: number, start: number, end: number): boolean {
  return value >= start && value <= end;
}

function isUnsupportedWhitespace(codePoint: number): boolean {
  return codePoint === 0xa0 || codePoint === 0x1680 ||
    inRange(codePoint, 0x2000, 0x200a) ||
    inRange(codePoint, 0x2028, 0x2029) || codePoint === 0x202f ||
    codePoint === 0x205f || codePoint === 0x3000;
}

/** First hostile defect found in one semantic text candidate. */
export type TextDefect =
  | { readonly kind: "not-single-line" }
  | { readonly kind: "repeated-spaces" }
  | { readonly kind: "hostile-character"; readonly codePoint: number };

/**
 * Classify one normalized, single-line semantic text candidate: non-empty,
 * trimmed, singly-spaced, and free of control, format, surrogate, and
 * unsupported whitespace code points.
 */
export function findTextDefect(value: unknown): TextDefect | undefined {
  if (typeof value !== "string" || value === "" || value.trim() !== value) {
    return { kind: "not-single-line" };
  }
  if (value.includes("  ")) {
    return { kind: "repeated-spaces" };
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint !== undefined &&
      (UNSAFE_TEXT_CATEGORY.test(character) ||
        isUnsafeTextCodePoint(codePoint) ||
        isUnsupportedWhitespace(codePoint))
    ) {
      return { kind: "hostile-character", codePoint };
    }
  }
  return undefined;
}

/** Whether text forms a stable printable ASCII identifier within a ceiling. */
export function isSafeIdentifier(
  value: string,
  maximumCharacters: number,
): boolean {
  return /^[A-Za-z][A-Za-z0-9._:-]*$/u.test(value) &&
    value.length <= maximumCharacters;
}
