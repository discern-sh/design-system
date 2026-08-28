import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  duplicateChild,
  findChild,
  insertChild,
  moveChild,
  newChildId,
  nudgeChild,
  removeChild,
  wrapChild,
} from "../model.ts";
import type { BuilderLocation, BuilderSlotChild } from "../model.ts";
import {
  documentPolicy,
  entryBySlug,
  instantiateComponent,
} from "../registry-core.ts";
import type { AcceptedDocumentStore } from "../workspace/document-store.ts";
import type { WorkspacePane } from "../workspace/panes.tsx";
import type { BuilderDragPayload } from "./drag.ts";
import {
  armedSlotInsertionTarget,
  type BuilderSelectionProjection,
  childLabel,
  childrenAt,
  componentHasPrimaryChildrenSlot,
  type InsertionTarget,
  type LayerRow,
  projectBuilderSelection,
  projectLayers,
  slotChildrenOf,
} from "./projection.ts";

const SHORTCUT_OWNER_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]",
  "[role='button']",
  "[role='checkbox']",
  "[role='combobox']",
  "[role='link']",
  "[role='menuitem']",
  "[role='option']",
  "[role='radio']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='switch']",
  "[role='tab']",
  "audio[controls]",
  "video[controls]",
].join(",");

const LAYOUT_WRAPPER_SLUGS = [
  "stack",
  "cluster",
  "section",
  "container",
] as const;

function shortcutBelongsToControl(event: KeyboardEvent): boolean {
  return event.composedPath().some((target) =>
    target instanceof Element && target.matches(SHORTCUT_OWNER_SELECTOR)
  );
}

function laterFocus(selector: string): void {
  globalThis.requestAnimationFrame(() =>
    globalThis.document.querySelector<HTMLElement>(selector)?.focus()
  );
}

function explicitTarget(
  location: BuilderLocation,
  index: number,
  label: string,
): InsertionTarget {
  return { kind: "explicit", location, index, label };
}

export interface BuilderTreeController {
  readonly selection: BuilderSelectionProjection;
  readonly insertionTarget: InsertionTarget;
  readonly pendingInsertionTarget: InsertionTarget | null;
  readonly layers: readonly LayerRow[];
  readonly dragging: boolean;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
  readonly wrapTargets: readonly {
    readonly slug: string;
    readonly name: string;
  }[];
  setDragging(value: boolean): void;
  selectForEditing(id: string | null): void;
  selectLayer(id: string): void;
  placeComponent(slug: string, target?: InsertionTarget): void;
  deleteChild(id: string): void;
  wrapSelection(id: string, slug: string): void;
  nudgeSelection(id: string, direction: -1 | 1): void;
  duplicateSelection(id: string): void;
  armComponentSlot(nodeId: string, prop: string): void;
  addText(nodeId: string, prop: string, label: string): void;
  drop(payload: BuilderDragPayload, target: InsertionTarget): void;
  dropOnNode(payload: BuilderDragPayload, nodeId: string): void;
  undo(): void;
  redo(): void;
  resetSelection(): void;
}

/** Tree-owned selection, insertion, mutation, history-focus, and Layers state. */
export function useBuilderTreeController(
  store: AcceptedDocumentStore,
  setActivePane: Dispatch<SetStateAction<WorkspacePane>>,
  announce: (message: string, tone?: "status" | "error") => void,
): BuilderTreeController {
  const document = store.document;
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [pendingTarget, setPendingTarget] = useState<InsertionTarget | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const selection = useMemo(
    () => projectBuilderSelection(document, selectionId),
    [document, selectionId],
  );
  const effectivePending = pendingTarget?.kind === "armed-slot"
    ? armedSlotInsertionTarget(
      document,
      pendingTarget.ownerId,
      pendingTarget.prop,
    ) ?? null
    : pendingTarget;
  const insertionTarget = effectivePending ?? selection.insertionTarget;
  const layers = useMemo(() => projectLayers(document), [document]);
  const siblings = selection.context === undefined
    ? []
    : childrenAt(document, selection.context.location);
  const canMoveUp = selection.context !== undefined &&
    selection.context.index > 0;
  const canMoveDown = selection.context !== undefined &&
    selection.context.index < siblings.length - 1;
  const wrapTargets = LAYOUT_WRAPPER_SLUGS
    .filter((slug) => documentPolicy.knownSlugs.has(slug))
    .map((slug) => ({ slug, name: entryBySlug.get(slug)?.meta.name ?? slug }));

  const selectForEditing = (id: string | null): void => {
    const selected = id === null ? undefined : findChild(document, id)?.child;
    if (id !== null && selected === undefined) return;
    setSelectionId(id);
    setPendingTarget(null);
    setActivePane("inspector");
    laterFocus(
      id === null
        ? "#discern-builder-composition-heading"
        : "#discern-builder-selection-heading",
    );
    announce(
      selected === undefined
        ? "Selected the composition."
        : `Selected ${childLabel(selected)}.`,
    );
  };

  const selectLayer = (id: string): void => {
    const selected = findChild(document, id)?.child;
    if (selected === undefined) return;
    setSelectionId(id);
    setPendingTarget(null);
    announce(`Selected ${childLabel(selected)}.`);
  };

  const placeComponent = (slug: string, target = insertionTarget): void => {
    if (!documentPolicy.knownSlugs.has(slug)) return;
    const instance = instantiateComponent(slug);
    const result = store.apply((current) =>
      insertChild(current, target.location, target.index, instance)
    );
    if (!result.changed) return;
    setPendingTarget(null);
    setSelectionId(instance.id);
    setActivePane("inspector");
    laterFocus("#discern-builder-selection-heading");
    announce(`Placed ${childLabel(instance)}.`);
  };

  const deleteSelectedChild = (id: string): void => {
    const found = findChild(document, id);
    if (found === undefined) return;
    const currentSiblings = childrenAt(document, found.location);
    const focusId = currentSiblings[found.index + 1]?.id ??
      currentSiblings[found.index - 1]?.id ??
      (found.location.parent === "node" ? found.location.nodeId : null);
    const label = childLabel(found.child);
    if (!store.apply((current) => removeChild(current, id)).changed) return;
    setSelectionId(focusId);
    setPendingTarget(null);
    setActivePane("inspector");
    laterFocus(
      focusId === null
        ? "#discern-builder-composition-heading"
        : `[data-discern-builder-outline-id="${CSS.escape(focusId)}"] > button`,
    );
    announce(`Deleted ${label}.`);
  };

  const wrapSelection = (id: string, slug: string): void => {
    if (findChild(document, id) === undefined) return;
    const wrapper = instantiateComponent(slug);
    if (!store.apply((current) => wrapChild(current, id, wrapper)).changed) {
      return;
    }
    setSelectionId(wrapper.id);
    laterFocus("#discern-builder-selection-heading");
    announce(`Wrapped the selection in ${childLabel(wrapper)}.`);
  };

  const nudgeSelection = (id: string, direction: -1 | 1): void => {
    const found = findChild(document, id);
    if (found === undefined) return;
    if (!store.apply((current) => nudgeChild(current, id, direction)).changed) {
      return;
    }
    announce(
      `Moved ${childLabel(found.child)} ${direction < 0 ? "up" : "down"}.`,
    );
  };

  const duplicateSelection = (id: string): void => {
    const found = findChild(document, id);
    if (found === undefined) return;
    let duplicatedId: string | null = null;
    const result = store.apply((current) => {
      const currentFound = findChild(current, id);
      if (currentFound === undefined) return current;
      const next = duplicateChild(current, id);
      duplicatedId = childrenAt(next, currentFound.location)[
        currentFound.index + 1
      ]?.id ?? null;
      return next;
    });
    if (!result.changed || duplicatedId === null) return;
    setSelectionId(duplicatedId);
    laterFocus(
      `[data-discern-builder-outline-id="${
        CSS.escape(duplicatedId)
      }"] > button`,
    );
    announce(`Duplicated ${childLabel(found.child)}.`);
  };

  const armComponentSlot = (nodeId: string, prop: string): void => {
    const target = armedSlotInsertionTarget(document, nodeId, prop);
    if (target === undefined) return;
    setPendingTarget(target);
    setActivePane("palette");
    laterFocus("#discern-builder-component-search");
    announce(`Choose a component for ${prop}.`);
  };

  const addText = (nodeId: string, prop: string, label: string): void => {
    const child: BuilderSlotChild = {
      kind: "text",
      id: newChildId(),
      text: "Text",
    };
    const target = armedSlotInsertionTarget(document, nodeId, prop);
    if (target === undefined) return;
    if (
      !store.apply((current) =>
        insertChild(current, target.location, Number.MAX_SAFE_INTEGER, child)
      ).changed
    ) return;
    setSelectionId(child.id);
    laterFocus("#discern-builder-selection-heading");
    announce(`Added text to ${label}.`);
  };

  const drop = (payload: BuilderDragPayload, target: InsertionTarget): void => {
    if (payload.type === "palette") {
      placeComponent(payload.slug, target);
      return;
    }
    const moved = findChild(document, payload.id)?.child;
    if (moved === undefined) return;
    if (
      !store.apply((current) =>
        moveChild(current, payload.id, target.location, target.index)
      ).changed
    ) return;
    setSelectionId(payload.id);
    announce(`Moved ${childLabel(moved)}.`);
  };

  const dropOnNode = (payload: BuilderDragPayload, nodeId: string): void => {
    const found = findChild(document, nodeId);
    if (found === undefined) return;
    if (
      found.child.kind === "component" &&
      componentHasPrimaryChildrenSlot(found.child) &&
      !(payload.type === "child" && payload.id === nodeId)
    ) {
      drop(
        payload,
        explicitTarget(
          { parent: "node", nodeId, prop: "children" },
          slotChildrenOf(found.child, "children").length,
          `${childLabel(found.child)} · children`,
        ),
      );
      return;
    }
    drop(
      payload,
      explicitTarget(
        found.location,
        found.index + 1,
        `After ${childLabel(found.child)}`,
      ),
    );
  };

  const travel = (direction: "undo" | "redo"): void => {
    const next = direction === "undo" ? store.undo() : store.redo();
    if (next.present === document) return;
    if (
      selectionId !== null && findChild(next.present, selectionId) === undefined
    ) {
      setSelectionId(null);
      laterFocus("#discern-builder-composition-heading");
    }
    announce(
      direction === "undo" ? "Undid the last change." : "Redid the change.",
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented || event.isComposing ||
        shortcutBelongsToControl(event)
      ) return;
      if (event.key === "Escape") {
        setPendingTarget(null);
        setSelectionId(null);
        return;
      }
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        travel(event.shiftKey ? "redo" : "undo");
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectionId !== null
      ) {
        event.preventDefault();
        deleteSelectedChild(selectionId);
      }
    };
    const onDragEnd = (): void => setDragging(false);
    globalThis.addEventListener("keydown", onKeyDown);
    globalThis.addEventListener("dragend", onDragEnd);
    return () => {
      globalThis.removeEventListener("keydown", onKeyDown);
      globalThis.removeEventListener("dragend", onDragEnd);
    };
  }, [document, selectionId]);

  return {
    selection,
    insertionTarget,
    pendingInsertionTarget: effectivePending,
    layers,
    dragging,
    canMoveUp,
    canMoveDown,
    wrapTargets,
    setDragging,
    selectForEditing,
    selectLayer,
    placeComponent,
    deleteChild: deleteSelectedChild,
    wrapSelection,
    nudgeSelection,
    duplicateSelection,
    armComponentSlot,
    addText,
    drop,
    dropOnNode,
    undo: () => travel("undo"),
    redo: () => travel("redo"),
    resetSelection() {
      setSelectionId(null);
      setPendingTarget(null);
      setActivePane("inspector");
      laterFocus("#discern-builder-composition-heading");
    },
  };
}
