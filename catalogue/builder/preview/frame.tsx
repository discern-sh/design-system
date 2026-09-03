import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { catalogueAppearanceRootStyle } from "../../shell/axes-state.ts";
import type { BuilderSlotChild } from "../model.ts";
import type { RenderOptions } from "../render.tsx";
import { renderBuilderChild } from "../render.tsx";
import { documentPolicy, entryBySlug } from "../registry-core.ts";
import { childLabel } from "../tree/projection.ts";
import { BuilderBoundary } from "../workspace/error-boundary.tsx";
import type { BuilderPreviewRect } from "./geometry.ts";
import {
  builderPreviewEventWitness,
  builderPreviewLayout,
  builderPreviewMessageFromEvent,
  builderPreviewReady,
  formatBuilderPreviewCallbackWitness,
} from "./protocol.ts";
import type {
  BuilderPreviewEventWitnessMessage,
  BuilderPreviewLayoutMessage,
  BuilderPreviewNodeRect,
  BuilderPreviewSnapshotMessage,
} from "./protocol.ts";

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

function callbackControlledProp(prop: string): string | undefined {
  const match = /^on([A-Z][A-Za-z0-9]*)Change$/.exec(prop);
  if (match?.[1] === undefined) return undefined;
  return match[1][0]?.toLowerCase() + match[1].slice(1);
}

function safeTransientValue(value: unknown): boolean {
  return value === null || typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
}

const NON_SUBMITTING_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "radio",
  "range",
  "reset",
]);

function elementNodeId(
  target: Element,
  elements: ReadonlyMap<string, Element>,
): string | null {
  let match: { readonly id: string; readonly area: number } | undefined;
  for (const [id, element] of elements) {
    if (element !== target && !element.contains(target)) continue;
    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (match === undefined || area <= match.area) match = { id, area };
  }
  return match?.id ?? null;
}

function frameRect(rect: DOMRect): BuilderPreviewRect {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function FrameDocument(
  { snapshot, post }: Readonly<{
    snapshot: BuilderPreviewSnapshotMessage;
    post: (
      message: BuilderPreviewLayoutMessage | BuilderPreviewEventWitnessMessage,
    ) => void;
  }>,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, Element>());
  const mode = useRef(snapshot.mode);
  mode.current = snapshot.mode;
  const [transientProps, setTransientProps] = useState<
    Readonly<Record<string, Readonly<Record<string, unknown>>>>
  >({});

  useEffect(() => setTransientProps({}), [
    snapshot.documentKey,
    snapshot.interactionRevision,
  ]);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (root === null) return;
    const nodes: BuilderPreviewNodeRect[] = [];
    for (const [id, element] of elements.current) {
      if (!element.isConnected) continue;
      nodes.push({ id, rect: frameRect(element.getBoundingClientRect()) });
    }
    const roots = [...root.querySelectorAll<HTMLElement>(
      ":scope > [data-discern-builder-frame-root-child]",
    )].map((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rangeRect = range.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      return frameRect(rangeRect.height > 0 ? rangeRect : elementRect);
    });
    post(builderPreviewLayout({
      innerWidth,
      innerHeight,
      devicePixelRatio,
      nodes,
      roots,
    }));
  }, [post]);

  const scheduleMeasure = useCallback(() => {
    requestAnimationFrame(measure);
  }, [measure]);

  useLayoutEffect(scheduleMeasure, [snapshot, transientProps, scheduleMeasure]);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    const resize = new ResizeObserver(scheduleMeasure);
    const mutation = new MutationObserver(scheduleMeasure);
    resize.observe(root);
    mutation.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    addEventListener("scroll", scheduleMeasure, { passive: true });
    addEventListener("resize", scheduleMeasure);
    document.fonts.ready.then(scheduleMeasure);
    return () => {
      resize.disconnect();
      mutation.disconnect();
      removeEventListener("scroll", scheduleMeasure);
      removeEventListener("resize", scheduleMeasure);
    };
  }, [scheduleMeasure]);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    if (snapshot.mode === "edit") root.setAttribute("inert", "");
    else root.removeAttribute("inert");
  }, [snapshot.mode]);

  useEffect(() => {
    const blockSubmission = (
      event: MouseEvent | KeyboardEvent | SubmitEvent,
      target: EventTarget | null,
    ): void => {
      event.preventDefault();
      event.stopPropagation();
      post(builderPreviewEventWitness({
        kind: "submission-blocked",
        nodeId: target instanceof Element
          ? elementNodeId(target, elements.current)
          : null,
        prop: null,
        summary: "Blocked form submission",
      }));
    };
    const onClick = (event: MouseEvent): void => {
      if (mode.current !== "interact") return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const form = target.closest("form");
      const submitControl = target.closest("button, input");
      const submitType = submitControl?.getAttribute("type")?.toLowerCase() ??
        (submitControl?.tagName === "BUTTON" ? "submit" : "");
      if (
        form !== null && submitControl !== null &&
        (submitType === "submit" || submitType === "image")
      ) {
        blockSubmission(event, submitControl);
        return;
      }
      const link = target.closest("a[href]");
      if (link === null) return;
      event.preventDefault();
      event.stopPropagation();
      const download = link.hasAttribute("download");
      const popup = link.getAttribute("target")?.toLowerCase() === "_blank";
      const href = link.getAttribute("href") ?? "";
      post(builderPreviewEventWitness({
        kind: download
          ? "download-blocked"
          : popup
          ? "popup-blocked"
          : "navigation-blocked",
        nodeId: elementNodeId(target, elements.current),
        prop: null,
        summary: download
          ? `Blocked download ${JSON.stringify(href)}`
          : popup
          ? `Blocked popup ${JSON.stringify(href)}`
          : `Blocked link ${JSON.stringify(href)}`,
      }));
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        mode.current !== "interact" || event.key !== "Enter" ||
        event.defaultPrevented
      ) return;
      const target = event.target;
      if (
        !(target instanceof Element) ||
        target.matches("textarea, [contenteditable]") ||
        target.closest("form") === null
      ) return;
      const control = target.closest("button, input");
      if (control === null) return;
      const type = control.getAttribute("type")?.toLowerCase() ??
        (control.tagName === "BUTTON" ? "submit" : "text");
      const submits = control.tagName === "BUTTON"
        ? type === "submit"
        : !NON_SUBMITTING_INPUT_TYPES.has(type);
      if (!submits) return;
      blockSubmission(event, target);
    };
    const onSubmit = (event: SubmitEvent): void => {
      if (mode.current !== "interact") return;
      blockSubmission(event, event.target);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [post]);

  const register = (id: string) => (value: unknown): void => {
    if (value instanceof Element) elements.current.set(id, value);
    else elements.current.delete(id);
    scheduleMeasure();
  };

  const options: RenderOptions = {
    callback: (node, prop) => (...args) => {
      if (snapshot.mode !== "interact") return;
      post(builderPreviewEventWitness({
        kind: "callback",
        nodeId: node.id,
        prop,
        summary: formatBuilderPreviewCallbackWitness(prop, args),
      }));
      const controlled = callbackControlledProp(prop);
      const value = args[0];
      const documentation = entryBySlug.get(node.slug)?.propDocumentation;
      const propExists = controlled !== undefined &&
        documentation?.status === "available" &&
        documentation.props.some(({ name }) => name === controlled);
      if (!propExists || !safeTransientValue(value)) return;
      setTransientProps((current) => ({
        ...current,
        [node.id]: { ...current[node.id], [controlled]: value },
      }));
    },
    decorate: (node, props) => ({
      ...props,
      ...transientProps[node.id],
      ref: register(node.id),
    }),
  };

  return (
    <div
      ref={rootRef}
      className="discern-builder-frame-document"
      data-discern-root
      data-discern-theme={snapshot.appearance.resolvedTheme}
      data-discern-accent={snapshot.appearance.accent === undefined
        ? undefined
        : ""}
      data-discern-theme-preference={snapshot.appearance.theme}
      data-discern-builder-preview-mode={snapshot.mode}
      aria-hidden={snapshot.mode === "edit" ? "true" : undefined}
      style={catalogueAppearanceRootStyle(
        snapshot.appearance.field,
        snapshot.appearance.resolvedTheme,
        snapshot.appearance.accent,
      ) as CSSProperties}
    >
      {snapshot.document.children.length === 0
        ? (
          <div className="discern-builder-empty">
            <h2>Blank canvas</h2>
            <p>
              Drag components in from the palette, or click one to place it.
              Select anything on the canvas to edit its props.
            </p>
          </div>
        )
        : snapshot.document.children.map((child, index) => (
          <div
            className="discern-builder-frame-root-child"
            data-discern-builder-frame-root-child={child.id}
            data-discern-builder-frame-root-index={index}
            key={child.id}
          >
            <CanvasBoundary label={childLabel(child)}>
              <CanvasInstance child={child} options={options} />
            </CanvasBoundary>
          </div>
        ))}
    </div>
  );
}

/** Controlled frame-realm runtime selected by the Builder bundle bootstrap. */
export function BuilderPreviewFrameApp() {
  const [snapshot, setSnapshot] = useState<BuilderPreviewSnapshotMessage>();
  const origin = location.origin;
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>): void => {
      const message = builderPreviewMessageFromEvent(
        event,
        origin,
        documentPolicy,
        parent,
      );
      if (message?.type === "snapshot") setSnapshot(message);
    };
    addEventListener("message", receive);
    parent.postMessage(builderPreviewReady(), origin);
    return () => removeEventListener("message", receive);
  }, [origin]);
  const post = useCallback(
    (
      message: BuilderPreviewLayoutMessage | BuilderPreviewEventWitnessMessage,
    ) => parent.postMessage(message, origin),
    [origin],
  );
  return snapshot === undefined
    ? <div className="discern-builder-frame-loading">Preparing preview…</div>
    : (
      <FrameDocument
        key={`${snapshot.documentKey}:${String(snapshot.interactionRevision)}`}
        snapshot={snapshot}
        post={post}
      />
    );
}
