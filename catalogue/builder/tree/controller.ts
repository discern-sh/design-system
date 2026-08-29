import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  duplicateChild,
  findChild,
  isWithinSubtree,
  newChildId,
  removeChild,
  wrapChild,
} from "../model.ts";
import type { BuilderSlotChild } from "../model.ts";
import {
  compatibleInsertionSuggestions,
  preflightInsertion,
} from "../placement.ts";
import type { BuilderInsertionSubject } from "../placement.ts";
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
  insertionTargetAfter,
  insertionTargetBefore,
  type LayerRow,
  projectBuilderSelection,
  projectLayers,
  reconcileInsertionTarget,
} from "./projection.ts";
import type { BuilderPlacementFailure } from "./compatibility.ts";
import { preflightBuilderStructure } from "./compatibility.ts";
import { reconcileSelection } from "./selection.ts";

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
  const path = event.composedPath();
  if (
    path.some((target) =>
      target instanceof Element &&
      target.matches('[data-discern-builder-shortcuts="document"]')
    )
  ) return false;
  return path.some((target) =>
    target instanceof Element && target.matches(SHORTCUT_OWNER_SELECTOR)
  );
}

function laterFocus(selector: string): void {
  globalThis.requestAnimationFrame(() =>
    globalThis.document.querySelector<HTMLElement>(selector)?.focus()
  );
}

export interface BuilderTreeController {
  readonly selection: BuilderSelectionProjection;
  readonly insertionTarget: InsertionTarget;
  readonly pendingInsertionTarget: InsertionTarget | null;
  readonly layers: readonly LayerRow[];
  readonly dragging: boolean;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
  readonly lastRefusal: BuilderPlacementFailure | null;
  readonly wrapTargets: readonly {
    readonly slug: string;
    readonly name: string;
  }[];
  setDragging(value: boolean): void;
  selectForEditing(id: string | null): void;
  selectLayer(id: string): void;
  editTextFromCanvas(id: string): void;
  placeComponent(slug: string, target?: InsertionTarget): void;
  armBefore(id: string): void;
  armAfter(id: string): void;
  armRootEnd(): void;
  cancelInsertionTarget(): void;
  deleteChild(id: string): void;
  wrapSelection(id: string, slug: string): void;
  nudgeSelection(id: string, direction: -1 | 1): void;
  duplicateSelection(id: string): void;
  armComponentSlot(nodeId: string, prop: string): void;
  addText(nodeId: string, prop: string, label: string): void;
  drop(payload: BuilderDragPayload, target: InsertionTarget): void;
  moveIntoPrevious(id: string): void;
  moveOut(id: string): void;
  canMoveIntoPrevious(id: string): boolean;
  canMoveOut(id: string): boolean;
  isCollapsed(id: string): boolean;
  toggleCollapsed(id: string): void;
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
  const [lastRefusal, setLastRefusal] = useState<
    BuilderPlacementFailure | null
  >(
    null,
  );
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const selection = useMemo(
    () => projectBuilderSelection(document, selectionId),
    [document, selectionId],
  );
  const effectivePending = pendingTarget === null
    ? null
    : reconcileInsertionTarget(document, pendingTarget) ?? null;
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

  useEffect(() => {
    setLastRefusal(null);
    if (pendingTarget !== null && effectivePending === null) {
      setPendingTarget(null);
    }
  }, [document]);

  const runMutation = (
    command: (current: typeof document) => typeof document,
  ): Readonly<{ changed: boolean; next: typeof document }> => {
    let next = document;
    const outcome: { refusal?: BuilderPlacementFailure } = {};
    const result = store.apply((current) => {
      const candidate = command(current);
      if (candidate === current) return current;
      const preflight = preflightBuilderStructure(
        candidate,
        documentPolicy.compatibility,
      );
      if (!preflight.ok) {
        outcome.refusal = preflight.failure;
        return current;
      }
      next = candidate;
      return candidate;
    });
    const refusal = outcome.refusal;
    if (refusal !== undefined) {
      setLastRefusal(refusal);
      announce(`${refusal.humanPath} ${refusal.reason}.`, "error");
      return { changed: false, next: document };
    }
    if (result.error !== null) {
      const generic: BuilderPlacementFailure = {
        humanPath: "The proposed placement",
        reason: "could not be accepted",
        technicalDetail: result.error,
        suggestions: [],
      };
      setLastRefusal(generic);
      return { changed: false, next: document };
    }
    if (result.changed) setLastRefusal(null);
    return { changed: result.changed, next };
  };

  const selectForEditing = (id: string | null): void => {
    const selected = id === null ? undefined : findChild(document, id)?.child;
    if (id !== null && selected === undefined) return;
    setSelectionId(id);
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
    announce(`Selected ${childLabel(selected)}.`);
  };

  const editTextFromCanvas = (id: string): void => {
    const selected = findChild(document, id)?.child;
    if (selected === undefined) return;
    const texts: BuilderSlotChild[] = [];
    const collect = (child: BuilderSlotChild): void => {
      if (child.kind === "text") {
        texts.push(child);
        return;
      }
      for (const value of Object.values(child.props)) {
        if (value.kind !== "slot") continue;
        for (const nested of value.children) collect(nested);
      }
    };
    collect(selected);
    const only = texts.length === 1 ? texts[0] : undefined;
    if (only?.kind !== "text") {
      selectForEditing(id);
      announce(
        `Selected ${
          childLabel(selected)
        }. Choose the literal text in Layers to edit it.`,
      );
      return;
    }
    setSelectionId(only.id);
    setActivePane("inspector");
    laterFocus(".discern-builder-inspector__body textarea");
    announce(`Editing text inside ${childLabel(selected)}.`);
  };

  const executeInsertion = (
    subject: BuilderInsertionSubject,
    target: InsertionTarget,
    action: "Placed" | "Moved" = subject.kind === "new" ? "Placed" : "Moved",
  ): boolean => {
    const child = subject.kind === "new"
      ? subject.child
      : findChild(document, subject.id)?.child;
    if (child === undefined) return false;
    const preflight = preflightInsertion(
      document,
      subject,
      target,
      documentPolicy.compatibility,
    );
    if (!preflight.ok) {
      const refusal = {
        ...preflight.failure,
        suggestions: compatibleInsertionSuggestions(
          document,
          subject,
          documentPolicy.compatibility,
          target,
        ),
      };
      setLastRefusal(refusal);
      announce(`${refusal.humanPath} ${refusal.reason}.`, "error");
      return false;
    }
    const candidate = preflight.document;
    if (candidate === document) return false;
    const result = runMutation(() => candidate);
    if (!result.changed) return false;
    setSelectionId(child.id);
    setActivePane("inspector");
    laterFocus(
      `[data-discern-builder-outline-id="${
        CSS.escape(child.id)
      }"] .discern-builder-layers__select`,
    );
    announce(`${action} ${childLabel(child)} at ${target.label}.`);
    return true;
  };

  const placeComponent = (slug: string, target = insertionTarget): void => {
    if (!documentPolicy.knownSlugs.has(slug)) return;
    const instance = instantiateComponent(slug);
    executeInsertion({ kind: "new", child: instance }, target);
  };

  const deleteSelectedChild = (id: string): void => {
    const found = findChild(document, id);
    if (found === undefined) return;
    const label = childLabel(found.child);
    const result = runMutation((current) => removeChild(current, id));
    if (!result.changed) return;
    const focusId = reconcileSelection(document, result.next, id);
    setSelectionId(focusId);
    setActivePane("inspector");
    laterFocus(
      focusId === null
        ? "#discern-builder-composition-heading"
        : `[data-discern-builder-outline-id="${
          CSS.escape(focusId)
        }"] .discern-builder-layers__select`,
    );
    announce(`Deleted ${label}.`);
  };

  const wrapSelection = (id: string, slug: string): void => {
    if (findChild(document, id) === undefined) return;
    const wrapper = instantiateComponent(slug);
    if (!runMutation((current) => wrapChild(current, id, wrapper)).changed) {
      return;
    }
    setSelectionId(wrapper.id);
    laterFocus("#discern-builder-selection-heading");
    announce(`Wrapped the selection in ${childLabel(wrapper)}.`);
  };

  const nudgeSelection = (id: string, direction: -1 | 1): void => {
    const found = findChild(document, id);
    if (found === undefined) return;
    const siblings = childrenAt(document, found.location);
    const reference = siblings[found.index + direction];
    if (reference === undefined) return;
    const target = direction < 0
      ? insertionTargetBefore(document, reference.id)
      : insertionTargetAfter(document, reference.id);
    if (target === undefined) return;
    executeInsertion({ kind: "existing", id }, target);
  };

  const duplicateSelection = (id: string): void => {
    const found = findChild(document, id);
    if (found === undefined) return;
    let duplicatedId: string | null = null;
    const result = runMutation((current) => {
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
      }"] .discern-builder-layers__select`,
    );
    announce(`Duplicated ${childLabel(found.child)}.`);
  };

  const armComponentSlot = (nodeId: string, prop: string): void => {
    const target = armedSlotInsertionTarget(document, nodeId, prop);
    if (target === undefined) return;
    setPendingTarget(target);
    setActivePane("palette");
    laterFocus("#discern-builder-component-search");
    announce(
      `Adding to ${target.label}. Choose a component or press Escape to cancel.`,
    );
  };

  const armTarget = (target: InsertionTarget | undefined): void => {
    if (target === undefined) return;
    setPendingTarget(target);
    setLastRefusal(null);
    setActivePane("palette");
    laterFocus("#discern-builder-component-search");
    announce(`Adding to ${target.label}.`);
  };

  const addText = (nodeId: string, prop: string, label: string): void => {
    const child: BuilderSlotChild = {
      kind: "text",
      id: newChildId(),
      text: "Text",
    };
    const target = armedSlotInsertionTarget(document, nodeId, prop);
    if (target === undefined) return;
    if (!executeInsertion({ kind: "new", child }, target, "Placed")) return;
    announce(`Added text to ${label} at ${target.label}.`);
  };

  const drop = (payload: BuilderDragPayload, target: InsertionTarget): void => {
    if (payload.type === "palette") {
      placeComponent(payload.slug, target);
      return;
    }
    executeInsertion({ kind: "existing", id: payload.id }, target);
  };

  const moveIntoPrevious = (id: string): void => {
    const found = findChild(document, id);
    if (found === undefined || found.index === 0) return;
    const previous = childrenAt(document, found.location)[found.index - 1];
    if (
      previous?.kind !== "component" ||
      !componentHasPrimaryChildrenSlot(previous)
    ) return;
    const target = armedSlotInsertionTarget(document, previous.id, "children");
    if (target !== undefined) {
      executeInsertion({ kind: "existing", id }, target);
    }
  };

  const moveOut = (id: string): void => {
    const found = findChild(document, id);
    if (found?.location.parent !== "node") return;
    const target = insertionTargetAfter(document, found.location.nodeId);
    if (target !== undefined) {
      executeInsertion({ kind: "existing", id }, target);
    }
  };

  const canMoveIntoPrevious = (id: string): boolean => {
    const found = findChild(document, id);
    if (found === undefined || found.index === 0) return false;
    const previous = childrenAt(document, found.location)[found.index - 1];
    return previous?.kind === "component" &&
      componentHasPrimaryChildrenSlot(previous);
  };

  const canMoveOut = (id: string): boolean =>
    findChild(document, id)?.location.parent === "node";

  const travel = (direction: "undo" | "redo"): void => {
    const next = direction === "undo" ? store.undo() : store.redo();
    if (next.present === document) return;
    const reconciled = reconcileSelection(document, next.present, selectionId);
    setSelectionId(reconciled);
    laterFocus(
      reconciled === null
        ? "#discern-builder-composition-heading"
        : `[data-discern-builder-outline-id="${
          CSS.escape(reconciled)
        }"] .discern-builder-layers__select`,
    );
    announce(
      direction === "undo" ? "Undid the last change." : "Redid the change.",
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === "Escape" && pendingTarget !== null) {
        event.preventDefault();
        setPendingTarget(null);
        announce(
          "Cancelled the insertion target. Adding at the end of the composition.",
        );
        return;
      }
      if (shortcutBelongsToControl(event)) return;
      if (event.key === "Escape") {
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
  }, [document, pendingTarget, selectionId]);

  return {
    selection,
    insertionTarget,
    pendingInsertionTarget: effectivePending,
    layers,
    dragging,
    canMoveUp,
    canMoveDown,
    lastRefusal,
    wrapTargets,
    setDragging,
    selectForEditing,
    selectLayer,
    editTextFromCanvas,
    placeComponent,
    armBefore: (id) => armTarget(insertionTargetBefore(document, id)),
    armAfter: (id) => armTarget(insertionTargetAfter(document, id)),
    armRootEnd: () => armTarget(selection.insertionTarget),
    cancelInsertionTarget() {
      setPendingTarget(null);
      setLastRefusal(null);
      announce(
        "Cancelled the insertion target. Adding at the end of the composition.",
      );
    },
    deleteChild: deleteSelectedChild,
    wrapSelection,
    nudgeSelection,
    duplicateSelection,
    armComponentSlot,
    addText,
    drop,
    moveIntoPrevious,
    moveOut,
    canMoveIntoPrevious,
    canMoveOut,
    isCollapsed: (id) => collapsedIds.has(id),
    toggleCollapsed(id) {
      const owner = findChild(document, id)?.child;
      setCollapsedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
          if (
            selectionId !== null && selectionId !== id &&
            isWithinSubtree(document, id, selectionId)
          ) {
            setSelectionId(id);
            if (owner !== undefined) {
              announce(`Collapsed ${childLabel(owner)} and selected it.`);
            }
          }
        }
        return next;
      });
    },
    undo: () => travel("undo"),
    redo: () => travel("redo"),
    resetSelection() {
      setSelectionId(null);
      setPendingTarget(null);
      setLastRefusal(null);
      setActivePane("inspector");
      laterFocus("#discern-builder-composition-heading");
    },
  };
}
