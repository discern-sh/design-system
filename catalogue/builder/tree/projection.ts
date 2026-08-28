/** Selection, insertion, and Layers projections over one accepted document. */
import type {
  BuilderChildContext,
  BuilderDocument,
  BuilderLocation,
  BuilderNode,
  BuilderSlotChild,
  BuilderTextChild,
} from "../model.ts";
import { findChild } from "../model.ts";
import { entryBySlug, registryCoreBySlug } from "../registry-core.ts";

/** The exact place every pointer, keyboard, palette, and drag command uses. */
export interface InsertionTarget {
  readonly kind: "root" | "slot";
  readonly relation: "end" | "before" | "after" | "inside";
  readonly location: BuilderLocation;
  readonly index: number;
  readonly label: string;
  readonly referenceId?: string;
  readonly ownerId?: string;
  readonly prop?: string;
}

/** Selection facts shared by preview, tree, discovery, and inspector. */
export interface BuilderSelectionProjection {
  readonly id: string | null;
  readonly context: BuilderChildContext | undefined;
  readonly node: BuilderNode | undefined;
  readonly text: BuilderTextChild | undefined;
  readonly insertionTarget: InsertionTarget;
}

/** One flattened Layers row, retaining its executable source location. */
export interface LayerRow {
  readonly child: BuilderSlotChild;
  readonly depth: number;
  readonly location: BuilderLocation;
  readonly index: number;
  readonly siblingCount: number;
  readonly slotName: string | undefined;
  readonly ancestorIds: readonly string[];
  readonly hasChildren: boolean;
  readonly slotNames: readonly string[];
}

/** Human label for a placed Component or literal text. */
export function childLabel(child: BuilderSlotChild): string {
  if (child.kind === "text") {
    const text = child.text.trim();
    return text === ""
      ? "Empty text"
      : `“${text.length > 24 ? `${text.slice(0, 24)}…` : text}”`;
  }
  return entryBySlug.get(child.slug)?.meta.name ?? child.slug;
}

/** Children currently held at one executable tree location. */
export function childrenAt(
  document: BuilderDocument,
  location: BuilderLocation,
): readonly BuilderSlotChild[] {
  if (location.parent === "root") return document.children;
  const owner = findChild(document, location.nodeId)?.child;
  if (owner === undefined || owner.kind !== "component") return [];
  return slotChildrenOf(owner, location.prop);
}

/** Children in one modeled slot, or an empty list before the slot exists. */
export function slotChildrenOf(
  node: BuilderNode,
  prop: string,
): readonly BuilderSlotChild[] {
  const value = node.props[prop];
  return value !== undefined && value.kind === "slot" ? value.children : [];
}

/** Whether the accepted Component exposes its ordinary children slot. */
export function componentHasPrimaryChildrenSlot(node: BuilderNode): boolean {
  return registryCoreBySlug.get(node.slug)?.controls.some(
    (control) => control.control === "slot" && control.name === "children",
  ) ?? false;
}

/** Generic Add always uses the page cursor, independent of selection. */
export function selectionInsertionTarget(
  document: BuilderDocument,
  _selectionId: string | null,
): InsertionTarget {
  return {
    kind: "root",
    relation: "end",
    location: { parent: "root" },
    index: document.children.length,
    label: "End of composition",
  };
}

/** Exact boundary before one existing child. */
export function insertionTargetBefore(
  document: BuilderDocument,
  id: string,
): InsertionTarget | undefined {
  const found = findChild(document, id);
  if (found === undefined) return undefined;
  return {
    kind: found.location.parent === "root" ? "root" : "slot",
    relation: "before",
    location: found.location,
    index: found.index,
    referenceId: id,
    label: `Before ${childLabel(found.child)}`,
  };
}

/** Exact boundary after one existing child. */
export function insertionTargetAfter(
  document: BuilderDocument,
  id: string,
): InsertionTarget | undefined {
  const found = findChild(document, id);
  if (found === undefined) return undefined;
  return {
    kind: found.location.parent === "root" ? "root" : "slot",
    relation: "after",
    location: found.location,
    index: found.index + 1,
    referenceId: id,
    label: `After ${childLabel(found.child)}`,
  };
}

/** Explicit slot target armed by Inspector's “Component…” action. */
export function armedSlotInsertionTarget(
  document: BuilderDocument,
  nodeId: string,
  prop: string,
): InsertionTarget | undefined {
  const owner = findChild(document, nodeId)?.child;
  if (owner === undefined || owner.kind !== "component") return undefined;
  return {
    kind: "slot",
    relation: "inside",
    location: { parent: "node", nodeId, prop },
    index: slotChildrenOf(owner, prop).length,
    ownerId: nodeId,
    prop,
    label: `${childLabel(owner)} · ${prop}`,
  };
}

/** Keep an armed cursor truthful as siblings change around its anchor. */
export function reconcileInsertionTarget(
  document: BuilderDocument,
  target: InsertionTarget,
): InsertionTarget | undefined {
  if (target.relation === "before" && target.referenceId !== undefined) {
    return insertionTargetBefore(document, target.referenceId);
  }
  if (target.relation === "after" && target.referenceId !== undefined) {
    return insertionTargetAfter(document, target.referenceId);
  }
  if (
    target.relation === "inside" && target.ownerId !== undefined &&
    target.prop !== undefined
  ) {
    return armedSlotInsertionTarget(document, target.ownerId, target.prop);
  }
  if (target.kind === "root" && target.relation === "end") {
    return selectionInsertionTarget(document, null);
  }
  const children = childrenAt(document, target.location);
  return { ...target, index: Math.min(target.index, children.length) };
}

/** Convert one pointer boundary to the same anchored target vocabulary. */
export function insertionTargetAt(
  document: BuilderDocument,
  location: BuilderLocation,
  index: number,
): InsertionTarget {
  const children = childrenAt(document, location);
  const next = children[Math.max(0, Math.min(index, children.length))];
  if (next !== undefined) {
    return insertionTargetBefore(document, next.id) ??
      selectionInsertionTarget(document, null);
  }
  if (location.parent === "root") {
    return selectionInsertionTarget(document, null);
  }
  return armedSlotInsertionTarget(document, location.nodeId, location.prop) ??
    selectionInsertionTarget(document, null);
}

/** Resolve a canvas node zone to an explicit before, after, or inside target. */
export function insertionTargetFromNodePointer(
  document: BuilderDocument,
  nodeId: string,
  relativeBlockPosition: number,
): InsertionTarget | undefined {
  const found = findChild(document, nodeId);
  if (found === undefined) return undefined;
  if (relativeBlockPosition <= 0.25) {
    return insertionTargetBefore(document, nodeId);
  }
  if (relativeBlockPosition >= 0.75) {
    return insertionTargetAfter(document, nodeId);
  }
  if (
    found.child.kind === "component" &&
    componentHasPrimaryChildrenSlot(found.child)
  ) {
    return armedSlotInsertionTarget(document, nodeId, "children");
  }
  return relativeBlockPosition < 0.5
    ? insertionTargetBefore(document, nodeId)
    : insertionTargetAfter(document, nodeId);
}

/** Complete selection projection from one accepted document. */
export function projectBuilderSelection(
  document: BuilderDocument,
  id: string | null,
): BuilderSelectionProjection {
  const context = id === null ? undefined : findChild(document, id);
  const node = context?.child.kind === "component" ? context.child : undefined;
  const text = context?.child.kind === "text" ? context.child : undefined;
  return {
    id: context === undefined ? null : id,
    context,
    node,
    text,
    insertionTarget: selectionInsertionTarget(
      document,
      context === undefined ? null : id,
    ),
  };
}

/** Flatten the complete accepted tree for the Layers surface. */
export function projectLayers(
  document: BuilderDocument,
): readonly LayerRow[] {
  const rows: LayerRow[] = [];
  const visit = (
    children: readonly BuilderSlotChild[],
    location: BuilderLocation,
    depth: number,
    slotName: string | undefined,
    ancestorIds: readonly string[],
  ): void => {
    for (const [index, child] of children.entries()) {
      const slotNames = child.kind === "component"
        ? registryCoreBySlug.get(child.slug)?.controls.flatMap((control) =>
          control.control === "slot" ? [control.name] : []
        ) ?? []
        : [];
      const hasChildren = child.kind === "component" &&
        Object.values(child.props).some((value) =>
          value.kind === "slot" && value.children.length > 0
        );
      rows.push({
        child,
        depth,
        location,
        index,
        siblingCount: children.length,
        slotName,
        ancestorIds,
        hasChildren,
        slotNames,
      });
      if (child.kind !== "component") continue;
      for (const [prop, value] of Object.entries(child.props)) {
        if (value.kind !== "slot") continue;
        visit(
          value.children,
          { parent: "node", nodeId: child.id, prop },
          depth + 1,
          prop === "children" ? undefined : prop,
          [...ancestorIds, child.id],
        );
      }
    }
  };
  visit(document.children, { parent: "root" }, 0, undefined, []);
  return rows;
}
