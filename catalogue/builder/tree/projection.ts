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

/** The exact place discovery displays and tree commands execute. */
export type InsertionTarget =
  | {
    readonly kind: "root-end";
    readonly location: Extract<BuilderLocation, { parent: "root" }>;
    readonly index: number;
    readonly label: string;
  }
  | {
    readonly kind: "slot-end" | "armed-slot";
    readonly location: Extract<BuilderLocation, { parent: "node" }>;
    readonly index: number;
    readonly ownerId: string;
    readonly prop: string;
    readonly label: string;
  }
  | {
    readonly kind: "after-selection";
    readonly location: BuilderLocation;
    readonly index: number;
    readonly referenceId: string;
    readonly label: string;
  }
  | {
    readonly kind: "explicit";
    readonly location: BuilderLocation;
    readonly index: number;
    readonly label: string;
  };

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
  readonly slotName: string | undefined;
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

/** Current selection's placement behavior, made explicit for discovery. */
export function selectionInsertionTarget(
  document: BuilderDocument,
  selectionId: string | null,
): InsertionTarget {
  const root: InsertionTarget = {
    kind: "root-end",
    location: { parent: "root" },
    index: document.children.length,
    label: "End of composition",
  };
  if (selectionId === null) return root;
  const found = findChild(document, selectionId);
  if (found === undefined) return root;
  if (
    found.child.kind === "component" &&
    componentHasPrimaryChildrenSlot(found.child)
  ) {
    const children = slotChildrenOf(found.child, "children");
    return {
      kind: "slot-end",
      location: {
        parent: "node",
        nodeId: found.child.id,
        prop: "children",
      },
      index: children.length,
      ownerId: found.child.id,
      prop: "children",
      label: `${childLabel(found.child)} · children`,
    };
  }
  return {
    kind: "after-selection",
    location: found.location,
    index: found.index + 1,
    referenceId: found.child.id,
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
    kind: "armed-slot",
    location: { parent: "node", nodeId, prop },
    index: slotChildrenOf(owner, prop).length,
    ownerId: nodeId,
    prop,
    label: `${childLabel(owner)} · ${prop}`,
  };
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
  ): void => {
    for (const [index, child] of children.entries()) {
      rows.push({ child, depth, location, index, slotName });
      if (child.kind !== "component") continue;
      for (const [prop, value] of Object.entries(child.props)) {
        if (value.kind !== "slot") continue;
        visit(
          value.children,
          { parent: "node", nodeId: child.id, prop },
          depth + 1,
          prop === "children" ? undefined : prop,
        );
      }
    }
  };
  visit(document.children, { parent: "root" }, 0, undefined);
  return rows;
}
