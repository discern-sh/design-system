/**
 * Document model for the interface builder: a serializable tree of design
 * system component instances whose slots hold further instances or text.
 */

/** A configured scalar prop value on a builder node. */
export type BuilderScalarValue =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "json"; readonly source: string };

/** Literal text placed inside a slot. */
export interface BuilderTextChild {
  readonly kind: "text";
  readonly id: string;
  readonly text: string;
}

/** One member of a slot: nested component or literal text. */
export type BuilderSlotChild = BuilderTextChild | BuilderNode;

/** A ReactNode-typed prop holding ordered slot children. */
export interface BuilderSlot {
  readonly kind: "slot";
  readonly children: readonly BuilderSlotChild[];
}

/** Any configured prop value on a builder node. */
export type BuilderPropValue = BuilderScalarValue | BuilderSlot;

/** One placed design-system component instance. */
export interface BuilderNode {
  readonly kind: "component";
  readonly id: string;
  readonly slug: string;
  readonly props: Readonly<Record<string, BuilderPropValue>>;
  /** Raw JSON object source merged into the props at render and export time. */
  readonly extra?: string;
}

/** A complete builder composition. */
export interface BuilderDocument {
  readonly version: 1;
  readonly name: string;
  readonly children: readonly BuilderSlotChild[];
}

/** Where a slot child lives: the document root or a named slot of a node. */
export type BuilderLocation =
  | { readonly parent: "root" }
  | { readonly parent: "node"; readonly nodeId: string; readonly prop: string };

/** A found child together with its location and position. */
export interface BuilderChildContext {
  readonly child: BuilderSlotChild;
  readonly location: BuilderLocation;
  readonly index: number;
}

/** An empty, named document. */
export function emptyDocument(name: string): BuilderDocument {
  return { version: 1, name, children: [] };
}

/** A fresh unique child id. */
export function newChildId(): string {
  return crypto.randomUUID();
}

function slotEntries(
  node: BuilderNode,
): readonly (readonly [string, BuilderSlot])[] {
  return Object.entries(node.props).filter(
    (entry): entry is [string, BuilderSlot] => entry[1].kind === "slot",
  );
}

function findInChildren(
  children: readonly BuilderSlotChild[],
  location: BuilderLocation,
  id: string,
): BuilderChildContext | undefined {
  for (const [index, child] of children.entries()) {
    if (child.id === id) return { child, location, index };
    if (child.kind !== "component") continue;
    for (const [prop, slot] of slotEntries(child)) {
      const found = findInChildren(
        slot.children,
        { parent: "node", nodeId: child.id, prop },
        id,
      );
      if (found) return found;
    }
  }
  return undefined;
}

/** Find a child (component or text) anywhere in the document. */
export function findChild(
  document: BuilderDocument,
  id: string,
): BuilderChildContext | undefined {
  return findInChildren(document.children, { parent: "root" }, id);
}

/** The component chain from the root down to the direct parent of `id`. */
export function ancestorsOf(
  document: BuilderDocument,
  id: string,
): readonly BuilderNode[] {
  const walk = (
    children: readonly BuilderSlotChild[],
    path: readonly BuilderNode[],
  ): readonly BuilderNode[] | undefined => {
    for (const child of children) {
      if (child.id === id) return path;
      if (child.kind !== "component") continue;
      for (const [, slot] of slotEntries(child)) {
        const found = walk(slot.children, [...path, child]);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  return walk(document.children, []) ?? [];
}

/**
 * Replace a child with `wrapper` holding that child as the sole member of
 * its `prop` slot. The wrapper must be a fresh instance, not a placed one.
 */
export function wrapChild(
  document: BuilderDocument,
  id: string,
  wrapper: BuilderNode,
  prop = "children",
): BuilderDocument {
  const found = findChild(document, id);
  if (found === undefined) return document;
  if (findChild(document, wrapper.id) !== undefined) return document;
  const wrapped: BuilderNode = {
    ...wrapper,
    props: {
      ...wrapper.props,
      [prop]: { kind: "slot", children: [found.child] },
    },
  };
  return withChildrenAt(
    document,
    found.location,
    (children) => children.map((child) => (child.id === id ? wrapped : child)),
  );
}

/** True when `candidateId` is `ancestorId` itself or sits inside its subtree. */
export function isWithinSubtree(
  document: BuilderDocument,
  ancestorId: string,
  candidateId: string,
): boolean {
  if (ancestorId === candidateId) return true;
  const ancestor = findChild(document, ancestorId)?.child;
  if (ancestor === undefined || ancestor.kind !== "component") return false;
  return slotEntries(ancestor).some(([, slot]) =>
    findInChildren(slot.children, { parent: "root" }, candidateId) !== undefined
  );
}

function mapChildren(
  children: readonly BuilderSlotChild[],
  transform: (child: BuilderSlotChild) => BuilderSlotChild,
): readonly BuilderSlotChild[] {
  let listChanged = false;
  const mappedChildren = children.map((child) => {
    const mapped = transform(child);
    if (mapped.kind !== "component") {
      if (mapped !== child) listChanged = true;
      return mapped;
    }
    let props: Record<string, BuilderPropValue> | undefined;
    for (const [name, value] of Object.entries(mapped.props)) {
      if (value.kind !== "slot") continue;
      const nested = mapChildren(value.children, transform);
      if (nested === value.children) continue;
      props ??= { ...mapped.props };
      props[name] = { kind: "slot", children: nested };
    }
    const result = props === undefined ? mapped : { ...mapped, props };
    if (result !== child) listChanged = true;
    return result;
  });
  return listChanged ? mappedChildren : children;
}

function withChildrenAt(
  document: BuilderDocument,
  location: BuilderLocation,
  update: (
    children: readonly BuilderSlotChild[],
  ) => readonly BuilderSlotChild[],
): BuilderDocument {
  if (location.parent === "root") {
    const children = update(document.children);
    return children === document.children
      ? document
      : { ...document, children };
  }
  const children = mapChildren(document.children, (child) => {
    if (child.kind !== "component" || child.id !== location.nodeId) {
      return child;
    }
    const slot = child.props[location.prop];
    const existing = slot?.kind === "slot" ? slot.children : [];
    const next = update(existing);
    if (next === existing) return child;
    return {
      ...child,
      props: {
        ...child.props,
        [location.prop]: { kind: "slot", children: next },
      },
    };
  });
  return children === document.children ? document : { ...document, children };
}

function childrenAt(
  document: BuilderDocument,
  location: BuilderLocation,
): readonly BuilderSlotChild[] | undefined {
  if (location.parent === "root") return document.children;
  const parent = findChild(document, location.nodeId)?.child;
  if (parent === undefined || parent.kind !== "component") return undefined;
  const slot = parent.props[location.prop];
  if (slot === undefined) return [];
  return slot.kind === "slot" ? slot.children : undefined;
}

/** Insert a child at an index (clamped) inside a root or slot location. */
export function insertChild(
  document: BuilderDocument,
  location: BuilderLocation,
  index: number,
  child: BuilderSlotChild,
): BuilderDocument {
  return withChildrenAt(document, location, (children) => {
    const at = Math.max(0, Math.min(index, children.length));
    return [...children.slice(0, at), child, ...children.slice(at)];
  });
}

/** Remove a child (and its subtree) anywhere in the document. */
export function removeChild(
  document: BuilderDocument,
  id: string,
): BuilderDocument {
  const found = findChild(document, id);
  if (found === undefined) return document;
  return withChildrenAt(
    document,
    found.location,
    (children) => children.filter((child) => child.id !== id),
  );
}

/**
 * Move a child to a new location and index. Refuses moves into the child's
 * own subtree, which would orphan it.
 */
export function moveChild(
  document: BuilderDocument,
  id: string,
  location: BuilderLocation,
  index: number,
): BuilderDocument {
  const found = findChild(document, id);
  if (found === undefined) return document;
  if (location.parent === "node") {
    const destination = findChild(document, location.nodeId)?.child;
    if (destination === undefined || destination.kind !== "component") {
      return document;
    }
    if (isWithinSubtree(document, id, location.nodeId)) return document;
  }
  const sameParent = sameLocation(found.location, location);
  const destinationChildren = childrenAt(document, location);
  if (destinationChildren === undefined) return document;
  const clamped = Math.max(0, Math.min(index, destinationChildren.length));
  const at = sameParent && found.index < clamped ? clamped - 1 : clamped;
  if (sameParent && at === found.index) return document;
  const removed = withChildrenAt(
    document,
    found.location,
    (children) => children.filter((child) => child.id !== id),
  );
  return insertChild(removed, location, at, found.child);
}

function sameLocation(a: BuilderLocation, b: BuilderLocation): boolean {
  if (a.parent === "root" || b.parent === "root") return a.parent === b.parent;
  return a.nodeId === b.nodeId && a.prop === b.prop;
}

/** Move a child one step earlier or later among its siblings. */
export function nudgeChild(
  document: BuilderDocument,
  id: string,
  direction: -1 | 1,
): BuilderDocument {
  const found = findChild(document, id);
  if (found === undefined) return document;
  const siblings = childrenAt(document, found.location);
  if (siblings === undefined) return document;
  const target = found.index + direction;
  if (target < 0 || target >= siblings.length) return document;
  return moveChild(
    document,
    id,
    found.location,
    direction === 1 ? target + 1 : target,
  );
}

/** Replace one configured prop value on a component node. */
export function updateNodeProp(
  document: BuilderDocument,
  nodeId: string,
  prop: string,
  value: BuilderPropValue | undefined,
): BuilderDocument {
  const children = mapChildren(document.children, (child) => {
    if (child.kind !== "component" || child.id !== nodeId) return child;
    if (value === undefined && child.props[prop] === undefined) return child;
    if (value !== undefined && child.props[prop] === value) return child;
    const props = { ...child.props };
    if (value === undefined) delete props[prop];
    else props[prop] = value;
    return { ...child, props };
  });
  return children === document.children ? document : { ...document, children };
}

/** Replace the raw additional-props JSON source on a component node. */
export function updateNodeExtra(
  document: BuilderDocument,
  nodeId: string,
  extra: string,
): BuilderDocument {
  const children = mapChildren(document.children, (child) => {
    if (child.kind !== "component" || child.id !== nodeId) return child;
    if (extra.trim() === "") {
      if (child.extra === undefined) return child;
      const { extra: _removed, ...rest } = child;
      return rest;
    }
    if (child.extra === extra) return child;
    return { ...child, extra };
  });
  return children === document.children ? document : { ...document, children };
}

/** Replace the text of a text child. */
export function updateTextChild(
  document: BuilderDocument,
  id: string,
  text: string,
): BuilderDocument {
  const children = mapChildren(
    document.children,
    (child) =>
      child.kind === "text" && child.id === id && child.text !== text
        ? { ...child, text }
        : child,
  );
  return children === document.children ? document : { ...document, children };
}

function cloneWithNewIds(child: BuilderSlotChild): BuilderSlotChild {
  if (child.kind === "text") return { ...child, id: newChildId() };
  const props: Record<string, BuilderPropValue> = {};
  for (const [name, value] of Object.entries(child.props)) {
    props[name] = value.kind === "slot"
      ? { kind: "slot", children: value.children.map(cloneWithNewIds) }
      : value;
  }
  return { ...child, id: newChildId(), props };
}

/** Insert a deep copy of a child (fresh ids throughout) after the original. */
export function duplicateChild(
  document: BuilderDocument,
  id: string,
): BuilderDocument {
  const found = findChild(document, id);
  if (found === undefined) return document;
  return insertChild(
    document,
    found.location,
    found.index + 1,
    cloneWithNewIds(found.child),
  );
}

/** Every component slug used in the document, deduplicated, in first-use order. */
export function usedSlugs(document: BuilderDocument): readonly string[] {
  const slugs: string[] = [];
  const visit = (children: readonly BuilderSlotChild[]): void => {
    for (const child of children) {
      if (child.kind !== "component") continue;
      if (!slugs.includes(child.slug)) slugs.push(child.slug);
      for (const value of Object.values(child.props)) {
        if (value.kind === "slot") visit(value.children);
      }
    }
  };
  visit(document.children);
  return slugs;
}

/** Count of placed component instances in the document. */
export function componentCount(document: BuilderDocument): number {
  let count = 0;
  const visit = (children: readonly BuilderSlotChild[]): void => {
    for (const child of children) {
      if (child.kind !== "component") continue;
      count += 1;
      for (const value of Object.values(child.props)) {
        if (value.kind === "slot") visit(value.children);
      }
    }
  };
  visit(document.children);
  return count;
}
