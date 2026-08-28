import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, DragEvent, ReactNode } from "react";
import type { BuilderNode, BuilderSlotChild } from "../model.ts";
import { rootInsertionFromPointer } from "../placement.ts";
import type { RenderOptions } from "../render.tsx";
import { renderBuilderChild } from "../render.tsx";
import type { BuilderTreeController } from "../tree/controller.ts";
import {
  readBuilderDragPayload,
  writeBuilderDragPayload,
} from "../tree/drag.ts";
import { childLabel } from "../tree/projection.ts";
import { BuilderBoundary } from "../workspace/error-boundary.tsx";
import type { BuilderPreviewSnapshotMessage } from "./protocol.ts";

const CANVAS_FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]",
  "[tabindex]",
].join(",");

type DropHint =
  | { readonly kind: "node"; readonly id: string }
  | { readonly kind: "root"; readonly index: number; readonly offset: number };

function CanvasInstance(
  { child, options }: Readonly<{
    child: BuilderSlotChild;
    options: RenderOptions;
  }>,
) {
  return <>{renderBuilderChild(child, options)}</>;
}

function CanvasBoundary(
  { label, children }: Readonly<{ label: string; children: ReactNode }>,
) {
  return (
    <BuilderBoundary
      fallback={(message) => (
        <div className="discern-builder-node-error" role="note">
          <strong>{label} needs attention</strong>
          <span>{message}</span>
        </div>
      )}
    >
      {children}
    </BuilderBoundary>
  );
}

/** Current inert canvas host consuming the live preview-protocol snapshot. */
export function BuilderPreviewCanvas(
  { snapshot, tree }: Readonly<{
    snapshot: BuilderPreviewSnapshotMessage;
    tree: BuilderTreeController;
  }>,
) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const document = snapshot.document;

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (page === null) return;
    const suppressCanvasControls = (): void => {
      for (const element of page.querySelectorAll(CANVAS_FOCUSABLE_SELECTOR)) {
        if (element.getAttribute("tabindex") !== "-1") {
          element.setAttribute("tabindex", "-1");
        }
        if (
          element.hasAttribute("contenteditable") &&
          element.getAttribute("contenteditable") !== "false"
        ) {
          element.setAttribute("contenteditable", "false");
        }
      }
    };
    suppressCanvasControls();
    const observer = new MutationObserver(suppressCanvasControls);
    observer.observe(page, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["contenteditable", "controls", "href", "tabindex"],
    });
    return () => observer.disconnect();
  }, [document]);

  useEffect(() => {
    if (!tree.dragging) setDropHint(null);
  }, [tree.dragging]);

  const decorate = (
    node: BuilderNode,
    props: Record<string, unknown>,
  ): Record<string, unknown> => ({
    ...props,
    "data-discern-builder-node": node.id,
    ...(node.id === snapshot.selectionId
      ? { "data-discern-builder-selected": "" }
      : {}),
    ...(dropHint?.kind === "node" && node.id === dropHint.id
      ? { "data-discern-builder-drop": "" }
      : {}),
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.stopPropagation();
      writeBuilderDragPayload(event.dataTransfer, {
        type: "child",
        id: node.id,
      });
      tree.setDragging(true);
    },
  });

  const nodeIdAt = (target: EventTarget | null): string | null => {
    if (!(target instanceof Element)) return null;
    return target.closest("[data-discern-builder-node]")?.getAttribute(
      "data-discern-builder-node",
    ) ?? null;
  };

  const rootInsertionAt = (pointerY: number) => {
    const page = pageRef.current;
    if (page === null) return { index: document.children.length, offset: 0 };
    const rects = [...page.querySelectorAll<HTMLElement>(
      ":scope > [data-discern-builder-root-child]",
    )].map((element) => {
      const range = globalThis.document.createRange();
      range.selectNodeContents(element);
      const rangeRect = range.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const rect = rangeRect.height > 0 ? rangeRect : elementRect;
      return { top: rect.top, bottom: rect.bottom };
    });
    return rootInsertionFromPointer(
      pointerY,
      rects,
      page.getBoundingClientRect().top,
    );
  };

  const pageStyle: CSSProperties = snapshot.viewport.cssWidth === undefined
    ? {}
    : { maxWidth: snapshot.viewport.cssWidth };

  return (
    <main
      className={`discern-builder-canvas${
        tree.dragging ? " discern-builder-canvas--dragging" : ""
      }`}
      id="discern-builder-pane-canvas"
      role="tabpanel"
      tabIndex={0}
      aria-labelledby="discern-builder-tab-canvas"
      aria-description="Rendered components are an inspection surface. Use the outline and inspector to select and edit them."
      data-discern-builder-preview-version={snapshot.version}
      onClickCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
        tree.selectForEditing(nodeIdAt(event.target));
      }}
      onFocusCapture={(event) => {
        if (
          event.target !== event.currentTarget &&
          event.target instanceof HTMLElement
        ) event.target.blur();
      }}
      onDragOverCapture={(event) => {
        event.preventDefault();
        const nodeId = nodeIdAt(event.target);
        setDropHint(
          nodeId === null
            ? { kind: "root", ...rootInsertionAt(event.clientY) }
            : { kind: "node", id: nodeId },
        );
      }}
      onDragLeave={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        ) return;
        setDropHint(null);
      }}
      onDropCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const payload = readBuilderDragPayload(event.dataTransfer);
        setDropHint(null);
        tree.setDragging(false);
        if (payload === undefined) return;
        const nodeId = nodeIdAt(event.target);
        if (nodeId === null) {
          const root = rootInsertionAt(event.clientY);
          tree.drop(payload, {
            kind: "explicit",
            location: { parent: "root" },
            index: root.index,
            label: `Root boundary ${String(root.index)}`,
          });
        } else {
          tree.dropOnNode(payload, nodeId);
        }
      }}
    >
      <div
        ref={pageRef}
        className="discern-builder-canvas__page"
        style={pageStyle}
        aria-hidden="true"
      >
        {dropHint?.kind === "root" && tree.dragging
          ? (
            <div
              className="discern-builder-root-insertion"
              data-discern-builder-root-insertion={dropHint.index}
              style={{ top: dropHint.offset }}
            />
          )
          : null}
        {document.children.length === 0
          ? (
            <div className="discern-builder-empty">
              <h2>Blank canvas</h2>
              <p>
                Drag components in from the palette, or click one to place it.
                Select anything on the canvas to edit its props.
              </p>
            </div>
          )
          : document.children.map((child, index) => (
            <div
              className="discern-builder-root-child"
              data-discern-builder-root-child={child.id}
              data-discern-builder-root-index={index}
              key={child.id}
            >
              <CanvasBoundary label={childLabel(child)}>
                <CanvasInstance child={child} options={{ decorate }} />
              </CanvasBoundary>
            </div>
          ))}
      </div>
    </main>
  );
}
