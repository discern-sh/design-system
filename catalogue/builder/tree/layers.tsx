import type { CSSProperties, DragEvent } from "react";
import type { BuilderDocument } from "../model.ts";
import type { BuilderTreeController } from "./controller.ts";
import { readBuilderDragPayload, writeBuilderDragPayload } from "./drag.ts";
import { childLabel } from "./projection.ts";

/** Existing Outline UI, now owned by the tree/Layers feature boundary. */
export function BuilderLayers(
  { document, tree }: Readonly<{
    document: BuilderDocument;
    tree: BuilderTreeController;
  }>,
) {
  const startDrag = (id: string, event: DragEvent): void => {
    writeBuilderDragPayload(event.dataTransfer, { type: "child", id });
    tree.setDragging(true);
  };
  return (
    <section className="discern-builder-outline">
      <h3>Outline</h3>
      {tree.layers.length === 0 ? <p>Nothing placed yet.</p> : (
        <ul>
          {tree.layers.map((row) => (
            <li
              key={row.child.id}
              data-discern-builder-outline-id={row.child.id}
              style={{
                "--discern-builder-depth": row.depth,
              } as CSSProperties}
            >
              <button
                type="button"
                draggable
                aria-current={row.child.id === tree.selection.id
                  ? "true"
                  : undefined}
                className={row.child.id === tree.selection.id
                  ? "discern-builder-outline__row discern-builder-outline__row--selected"
                  : "discern-builder-outline__row"}
                onClick={() => tree.selectLayer(row.child.id)}
                onDragStart={(event) => startDrag(row.child.id, event)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const payload = readBuilderDragPayload(event.dataTransfer);
                  tree.setDragging(false);
                  if (payload === undefined) return;
                  tree.drop(payload, {
                    kind: "explicit",
                    location: row.location,
                    index: row.index,
                    label: `Before ${childLabel(row.child)}`,
                  });
                }}
              >
                {row.slotName !== undefined
                  ? <small>{row.slotName}</small>
                  : null}
                <span>{childLabel(row.child)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className="discern-builder-outline__end"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const payload = readBuilderDragPayload(event.dataTransfer);
          tree.setDragging(false);
          if (payload === undefined) return;
          tree.drop(payload, {
            kind: "explicit",
            location: { parent: "root" },
            index: document.children.length,
            label: "End of composition",
          });
        }}
      >
        Drop here for end of page
      </div>
    </section>
  );
}
