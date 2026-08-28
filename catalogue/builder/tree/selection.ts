/** Pure selection reconciliation across document mutation and history travel. */
import type {
  BuilderDocument,
  BuilderLocation,
  BuilderSlotChild,
} from "../model.ts";
import { ancestorsOf, findChild } from "../model.ts";

function childrenAt(
  document: BuilderDocument,
  location: BuilderLocation,
): readonly BuilderSlotChild[] {
  if (location.parent === "root") return document.children;
  const owner = findChild(document, location.nodeId)?.child;
  if (owner?.kind !== "component") return [];
  const value = owner.props[location.prop];
  return value?.kind === "slot" ? value.children : [];
}

/** Preserve identity, otherwise choose the nearest surviving structural peer. */
export function reconcileSelection(
  previous: BuilderDocument,
  next: BuilderDocument,
  selectedId: string | null,
  preferredId?: string | null,
): string | null {
  if (
    preferredId !== undefined && preferredId !== null &&
    findChild(next, preferredId) !== undefined
  ) return preferredId;
  if (selectedId === null) return null;
  if (findChild(next, selectedId) !== undefined) return selectedId;
  const previousContext = findChild(previous, selectedId);
  if (previousContext === undefined) return null;

  const siblings = childrenAt(next, previousContext.location);
  const nextSibling = siblings[previousContext.index];
  if (nextSibling !== undefined) return nextSibling.id;
  const previousSibling = siblings[previousContext.index - 1];
  if (previousSibling !== undefined) return previousSibling.id;
  if (
    previousContext.location.parent === "node" &&
    findChild(next, previousContext.location.nodeId) !== undefined
  ) return previousContext.location.nodeId;

  const ancestors = ancestorsOf(previous, selectedId);
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index];
    if (ancestor !== undefined && findChild(next, ancestor.id) !== undefined) {
      return ancestor.id;
    }
  }
  return null;
}
