/** One insertion command plus pointer geometry, independent of DOM events. */
import {
  type BuilderDocument,
  type BuilderSlotChild,
  findChild,
  insertChild,
  isWithinSubtree,
  moveChild,
} from "./model.ts";
import type { InsertionTarget } from "./tree/projection.ts";
import {
  armedSlotInsertionTarget,
  childLabel,
  insertionTargetAfter,
  insertionTargetBefore,
  projectLayers,
  selectionInsertionTarget,
} from "./tree/projection.ts";
import type { BuilderCompatibilityPolicy } from "./tree/compatibility.ts";
import type { BuilderPlacementFailure } from "./tree/compatibility.ts";
import { preflightBuilderStructure } from "./tree/compatibility.ts";

export type BuilderInsertionSubject =
  | { readonly kind: "new"; readonly child: BuilderSlotChild }
  | { readonly kind: "existing"; readonly id: string };

/** The only primitive that inserts a new child or reparents an existing one. */
export function applyInsertion(
  document: BuilderDocument,
  subject: BuilderInsertionSubject,
  target: InsertionTarget,
): BuilderDocument {
  return subject.kind === "new"
    ? insertChild(document, target.location, target.index, subject.child)
    : moveChild(document, subject.id, target.location, target.index);
}

export type BuilderInsertionPreflight =
  | { readonly ok: true; readonly document: BuilderDocument }
  | { readonly ok: false; readonly failure: BuilderPlacementFailure };

/** Preflight one typed insertion, including cycles and rendered structure. */
export function preflightInsertion(
  document: BuilderDocument,
  subject: BuilderInsertionSubject,
  target: InsertionTarget,
  policy: BuilderCompatibilityPolicy,
): BuilderInsertionPreflight {
  if (subject.kind === "existing" && target.location.parent === "node") {
    const child = findChild(document, subject.id)?.child;
    if (
      child !== undefined &&
      isWithinSubtree(document, subject.id, target.location.nodeId)
    ) {
      return {
        ok: false,
        failure: {
          humanPath: childLabel(child),
          reason: "cannot be moved into itself or one of its descendants",
          technicalDetail:
            `Target owner ${target.location.nodeId} is inside subtree ${subject.id}`,
          suggestions: [],
        },
      };
    }
  }
  const candidate = applyInsertion(document, subject, target);
  const structure = preflightBuilderStructure(candidate, policy);
  return structure.ok
    ? { ok: true, document: candidate }
    : { ok: false, failure: structure.failure };
}

/** Truthful alternative destinations derived from the current tree and policy. */
export function compatibleInsertionSuggestions(
  document: BuilderDocument,
  subject: BuilderInsertionSubject,
  policy: BuilderCompatibilityPolicy,
  excluded: InsertionTarget,
  limit = 3,
): readonly string[] {
  const targets: InsertionTarget[] = [selectionInsertionTarget(document, null)];
  for (const row of projectLayers(document)) {
    const before = insertionTargetBefore(document, row.child.id);
    const after = insertionTargetAfter(document, row.child.id);
    if (before !== undefined) targets.push(before);
    if (after !== undefined) targets.push(after);
    if (row.child.kind !== "component") continue;
    for (const slot of row.slotNames) {
      const inside = armedSlotInsertionTarget(document, row.child.id, slot);
      if (inside !== undefined) targets.push(inside);
    }
  }

  const labels = new Set<string>();
  for (const target of targets) {
    if (target.label === excluded.label) continue;
    const result = preflightInsertion(document, subject, target, policy);
    if (!result.ok || result.document === document) continue;
    labels.add(target.label);
    if (labels.size >= limit) break;
  }
  return [...labels];
}

export interface RootChildRect {
  readonly top: number;
  readonly bottom: number;
}

export interface RootInsertionGeometry {
  /** Boundary index in the root children array. */
  readonly index: number;
  /** Indicator position relative to the root container's block start. */
  readonly offset: number;
}

/**
 * Choose the before/after boundary nearest the pointer's semantic position.
 * Rectangles must be direct root siblings in document order.
 */
export function rootInsertionFromPointer(
  pointerY: number,
  rects: readonly RootChildRect[],
  containerTop: number,
): RootInsertionGeometry {
  if (rects.length === 0) return { index: 0, offset: 0 };

  let index = rects.length;
  for (const [candidate, rect] of rects.entries()) {
    const midpoint = rect.top + Math.max(0, rect.bottom - rect.top) / 2;
    if (pointerY < midpoint) {
      index = candidate;
      break;
    }
  }

  const first = rects[0];
  const last = rects.at(-1);
  if (first === undefined || last === undefined) return { index: 0, offset: 0 };
  let boundary: number;
  if (index === 0) {
    boundary = first.top;
  } else if (index === rects.length) {
    boundary = last.bottom;
  } else {
    const before = rects[index - 1];
    const after = rects[index];
    boundary = before === undefined || after === undefined
      ? first.top
      : before.bottom + (after.top - before.bottom) / 2;
  }
  return { index, offset: Math.max(0, boundary - containerTop) };
}
