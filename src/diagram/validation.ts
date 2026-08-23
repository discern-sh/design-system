/**
 * Shared JSON, identifier, text, and budget validation for diagram kinds.
 *
 * @module
 */

import { DiagramBudgetError, DiagramValidationError } from "./errors.ts";
import { diagramGraphemeCount } from "./font-metrics.ts";
import type { DiagramKindMeta } from "./kind-meta.ts";
import { DIAGRAM_COMMON_LIMITS } from "./limits.ts";
import type { DiagramCommonSpec } from "./spec.ts";

/** Whether an unknown value is an ordinary string-keyed record. */
export function isDiagramRecord(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function invalidSpec(message: string, path: string): never {
  throw new DiagramValidationError({
    code: "diagram/invalid-spec",
    message,
    path,
    remedy:
      "Author the diagram as readonly JSON-safe data with the exact kind schema.",
  });
}

function snapshotJsonSafeInner(
  value: unknown,
  path: string,
  depth: number,
  active: Set<object>,
): unknown {
  if (depth > DIAGRAM_COMMON_LIMITS.jsonDepth) {
    throw new DiagramBudgetError({
      dimension: "jsonDepth",
      limit: DIAGRAM_COMMON_LIMITS.jsonDepth,
      actual: depth,
      unit: "levels",
      authorAction: "reduce-tier",
      path,
    });
  }
  if (
    value === null || typeof value === "string" ||
    typeof value === "boolean"
  ) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalidSpec(`${path} must be finite.`, path);
    return value;
  }
  if (typeof value !== "object") {
    invalidSpec(`${path} is not JSON-safe.`, path);
  }
  const object = value as object;
  if (active.has(object)) invalidSpec(`${path} contains a cycle.`, path);
  active.add(object);
  let snapshot: unknown;
  if (Array.isArray(value)) {
    const keys = Reflect.ownKeys(value).filter((key) => key !== "length");
    if (
      keys.length !== value.length ||
      keys.some((key, index) => key !== String(index))
    ) {
      invalidSpec(
        `${path} must be a dense JSON array without custom properties.`,
        path,
      );
    }
    const copy: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !("value" in descriptor)) {
        invalidSpec(`${path}[${index}] must be an ordinary data value.`, path);
      }
      copy.push(
        snapshotJsonSafeInner(
          descriptor.value,
          `${path}[${index}]`,
          depth + 1,
          active,
        ),
      );
    }
    snapshot = Object.freeze(copy);
  } else if (isDiagramRecord(value)) {
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) {
      invalidSpec(`${path} must not contain symbol-keyed data.`, path);
    }
    const copy = Object.create(null) as Record<string, unknown>;
    for (const key of (keys as string[]).toSorted()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        invalidSpec(
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
        ),
      });
    }
    snapshot = Object.freeze(copy);
  } else {
    invalidSpec(`${path} must be a plain data object.`, path);
  }
  active.delete(object);
  return snapshot;
}

/** Reject functions, special objects, cycles, and non-finite JSON numbers. */
export function assertDiagramJsonSafe(value: unknown): void {
  snapshotDiagramJsonSafe(value);
}

/** Inspect once and return an immutable plain-data snapshot for dispatch. */
export function snapshotDiagramJsonSafe(value: unknown): unknown {
  try {
    return snapshotJsonSafeInner(value, "spec", 0, new Set());
  } catch (error) {
    if (error instanceof DiagramValidationError) throw error;
    invalidSpec(
      "spec could not be inspected as stable JSON-safe data.",
      "spec",
    );
  }
}

/** Require an object to carry only its kind's declared data fields. */
export function assertDiagramExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  const allowedSet = new Set(allowed);
  const extra = Object.keys(value).filter((key) => !allowedSet.has(key))
    .toSorted();
  if (extra.length > 0) {
    invalidSpec(
      `${path} has unsupported field ${JSON.stringify(extra[0])}.`,
      path,
    );
  }
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

/** Validate one normalized, single-line semantic text field. */
export function assertDiagramText(
  value: unknown,
  path: string,
): asserts value is string {
  if (typeof value !== "string" || value === "" || value.trim() !== value) {
    throw new DiagramValidationError({
      code: "diagram/invalid-text",
      message: `${path} must be non-empty text without edge whitespace.`,
      path,
      remedy: "Use one concise plain-text line.",
    });
  }
  if (value.includes("  ")) {
    throw new DiagramValidationError({
      code: "diagram/invalid-text",
      message: `${path} contains repeated spaces.`,
      path,
      remedy:
        "Use single ordinary spaces so wrapping has one deterministic form.",
    });
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint !== undefined &&
      (UNSAFE_TEXT_CATEGORY.test(character) ||
        isUnsafeTextCodePoint(codePoint) ||
        isUnsupportedWhitespace(codePoint))
    ) {
      throw new DiagramValidationError({
        code: "diagram/invalid-text",
        message:
          `${path} contains a control, format, or unsupported whitespace character.`,
        path,
        facts: { codePoint: `U+${codePoint.toString(16).toUpperCase()}` },
        remedy: "Replace it with visible plain text and ordinary spaces.",
      });
    }
  }
}

/** Validate one stable printable ASCII semantic identifier. */
export function assertDiagramIdentifier(
  value: unknown,
  path: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z][A-Za-z0-9._:-]*$/u.test(value) ||
    value.length > DIAGRAM_COMMON_LIMITS.identifierCharacters
  ) {
    throw new DiagramValidationError({
      code: "diagram/invalid-identifier",
      message:
        `${path} must begin with an ASCII letter, continue with printable letters, digits, dot, underscore, colon, or hyphen, and stay within ${DIAGRAM_COMMON_LIMITS.identifierCharacters} characters.`,
      path,
      remedy:
        "Choose a short stable semantic identifier such as review-result.",
    });
  }
}

/** Validate and return the accessible facts common to every kind. */
export function validateDiagramCommonSpec(
  value: unknown,
  expectedKind: string,
  allowedKeys: readonly string[],
): DiagramCommonSpec & Record<string, unknown> {
  assertDiagramJsonSafe(value);
  if (!isDiagramRecord(value)) invalidSpec("spec must be an object.", "spec");
  assertDiagramExactKeys(value, allowedKeys, "spec");
  if (value.kind !== expectedKind) {
    throw new DiagramValidationError({
      code: "diagram/unknown-kind",
      message: `Expected diagram kind ${JSON.stringify(expectedKind)}.`,
      path: "spec.kind",
      facts: {
        expectedKind,
        receivedKind: typeof value.kind === "string"
          ? value.kind
          : "non-string",
      },
      remedy: "Use one of the generated built-in diagram kind identities.",
    });
  }
  assertDiagramText(value.title, "spec.title");
  assertDiagramText(value.summary, "spec.summary");
  const commonTextBudgets = [
    ["titleGraphemes", value.title, DIAGRAM_COMMON_LIMITS.titleGraphemes],
    ["summaryGraphemes", value.summary, DIAGRAM_COMMON_LIMITS.summaryGraphemes],
  ] as const;
  for (const [dimension, text, limit] of commonTextBudgets) {
    const actual = diagramGraphemeCount(text);
    if (actual > limit) {
      throw new DiagramBudgetError({
        dimension,
        limit,
        actual,
        unit: "graphemes",
        authorAction: "shorten-label",
        path: dimension === "titleGraphemes" ? "spec.title" : "spec.summary",
      });
    }
  }
  return value as DiagramCommonSpec & Record<string, unknown>;
}

/** Apply one Metadata-owned kind budget and return its definition. */
export function assertDiagramKindBudget(
  meta: DiagramKindMeta,
  dimension: string,
  actual: number,
  path?: string,
): void {
  const budget = meta.budgets[dimension];
  if (budget === undefined) {
    throw new DiagramValidationError({
      code: "diagram/invalid-spec",
      message: `${meta.slug} has no Metadata budget named ${dimension}.`,
      facts: { kind: meta.slug, dimension },
      remedy: "Add the measurable budget to the kind Metadata authority.",
    });
  }
  if (actual > budget.limit) {
    const options = {
      dimension,
      limit: budget.limit,
      actual,
      unit: budget.unit,
      authorAction: budget.remedy,
    } as const;
    throw path === undefined
      ? new DiagramBudgetError(options)
      : new DiagramBudgetError({ ...options, path });
  }
}
