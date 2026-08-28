import { useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import type { BuilderDocument } from "../model.ts";
import { isWithinSubtree } from "../model.ts";
import type { BuilderTreeController } from "./controller.ts";
import { readBuilderDragPayload, writeBuilderDragPayload } from "./drag.ts";
import {
  armedSlotInsertionTarget,
  childLabel,
  type InsertionTarget,
  insertionTargetAt,
  insertionTargetBefore,
  type LayerRow,
} from "./projection.ts";

function dropPayload(
  event: DragEvent,
  tree: BuilderTreeController,
  target: InsertionTarget,
): void {
  event.preventDefault();
  event.stopPropagation();
  const payload = readBuilderDragPayload(event.dataTransfer);
  tree.setDragging(false);
  if (payload !== undefined) tree.drop(payload, target);
}

function RowActions(
  { row, tree }: Readonly<{ row: LayerRow; tree: BuilderTreeController }>,
) {
  const id = row.child.id;
  return (
    <details className="discern-builder-layers__actions">
      <summary aria-label={`Actions for ${childLabel(row.child)}`}>•••</summary>
      <div role="group" aria-label={`Edit ${childLabel(row.child)}`}>
        <button type="button" onClick={() => tree.armBefore(id)}>
          ＋ Add before
        </button>
        <button type="button" onClick={() => tree.armAfter(id)}>
          ＋ Add after
        </button>
        {row.slotNames.map((slot) => (
          <button
            type="button"
            key={slot}
            onClick={() => tree.armComponentSlot(id, slot)}
          >
            ＋ Add inside {slot}
          </button>
        ))}
        <button
          type="button"
          disabled={row.index === 0}
          onClick={() => tree.nudgeSelection(id, -1)}
        >
          Move before
        </button>
        <button
          type="button"
          disabled={row.index === row.siblingCount - 1}
          onClick={() => tree.nudgeSelection(id, 1)}
        >
          Move after
        </button>
        <button
          type="button"
          disabled={!tree.canMoveIntoPrevious(id)}
          onClick={() => tree.moveIntoPrevious(id)}
        >
          Move into previous
        </button>
        <button
          type="button"
          disabled={!tree.canMoveOut(id)}
          onClick={() => tree.moveOut(id)}
        >
          Move out
        </button>
        <button type="button" onClick={() => tree.duplicateSelection(id)}>
          Duplicate
        </button>
        {tree.wrapTargets.map(({ slug, name }) => (
          <button
            type="button"
            key={slug}
            onClick={() => tree.wrapSelection(id, slug)}
          >
            Wrap in {name}
          </button>
        ))}
        <button
          type="button"
          className="discern-builder-danger"
          onClick={() => tree.deleteChild(id)}
        >
          Delete
        </button>
      </div>
    </details>
  );
}

function LayerEntry(
  { document, row, tree, onDragTarget }: Readonly<{
    document: BuilderDocument;
    row: LayerRow;
    tree: BuilderTreeController;
    onDragTarget: (label: string | null) => void;
  }>,
) {
  const id = row.child.id;
  const before = insertionTargetBefore(document, id) ??
    insertionTargetAt(document, row.location, row.index);
  const selected = id === tree.selection.id;
  const ancestor = tree.selection.id !== null && row.child.kind === "component"
    ? isWithinSubtree(document, id, tree.selection.id) && !selected
    : false;
  const collapsed = tree.isCollapsed(id);
  const startDrag = (event: DragEvent): void => {
    writeBuilderDragPayload(event.dataTransfer, { type: "child", id });
    tree.setDragging(true);
  };
  return (
    <li
      role="treeitem"
      aria-level={row.depth + 1}
      aria-selected={selected}
      aria-expanded={row.hasChildren ? !collapsed : undefined}
      data-discern-builder-outline-id={id}
      data-discern-builder-layer-ancestor={ancestor ? "true" : undefined}
      style={{
        "--discern-builder-depth": row.depth,
      } as CSSProperties}
    >
      <button
        type="button"
        className="discern-builder-layers__drop discern-builder-layers__drop--before"
        aria-label={`Insert before ${childLabel(row.child)}`}
        data-discern-builder-insertion-active={tree.insertionTarget
                .referenceId === id &&
            tree.insertionTarget.relation === "before"
          ? "true"
          : undefined}
        onClick={() => tree.armBefore(id)}
        onDragEnter={() => onDragTarget(before.label)}
        onDragLeave={() => onDragTarget(null)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => dropPayload(event, tree, before)}
      >
        <span>{before.label}</span>
      </button>
      <div className="discern-builder-layers__row-shell">
        {row.hasChildren
          ? (
            <button
              type="button"
              className="discern-builder-layers__collapse"
              aria-label={`${collapsed ? "Expand" : "Collapse"} ${
                childLabel(row.child)
              }`}
              onClick={() => tree.toggleCollapsed(id)}
            >
              <span aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
            </button>
          )
          : (
            <span className="discern-builder-layers__leaf" aria-hidden="true">
              ·
            </span>
          )}
        <button
          type="button"
          draggable
          aria-current={selected ? "true" : undefined}
          className={selected
            ? "discern-builder-outline__row discern-builder-outline__row--selected discern-builder-layers__select"
            : "discern-builder-outline__row discern-builder-layers__select"}
          onClick={() => tree.selectLayer(id)}
          onDragStart={startDrag}
          onKeyDown={(event) => {
            if (!event.altKey) return;
            const action = event.key === "ArrowUp"
              ? () => tree.nudgeSelection(id, -1)
              : event.key === "ArrowDown"
              ? () => tree.nudgeSelection(id, 1)
              : event.key === "ArrowRight"
              ? () => tree.moveIntoPrevious(id)
              : event.key === "ArrowLeft"
              ? () => tree.moveOut(id)
              : undefined;
            if (action === undefined) return;
            event.preventDefault();
            action();
          }}
        >
          <span
            className="discern-builder-layers__glyph"
            data-discern-builder-layer-kind={row.child.kind}
            aria-hidden="true"
          />
          {row.slotName !== undefined ? <small>{row.slotName}</small> : null}
          <span>{childLabel(row.child)}</span>
        </button>
        <RowActions row={row} tree={tree} />
      </div>
      {row.child.kind === "component" && !collapsed
        ? (
          <div className="discern-builder-layers__slots">
            {row.slotNames.map((slot) => {
              const target = armedSlotInsertionTarget(document, id, slot);
              if (target === undefined) return null;
              return (
                <button
                  type="button"
                  className="discern-builder-layers__slot-target"
                  key={slot}
                  data-discern-builder-insertion-active={tree.insertionTarget
                          .ownerId === id &&
                      tree.insertionTarget.prop === slot
                    ? "true"
                    : undefined}
                  onClick={() => tree.armComponentSlot(id, slot)}
                  onDragEnter={() => onDragTarget(target.label)}
                  onDragLeave={() => onDragTarget(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropPayload(event, tree, target)}
                >
                  <span aria-hidden="true">＋</span> {slot}
                </button>
              );
            })}
          </div>
        )
        : null}
    </li>
  );
}

/** Permanent, independently scrollable pointer-and-keyboard tree surface. */
export function BuilderLayers(
  { document, tree }: Readonly<{
    document: BuilderDocument;
    tree: BuilderTreeController;
  }>,
) {
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const visibleRows = tree.layers.filter((row) =>
    !row.ancestorIds.some((id) => tree.isCollapsed(id))
  );
  const rootEnd = insertionTargetAt(
    document,
    { parent: "root" },
    document.children.length,
  );
  return (
    <section
      className="discern-builder-outline"
      aria-labelledby="discern-builder-layers-heading"
      onDragOver={(event) => {
        event.preventDefault();
        const bounds = event.currentTarget.getBoundingClientRect();
        const edge = 36;
        if (event.clientY < bounds.top + edge) {
          event.currentTarget.scrollBy({ top: -24 });
        } else if (event.clientY > bounds.bottom - edge) {
          event.currentTarget.scrollBy({ top: 24 });
        }
      }}
    >
      <header className="discern-builder-layers__header">
        <div>
          <h3 id="discern-builder-layers-heading">Layers</h3>
          <p>Alt + arrows move the focused layer.</p>
        </div>
        {tree.pendingInsertionTarget === null
          ? null
          : (
            <div className="discern-builder-layers__cursor" role="status">
              <span>
                Adding to <strong>{tree.insertionTarget.label}</strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  globalThis.document.getElementById(
                    "discern-builder-layers-end",
                  )?.focus()}
              >
                Change
              </button>
              <button type="button" onClick={tree.cancelInsertionTarget}>
                Cancel
              </button>
            </div>
          )}
      </header>
      {tree.lastRefusal === null
        ? null
        : (
          <div className="discern-builder-layers__refusal" role="alert">
            <strong>{tree.lastRefusal.humanPath}</strong>{" "}
            {tree.lastRefusal.reason}.
            {tree.lastRefusal.suggestions.length === 0 ? null : (
              <p>
                Try {tree.lastRefusal.suggestions.join(", ")}.
              </p>
            )}
            <details>
              <summary>Technical detail</summary>
              <code>{tree.lastRefusal.technicalDetail}</code>
            </details>
          </div>
        )}
      {dragTarget === null
        ? null
        : (
          <p className="discern-builder-layers__drag-status">
            Move to {dragTarget}
          </p>
        )}
      <div className="discern-builder-layers__scroll">
        {visibleRows.length === 0
          ? <p>Nothing placed yet.</p>
          : (
            <ul role="tree" aria-label="Composition layers">
              {visibleRows.map((row) => (
                <LayerEntry
                  document={document}
                  row={row}
                  tree={tree}
                  onDragTarget={setDragTarget}
                  key={row.child.id}
                />
              ))}
            </ul>
          )}
        <button
          type="button"
          id="discern-builder-layers-end"
          className="discern-builder-outline__end"
          data-discern-builder-insertion-active={tree.insertionTarget.kind ===
                "root" &&
              tree.insertionTarget.relation === "end"
            ? "true"
            : undefined}
          onClick={tree.armRootEnd}
          onDragEnter={() => setDragTarget(rootEnd.label)}
          onDragLeave={() => setDragTarget(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => dropPayload(event, tree, rootEnd)}
        >
          <span aria-hidden="true">＋</span> End of composition
        </button>
      </div>
    </section>
  );
}
