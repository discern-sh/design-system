import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { BuilderDocument } from "../model.ts";
import { rootInsertionFromPointer } from "../placement.ts";
import { documentPolicy } from "../registry-core.ts";
import type { BuilderTreeController } from "../tree/controller.ts";
import {
  readBuilderDragPayload,
  writeBuilderDragPayload,
} from "../tree/drag.ts";
import type { BuilderPreviewPreferences } from "./controls.tsx";
import {
  displayRectFromLogical,
  logicalPointFromDisplay,
  previewDecorationFlags,
  previewNodeAtPoint,
} from "./geometry.ts";
import type { BuilderPreviewPoint, BuilderPreviewRect } from "./geometry.ts";
import {
  builderPreviewMessageFromEvent,
  builderPreviewSelectionIntent,
  builderPreviewSnapshot,
} from "./protocol.ts";
import type {
  BuilderPreviewEventWitnessMessage,
  BuilderPreviewLayoutMessage,
} from "./protocol.ts";

const PREVIEW_LOGICAL_HEIGHT = 720;
const PREVIEW_FRAME_URL = "/catalogue/builder/preview.html";

type DropHint =
  | { readonly kind: "node"; readonly id: string }
  | { readonly kind: "root"; readonly index: number; readonly offset: number };

function manualZoom(id: BuilderPreviewPreferences["zoomId"]): number {
  return id === "50" ? 0.5 : id === "75" ? 0.75 : 1;
}

function rootInsertionAt(
  point: BuilderPreviewPoint,
  roots: readonly BuilderPreviewRect[],
  childCount: number,
) {
  if (roots.length === 0) return { index: childCount, offset: 0 };
  return rootInsertionFromPointer(
    point.y,
    roots.map(({ y, height }) => ({ top: y, bottom: y + height })),
    0,
  );
}

/** Real iframe host with editor-owned scale, overlays, and safe interaction. */
export function BuilderPreviewCanvas(
  { document, selectionId, preferences, tree }: Readonly<{
    document: BuilderDocument;
    selectionId: string | null;
    preferences: BuilderPreviewPreferences;
    tree: BuilderTreeController;
  }>,
) {
  const canvasRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameWindow, setFrameWindow] = useState<Window>();
  const [availableWidth, setAvailableWidth] = useState(1);
  const [layout, setLayout] = useState<BuilderPreviewLayoutMessage>();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const [events, setEvents] = useState<
    readonly BuilderPreviewEventWitnessMessage[]
  >(
    [],
  );
  const logicalWidth = preferences.viewport.width ?? Math.max(
    1,
    Math.floor(availableWidth),
  );
  const zoom = preferences.zoomId === "fit"
    ? Math.min(1, availableWidth / logicalWidth)
    : manualZoom(preferences.zoomId);
  const origin = globalThis.location.origin;
  const documentKey = useMemo(() => JSON.stringify(document), [document]);
  const snapshot = useMemo(
    () =>
      builderPreviewSnapshot({
        document,
        documentKey,
        viewport: {
          id: preferences.viewport.id,
          label: preferences.viewport.label,
          logicalWidth,
        },
        zoom: { id: preferences.zoomId, scale: zoom },
        appearance: preferences.previewAppearance,
        mode: preferences.mode,
        selectionId,
        interactionRevision: preferences.interactionRevision,
      }),
    [
      document,
      documentKey,
      logicalWidth,
      preferences.viewport,
      preferences.zoomId,
      preferences.previewAppearance.theme,
      preferences.previewAppearance.resolvedTheme,
      preferences.previewAppearance.accentHue,
      preferences.mode,
      preferences.interactionRevision,
      selectionId,
      zoom,
    ],
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    const measure = (): void =>
      setAvailableWidth(Math.max(1, viewport.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => setLayout(undefined), [logicalWidth]);

  useEffect(() => {
    if (frameWindow === undefined) return;
    const send = globalThis.requestAnimationFrame(() =>
      frameWindow.postMessage(snapshot, origin)
    );
    return () => globalThis.cancelAnimationFrame(send);
  }, [frameWindow, origin, snapshot]);

  useEffect(() => {
    if (frameWindow === undefined) return;
    const receive = (event: MessageEvent<unknown>): void => {
      const message = builderPreviewMessageFromEvent(
        event,
        origin,
        documentPolicy,
        frameWindow,
      );
      if (message?.type === "layout") setLayout(message);
      if (message?.type === "frame-ready") {
        frameWindow.postMessage(snapshot, origin);
      }
      if (message?.type === "event-witness") {
        setEvents((current) => [message, ...current].slice(0, 8));
      }
    };
    globalThis.addEventListener("message", receive);
    return () => globalThis.removeEventListener("message", receive);
  }, [frameWindow, origin, snapshot]);

  useEffect(() => {
    preferences.reportMeasurement({
      logicalWidth: layout?.innerWidth ?? logicalWidth,
      zoomPercent: Math.round(zoom * 100),
      devicePixelRatio: layout?.devicePixelRatio ?? globalThis.devicePixelRatio,
    });
  }, [layout, logicalWidth, preferences.reportMeasurement, zoom]);

  useEffect(() => {
    if (preferences.mode === "interact") {
      setHoverId(null);
      setDropHint(null);
    }
  }, [preferences.mode]);

  useEffect(() => {
    canvasRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [preferences.resetViewRevision]);

  useEffect(() => setEvents([]), [preferences.interactionRevision]);
  useEffect(() => setEvents([]), [documentKey]);
  useEffect(() => {
    if (!tree.dragging) setDropHint(null);
  }, [tree.dragging]);

  const pointFromPointer = (
    event: Readonly<{ clientX: number; clientY: number }>,
  ): BuilderPreviewPoint | undefined => {
    const frame = frameRef.current;
    if (frame === null) return undefined;
    return logicalPointFromDisplay(event, frame.getBoundingClientRect(), zoom);
  };
  const nodeAt = (point: BuilderPreviewPoint): string | null =>
    previewNodeAtPoint(layout?.nodes ?? [], point);

  const selectFromPointer = (
    event: Readonly<{ clientX: number; clientY: number }>,
  ): void => {
    const point = pointFromPointer(event);
    if (point === undefined) return;
    const intent = builderPreviewSelectionIntent({
      nodeId: nodeAt(point),
      x: point.x,
      y: point.y,
    });
    if (intent.nodeId !== null) tree.selectLayer(intent.nodeId);
  };

  const stageStyle = {
    "--discern-builder-preview-zoom": zoom,
    width: logicalWidth * zoom,
    height: PREVIEW_LOGICAL_HEIGHT * zoom,
  } as CSSProperties;
  const frameStyle = {
    width: logicalWidth,
    height: PREVIEW_LOGICAL_HEIGHT,
  } as CSSProperties;
  const decorated = (layout?.nodes ?? []).flatMap((node) => {
    const { selected, hovered, dropped } = previewDecorationFlags(
      node.id,
      selectionId,
      hoverId,
      dropHint?.kind === "node" ? dropHint.id : null,
    );
    if (!selected && !hovered && !dropped) return [];
    const rect = displayRectFromLogical(node.rect, zoom);
    return [{ node, rect, selected, hovered, dropped }];
  });

  return (
    <main
      ref={canvasRef}
      className={`discern-builder-canvas discern-builder-canvas--${preferences.mode}${
        tree.dragging ? " discern-builder-canvas--dragging" : ""
      }`}
      id="discern-builder-pane-canvas"
      role="tabpanel"
      tabIndex={0}
      aria-labelledby="discern-builder-tab-canvas"
      aria-description={preferences.mode === "edit"
        ? "Edit mode. Rendered controls are inert; click the composition to select it."
        : "Interact mode. Rendered controls run locally; navigation, submission, popups, and downloads are blocked."}
      data-discern-builder-preview-version={snapshot.version}
    >
      <div ref={viewportRef} className="discern-builder-canvas__viewport">
        <div className="discern-builder-canvas__page" style={stageStyle}>
          <iframe
            ref={frameRef}
            className="discern-builder-preview-frame"
            data-discern-builder-preview-frame=""
            title={`Composition preview — ${preferences.mode} mode`}
            sandbox="allow-same-origin allow-scripts"
            src={PREVIEW_FRAME_URL}
            tabIndex={preferences.mode === "edit" ? -1 : 0}
            style={frameStyle}
            onLoad={(event) =>
              setFrameWindow(event.currentTarget.contentWindow ?? undefined)}
          />
          {preferences.mode === "edit"
            ? (
              <div
                className="discern-builder-edit-layer"
                aria-hidden="true"
                draggable={hoverId !== null}
                onPointerMove={(event) => {
                  const point = pointFromPointer(event);
                  setHoverId(point === undefined ? null : nodeAt(point));
                }}
                onPointerLeave={() => setHoverId(null)}
                onClick={(event) => {
                  event.preventDefault();
                  selectFromPointer(event);
                  if (globalThis.document.activeElement === canvasRef.current) {
                    canvasRef.current?.blur();
                  }
                }}
                onDragStart={(event) => {
                  if (hoverId === null) {
                    event.preventDefault();
                    return;
                  }
                  writeBuilderDragPayload(event.dataTransfer, {
                    type: "child",
                    id: hoverId,
                  });
                  tree.setDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  const point = pointFromPointer(event);
                  if (point === undefined) return;
                  const nodeId = nodeAt(point);
                  setDropHint(
                    nodeId === null
                      ? {
                        kind: "root",
                        ...rootInsertionAt(
                          point,
                          layout?.roots ?? [],
                          document.children.length,
                        ),
                      }
                      : { kind: "node", id: nodeId },
                  );
                }}
                onDragLeave={() => setDropHint(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const payload = readBuilderDragPayload(event.dataTransfer);
                  const point = pointFromPointer(event);
                  setDropHint(null);
                  tree.setDragging(false);
                  if (payload === undefined || point === undefined) return;
                  const nodeId = nodeAt(point);
                  if (nodeId !== null) {
                    tree.dropOnNode(payload, nodeId);
                    return;
                  }
                  const root = rootInsertionAt(
                    point,
                    layout?.roots ?? [],
                    document.children.length,
                  );
                  tree.drop(payload, {
                    kind: "explicit",
                    location: { parent: "root" },
                    index: root.index,
                    label: `Root boundary ${String(root.index)}`,
                  });
                }}
              >
                {decorated.map(({ node, rect, selected, hovered, dropped }) => (
                  <span
                    key={node.id}
                    className={`discern-builder-edit-outline${
                      selected ? " discern-builder-edit-outline--selected" : ""
                    }${
                      hovered ? " discern-builder-edit-outline--hovered" : ""
                    }${dropped ? " discern-builder-edit-outline--drop" : ""}`}
                    style={{
                      left: rect.x,
                      top: rect.y,
                      width: rect.width,
                      height: rect.height,
                    }}
                  />
                ))}
                {dropHint?.kind === "root" && tree.dragging
                  ? (
                    <span
                      className="discern-builder-root-insertion"
                      data-discern-builder-root-insertion={dropHint.index}
                      style={{ top: dropHint.offset * zoom }}
                    />
                  )
                  : null}
              </div>
            )
            : null}
        </div>
      </div>
      <div className="discern-builder-preview-status" aria-live="polite">
        <span>
          Logical {layout?.innerWidth ?? logicalWidth}px ×{" "}
          {PREVIEW_LOGICAL_HEIGHT}px · DPR{" "}
          {layout?.devicePixelRatio ?? globalThis.devicePixelRatio}
        </span>
        {events.length === 0
          ? (
            <span>
              {preferences.mode === "interact"
                ? "No interaction events yet."
                : "Component controls are inert."}
            </span>
          )
          : (
            <ol
              className="discern-builder-event-log"
              aria-label="Preview event log"
            >
              {events.map((event, index) => (
                <li key={`${event.kind}:${event.summary}:${String(index)}`}>
                  {event.summary}
                </li>
              ))}
            </ol>
          )}
        {preferences.mode === "interact"
          ? (
            <button
              type="button"
              onClick={preferences.resetInteractions}
            >
              Reset interactions
            </button>
          )
          : null}
      </div>
    </main>
  );
}
