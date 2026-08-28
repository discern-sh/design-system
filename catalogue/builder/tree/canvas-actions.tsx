import type { CSSProperties } from "react";
import type { DragEvent, MouseEvent } from "react";
import { findChild } from "../model.ts";
import type { BuilderDocument } from "../model.ts";
import type { BuilderTreeController } from "./controller.ts";
import { readBuilderDragPayload } from "./drag.ts";
import { armedSlotInsertionTarget, childLabel } from "./projection.ts";

export interface BuilderCanvasActionRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function closeActionMenu(event: MouseEvent<HTMLButtonElement>): void {
  event.currentTarget.closest("details")?.removeAttribute("open");
}

/** Bounded tree actions anchored to the selected preview rectangle. */
export function BuilderCanvasActions(
  { document, id, rect, tree }: Readonly<{
    document: BuilderDocument;
    id: string;
    rect: BuilderCanvasActionRect;
    tree: BuilderTreeController;
  }>,
) {
  const found = findChild(document, id);
  const row = tree.layers.find((candidate) => candidate.child.id === id);
  if (found === undefined || row === undefined) return null;
  const label = childLabel(found.child);
  const directSlots = row.slotNames.length > 0 && rect.width >= 160 &&
    rect.height >= 72;
  return (
    <div
      className="discern-builder-canvas-actions"
      role="toolbar"
      aria-label={`Canvas actions for ${label}`}
      style={{
        "--discern-builder-canvas-action-x": `${String(rect.x)}px`,
        "--discern-builder-canvas-action-y": `${String(rect.y)}px`,
        "--discern-builder-canvas-action-width": `${String(rect.width)}px`,
        "--discern-builder-canvas-action-height": `${String(rect.height)}px`,
      } as CSSProperties}
    >
      <div className="discern-builder-canvas-actions__toolbar">
        <button
          type="button"
          aria-label={`Add before ${label}`}
          title="Add before"
          onClick={() => tree.armBefore(id)}
        >
          ＋↑
        </button>
        <button
          type="button"
          aria-label={`Add after ${label}`}
          title="Add after"
          onClick={() => tree.armAfter(id)}
        >
          ＋↓
        </button>
        {row.slotNames.length === 0 ? null : (
          <details>
            <summary aria-label={`Add inside ${label}`} title="Add inside">
              ＋↳
            </summary>
            <div>
              {row.slotNames.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  onClick={(event) => {
                    closeActionMenu(event);
                    tree.armComponentSlot(id, slot);
                  }}
                >
                  Add inside {slot}
                </button>
              ))}
            </div>
          </details>
        )}
        <details>
          <summary aria-label={`Move ${label}`} title="Move">↕</summary>
          <div>
            <button
              type="button"
              disabled={row.index === 0}
              onClick={(event) => {
                closeActionMenu(event);
                tree.nudgeSelection(id, -1);
              }}
            >
              Move before
            </button>
            <button
              type="button"
              disabled={row.index === row.siblingCount - 1}
              onClick={(event) => {
                closeActionMenu(event);
                tree.nudgeSelection(id, 1);
              }}
            >
              Move after
            </button>
            <button
              type="button"
              disabled={!tree.canMoveIntoPrevious(id)}
              onClick={(event) => {
                closeActionMenu(event);
                tree.moveIntoPrevious(id);
              }}
            >
              Move into previous
            </button>
            <button
              type="button"
              disabled={!tree.canMoveOut(id)}
              onClick={(event) => {
                closeActionMenu(event);
                tree.moveOut(id);
              }}
            >
              Move out
            </button>
          </div>
        </details>
        <button
          type="button"
          aria-label={`Duplicate ${label}`}
          title="Duplicate"
          onClick={() => tree.duplicateSelection(id)}
        >
          ⧉
        </button>
        <details>
          <summary aria-label={`Wrap ${label}`} title="Wrap">▣</summary>
          <div>
            {tree.wrapTargets.map(({ slug, name }) => (
              <button
                type="button"
                key={slug}
                onClick={(event) => {
                  closeActionMenu(event);
                  tree.wrapSelection(id, slug);
                }}
              >
                Wrap in {name}
              </button>
            ))}
          </div>
        </details>
        <button
          type="button"
          className="discern-builder-danger"
          aria-label={`Delete ${label}`}
          title="Delete"
          onClick={() => tree.deleteChild(id)}
        >
          ×
        </button>
      </div>
      {!directSlots ? null : (
        <div
          className="discern-builder-canvas-actions__slots"
          role="group"
          aria-label={`Slots in ${label}`}
        >
          {row.slotNames.map((slot) => (
            <button
              type="button"
              key={slot}
              onClick={() => tree.armComponentSlot(id, slot)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event: DragEvent) => {
                event.preventDefault();
                event.stopPropagation();
                const payload = readBuilderDragPayload(event.dataTransfer);
                const target = armedSlotInsertionTarget(document, id, slot);
                tree.setDragging(false);
                if (payload !== undefined && target !== undefined) {
                  tree.drop(payload, target);
                }
              }}
            >
              ＋ {slot}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
