/**
 * Shared JSON, identifier, text, and budget validation for diagram kinds.
 *
 * The data-safety facts live in the shared internal authority
 * `src/internal/validation.ts`; this facade binds the diagram error classes,
 * codes, limits, and remedies so every existing name keeps resolving here.
 *
 * @module
 */

import {
  findTextDefect,
  findUnsupportedKey,
  isPlainRecord,
  isSafeIdentifier,
  snapshotJsonSafe,
} from "../internal/validation.ts";
import {
  DiagramBudgetError,
  DiagramConformanceError,
  DiagramValidationError,
} from "./errors.ts";
import { diagramGraphemeCount } from "./font-metrics.ts";
import type { DiagramKindMeta } from "./kind-meta.ts";
import { DIAGRAM_COMMON_LIMITS } from "./limits.ts";
import type { DiagramCommonSpec } from "./spec.ts";

export { isPlainRecord as isDiagramRecord } from "../internal/validation.ts";

function invalidSpec(message: string, path: string): never {
  throw new DiagramValidationError({
    code: "diagram/invalid-spec",
    message,
    path,
    remedy:
      "Author the diagram as readonly JSON-safe data with the exact kind schema.",
  });
}

/** Reject functions, special objects, cycles, and non-finite JSON numbers. */
export function assertDiagramJsonSafe(value: unknown): void {
  snapshotDiagramJsonSafe(value);
}

/** Inspect once and return an immutable plain-data snapshot for dispatch. */
export function snapshotDiagramJsonSafe(value: unknown): unknown {
  try {
    return snapshotJsonSafe(value, {
      rootPath: "spec",
      maximumDepth: DIAGRAM_COMMON_LIMITS.jsonDepth,
      onTooDeep: (path, depth) => {
        throw new DiagramBudgetError({
          dimension: "jsonDepth",
          limit: DIAGRAM_COMMON_LIMITS.jsonDepth,
          actual: depth,
          unit: "levels",
          authorAction: "reduce-tier",
          path,
        });
      },
      onInvalid: invalidSpec,
    });
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
  const extra = findUnsupportedKey(value, allowed);
  if (extra !== undefined) {
    invalidSpec(
      `${path} has unsupported field ${JSON.stringify(extra)}.`,
      path,
    );
  }
}

/** Validate one normalized, single-line semantic text field. */
export function assertDiagramText(
  value: unknown,
  path: string,
): asserts value is string {
  const defect = findTextDefect(value);
  if (defect === undefined) return;
  if (defect.kind === "not-single-line") {
    throw new DiagramValidationError({
      code: "diagram/invalid-text",
      message: `${path} must be non-empty text without edge whitespace.`,
      path,
      remedy: "Use one concise plain-text line.",
    });
  }
  if (defect.kind === "repeated-spaces") {
    throw new DiagramValidationError({
      code: "diagram/invalid-text",
      message: `${path} contains repeated spaces.`,
      path,
      remedy:
        "Use single ordinary spaces so wrapping has one deterministic form.",
    });
  }
  throw new DiagramValidationError({
    code: "diagram/invalid-text",
    message:
      `${path} contains a control, format, or unsupported whitespace character.`,
    path,
    facts: { codePoint: `U+${defect.codePoint.toString(16).toUpperCase()}` },
    remedy: "Replace it with visible plain text and ordinary spaces.",
  });
}

/** Validate one stable printable ASCII semantic identifier. */
export function assertDiagramIdentifier(
  value: unknown,
  path: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    !isSafeIdentifier(value, DIAGRAM_COMMON_LIMITS.identifierCharacters)
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
  if (!isPlainRecord(value)) invalidSpec("spec must be an object.", "spec");
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
    throw new DiagramConformanceError(
      `${meta.slug} has no Metadata budget named ${dimension}.`,
      { kind: meta.slug, dimension },
    );
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
