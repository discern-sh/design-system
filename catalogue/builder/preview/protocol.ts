/** Versioned same-origin data boundary for the isolated Builder preview. */
import type { ThemeSwitcherMode } from "../../../src/components/core/theme-switcher/theme-switcher.tsx";
import type { AppearanceName } from "../../../src/tokens/appearance.ts";
import { catalogueAccentHue } from "../../shell/appearance-options.ts";
import type { CatalogueAxesSelection } from "../../shell/axes-state.ts";
import { isCatalogueAxesSelection } from "../../shell/axes-state.ts";
import type { BuilderDocument } from "../model.ts";
import {
  assertBuilderDocument,
  BUILDER_DOCUMENT_LIMITS,
  type BuilderDocumentPolicy,
} from "../policy.ts";
import type { BuilderPreviewRect } from "./geometry.ts";

export const BUILDER_PREVIEW_PROTOCOL = "discern-builder-preview";
export const BUILDER_PREVIEW_PROTOCOL_VERSION = 5 as const;

export type BuilderPreviewMode = "edit" | "interact";
export type BuilderPreviewViewportId =
  | "fluid"
  | "desktop"
  | "tablet"
  | "phone";
export type BuilderPreviewZoomId = "fit" | "50" | "75" | "100";

/** Exact viewport owned by the nested browsing context. */
export interface BuilderPreviewViewport {
  readonly id: BuilderPreviewViewportId;
  readonly label: string;
  readonly logicalWidth: number;
}

/** Visual scale outside the browsing context; it never changes layout. */
export interface BuilderPreviewZoom {
  readonly id: BuilderPreviewZoomId;
  readonly scale: number;
}

/** Shared Appearance facts projected into preview state. */
export interface BuilderPreviewAppearance {
  readonly theme: ThemeSwitcherMode;
  readonly resolvedTheme: "light" | "dark";
  readonly appearance: AppearanceName;
  readonly accentHue: number;
  readonly field: CatalogueAxesSelection;
}

/** Complete accepted state sent from the Builder into the frame. */
export interface BuilderPreviewSnapshotMessage {
  readonly channel: typeof BUILDER_PREVIEW_PROTOCOL;
  readonly version: typeof BUILDER_PREVIEW_PROTOCOL_VERSION;
  readonly type: "snapshot";
  readonly document: BuilderDocument;
  /** Stable inert identity used to reset behaviour only when data changes. */
  readonly documentKey: string;
  readonly viewport: BuilderPreviewViewport;
  readonly zoom: BuilderPreviewZoom;
  readonly appearance: BuilderPreviewAppearance;
  readonly mode: BuilderPreviewMode;
  readonly selectionId: string | null;
  readonly interactionRevision: number;
}

export interface BuilderPreviewNodeRect {
  readonly id: string;
  readonly rect: BuilderPreviewRect;
}

/** Frame handshake sent only after its protocol listener is attached. */
export interface BuilderPreviewReadyMessage {
  readonly channel: typeof BUILDER_PREVIEW_PROTOCOL;
  readonly version: typeof BUILDER_PREVIEW_PROTOCOL_VERSION;
  readonly type: "frame-ready";
}

/** Geometry and browser facts measured inside the frame, never inferred. */
export interface BuilderPreviewLayoutMessage {
  readonly channel: typeof BUILDER_PREVIEW_PROTOCOL;
  readonly version: typeof BUILDER_PREVIEW_PROTOCOL_VERSION;
  readonly type: "layout";
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly devicePixelRatio: number;
  readonly nodes: readonly BuilderPreviewNodeRect[];
  readonly roots: readonly BuilderPreviewRect[];
}

/** Edit-layer intent after display coordinates have mapped to logical space. */
export interface BuilderPreviewSelectionIntentMessage {
  readonly channel: typeof BUILDER_PREVIEW_PROTOCOL;
  readonly version: typeof BUILDER_PREVIEW_PROTOCOL_VERSION;
  readonly type: "selection-intent";
  readonly nodeId: string | null;
  readonly x: number;
  readonly y: number;
}

export type BuilderPreviewEventKind =
  | "callback"
  | "navigation-blocked"
  | "submission-blocked"
  | "download-blocked"
  | "popup-blocked";

/** Inert evidence that behaviour fired or an external effect was contained. */
export interface BuilderPreviewEventWitnessMessage {
  readonly channel: typeof BUILDER_PREVIEW_PROTOCOL;
  readonly version: typeof BUILDER_PREVIEW_PROTOCOL_VERSION;
  readonly type: "event-witness";
  readonly kind: BuilderPreviewEventKind;
  readonly nodeId: string | null;
  readonly prop: string | null;
  readonly summary: string;
}

export type BuilderPreviewMessage =
  | BuilderPreviewSnapshotMessage
  | BuilderPreviewReadyMessage
  | BuilderPreviewLayoutMessage
  | BuilderPreviewSelectionIntentMessage
  | BuilderPreviewEventWitnessMessage;

function envelope<Type extends BuilderPreviewMessage["type"]>(type: Type) {
  return {
    channel: BUILDER_PREVIEW_PROTOCOL,
    version: BUILDER_PREVIEW_PROTOCOL_VERSION,
    type,
  } as const;
}

/** Construct the exact accepted state sent to the frame. */
export function builderPreviewSnapshot(
  input: Omit<
    BuilderPreviewSnapshotMessage,
    "channel" | "version" | "type"
  >,
): BuilderPreviewSnapshotMessage {
  return Object.freeze({ ...envelope("snapshot"), ...input });
}

/** Construct the frame's listener-ready handshake. */
export function builderPreviewReady(): BuilderPreviewReadyMessage {
  return envelope("frame-ready");
}

/** Construct frame-owned layout evidence. */
export function builderPreviewLayout(
  input: Omit<BuilderPreviewLayoutMessage, "channel" | "version" | "type">,
): BuilderPreviewLayoutMessage {
  return { ...envelope("layout"), ...input };
}

/** Construct one mapped Edit-mode selection intent. */
export function builderPreviewSelectionIntent(
  input: Omit<
    BuilderPreviewSelectionIntentMessage,
    "channel" | "version" | "type"
  >,
): BuilderPreviewSelectionIntentMessage {
  return { ...envelope("selection-intent"), ...input };
}

/** Construct one inert callback or effect-containment witness. */
export function builderPreviewEventWitness(
  input: Omit<
    BuilderPreviewEventWitnessMessage,
    "channel" | "version" | "type"
  >,
): BuilderPreviewEventWitnessMessage {
  return { ...envelope("event-witness"), ...input };
}

function stableWitnessValue(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): string {
  if (
    value === null || typeof value === "boolean" || typeof value === "number"
  ) return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "bigint") return `${String(value)}n`;
  if (typeof value === "function") return "[function]";
  if (typeof value === "symbol") return "[symbol]";
  if (depth >= 4) return "[depth]";
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) {
    const members = value.slice(0, 12).map((member) =>
      stableWitnessValue(member, seen, depth + 1)
    );
    if (value.length > members.length) members.push("…");
    return `[${members.join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 12)
    .map(([key, member]) =>
      `${JSON.stringify(key)}:${stableWitnessValue(member, seen, depth + 1)}`
    );
  return `{${entries.join(",")}}`;
}

/** Format callback arguments without retaining functions, events, or objects. */
export function formatBuilderPreviewCallbackWitness(
  prop: string,
  args: readonly unknown[],
): string {
  const summary = `${prop}(${
    args.map((value) => stableWitnessValue(value, new WeakSet(), 0)).join(", ")
  })`;
  return summary.length <= 180 ? summary : `${summary.slice(0, 177)}…`;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validRect(value: unknown): value is BuilderPreviewRect {
  if (typeof value !== "object" || value === null) return false;
  const rect = value as Partial<BuilderPreviewRect>;
  return finite(rect.x) && finite(rect.y) && finite(rect.width) &&
    finite(rect.height) && rect.width >= 0 && rect.height >= 0;
}

function validTheme(value: unknown): value is ThemeSwitcherMode {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Accept a message only from the expected origin, frame, version, and inert
 * policy. The optional source check binds one host to one browsing context.
 */
export function builderPreviewMessageFromEvent(
  event: Pick<MessageEvent<unknown>, "origin" | "data" | "source">,
  expectedOrigin: string,
  policy: BuilderDocumentPolicy,
  expectedSource?: MessageEventSource,
): BuilderPreviewMessage | undefined {
  if (event.origin !== expectedOrigin) return undefined;
  if (expectedSource !== undefined && event.source !== expectedSource) {
    return undefined;
  }
  if (typeof event.data !== "object" || event.data === null) return undefined;
  let cloned: unknown;
  try {
    // A same-origin postMessage still creates values in the receiving realm.
    // Re-clone through this module's realm before applying the plain-object
    // document policy; functions and other active values remain unclonable.
    cloned = structuredClone(event.data);
  } catch {
    return undefined;
  }
  if (typeof cloned !== "object" || cloned === null) return undefined;
  const candidate = cloned as Partial<BuilderPreviewMessage>;
  if (
    candidate.channel !== BUILDER_PREVIEW_PROTOCOL ||
    candidate.version !== BUILDER_PREVIEW_PROTOCOL_VERSION
  ) return undefined;
  if (candidate.type === "snapshot") {
    const snapshot = candidate as Partial<BuilderPreviewSnapshotMessage>;
    try {
      assertBuilderDocument(snapshot.document, policy);
    } catch {
      return undefined;
    }
    if (snapshot.documentKey !== JSON.stringify(snapshot.document)) {
      return undefined;
    }
    const viewport = snapshot.viewport as Partial<BuilderPreviewViewport>;
    const zoom = snapshot.zoom as Partial<BuilderPreviewZoom>;
    const appearance = snapshot.appearance as Partial<BuilderPreviewAppearance>;
    if (
      typeof snapshot.documentKey !== "string" ||
      snapshot.documentKey.length === 0 ||
      snapshot.documentKey.length > BUILDER_DOCUMENT_LIMITS.inputBytes ||
      typeof viewport !== "object" || viewport === null ||
      !["fluid", "desktop", "tablet", "phone"].includes(viewport.id ?? "") ||
      typeof viewport.label !== "string" || !finite(viewport.logicalWidth) ||
      viewport.logicalWidth <= 0 ||
      typeof zoom !== "object" || zoom === null ||
      !["fit", "50", "75", "100"].includes(zoom.id ?? "") ||
      !finite(zoom.scale) || zoom.scale <= 0 || zoom.scale > 1 ||
      typeof appearance !== "object" || appearance === null ||
      !validTheme(appearance.theme) ||
      (appearance.resolvedTheme !== "light" &&
        appearance.resolvedTheme !== "dark") ||
      (appearance.appearance !== "field" &&
        appearance.appearance !== "accent") ||
      catalogueAccentHue(appearance.accentHue as number) === undefined ||
      !isCatalogueAxesSelection(appearance.field) ||
      (snapshot.mode !== "edit" && snapshot.mode !== "interact") ||
      !(snapshot.selectionId === null ||
        typeof snapshot.selectionId === "string") ||
      !Number.isSafeInteger(snapshot.interactionRevision) ||
      (snapshot.interactionRevision ?? -1) < 0
    ) return undefined;
    return snapshot as BuilderPreviewSnapshotMessage;
  }
  if (candidate.type === "frame-ready") {
    return candidate as BuilderPreviewReadyMessage;
  }
  if (candidate.type === "layout") {
    const layout = candidate as Partial<BuilderPreviewLayoutMessage>;
    if (
      !finite(layout.innerWidth) || !finite(layout.innerHeight) ||
      !finite(layout.devicePixelRatio) || layout.innerWidth <= 0 ||
      layout.innerHeight <= 0 || layout.devicePixelRatio <= 0 ||
      !Array.isArray(layout.nodes) || !Array.isArray(layout.roots) ||
      layout.nodes.length > BUILDER_DOCUMENT_LIMITS.totalNodes ||
      layout.roots.length > BUILDER_DOCUMENT_LIMITS.childrenPerSlot ||
      !layout.nodes.every((node) =>
        typeof node === "object" && node !== null &&
        typeof (node as Partial<BuilderPreviewNodeRect>).id === "string" &&
        validRect((node as Partial<BuilderPreviewNodeRect>).rect)
      ) || !layout.roots.every(validRect)
    ) return undefined;
    return layout as BuilderPreviewLayoutMessage;
  }
  if (candidate.type === "selection-intent") {
    const selection = candidate as Partial<
      BuilderPreviewSelectionIntentMessage
    >;
    return (selection.nodeId === null ||
        typeof selection.nodeId === "string") &&
        finite(selection.x) && finite(selection.y)
      ? selection as BuilderPreviewSelectionIntentMessage
      : undefined;
  }
  if (candidate.type === "event-witness") {
    const witness = candidate as Partial<BuilderPreviewEventWitnessMessage>;
    return [
        "callback",
        "navigation-blocked",
        "submission-blocked",
        "download-blocked",
        "popup-blocked",
      ].includes(witness.kind ?? "") &&
        (witness.nodeId === null || typeof witness.nodeId === "string") &&
        (witness.prop === null || typeof witness.prop === "string") &&
        typeof witness.summary === "string" && witness.summary.length <= 180
      ? witness as BuilderPreviewEventWitnessMessage
      : undefined;
  }
  return undefined;
}
