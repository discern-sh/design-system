/** Versioned same-origin data seam for the future isolated preview frame. */
import type { ThemeSwitcherMode } from "../../../src/components/core/theme-switcher/theme-switcher.tsx";
import type { BuilderDocument } from "../model.ts";
import {
  assertBuilderDocument,
  type BuilderDocumentPolicy,
} from "../policy.ts";

export const BUILDER_PREVIEW_PROTOCOL = "discern-builder-preview";
export const BUILDER_PREVIEW_PROTOCOL_VERSION = 1 as const;

export type BuilderPreviewMode = "edit" | "interact";

/** Viewport fact carried without claiming an iframe exists yet. */
export interface BuilderPreviewViewport {
  readonly id: "fluid" | "desktop" | "tablet" | "phone";
  readonly label: string;
  readonly cssWidth?: string;
}

/** Shared Appearance facts projected into preview state. */
export interface BuilderPreviewAppearance {
  readonly theme: ThemeSwitcherMode;
  readonly accentHue: number;
}

/** Complete accepted state the current canvas and a later frame can consume. */
export interface BuilderPreviewSnapshotMessage {
  readonly channel: typeof BUILDER_PREVIEW_PROTOCOL;
  readonly version: typeof BUILDER_PREVIEW_PROTOCOL_VERSION;
  readonly type: "snapshot";
  readonly document: BuilderDocument;
  readonly viewport: BuilderPreviewViewport;
  readonly appearance: BuilderPreviewAppearance;
  readonly mode: BuilderPreviewMode;
  readonly selectionId: string | null;
}

/** Inert evidence that a design-system callback fired inside a later frame. */
export interface BuilderPreviewCallbackWitnessMessage {
  readonly channel: typeof BUILDER_PREVIEW_PROTOCOL;
  readonly version: typeof BUILDER_PREVIEW_PROTOCOL_VERSION;
  readonly type: "callback-witness";
  readonly nodeId: string;
  readonly prop: string;
  readonly summary: string;
}

export type BuilderPreviewMessage =
  | BuilderPreviewSnapshotMessage
  | BuilderPreviewCallbackWitnessMessage;

/** Construct the exact snapshot consumed by the current preview host. */
export function builderPreviewSnapshot(
  input: Omit<
    BuilderPreviewSnapshotMessage,
    "channel" | "version" | "type"
  >,
): BuilderPreviewSnapshotMessage {
  return Object.freeze({
    channel: BUILDER_PREVIEW_PROTOCOL,
    version: BUILDER_PREVIEW_PROTOCOL_VERSION,
    type: "snapshot",
    ...input,
  });
}

/**
 * Read a future postMessage only from the expected origin and protocol.
 * Snapshot documents cross the same inert policy before becoming live state.
 */
export function builderPreviewMessageFromEvent(
  event: Pick<MessageEvent<unknown>, "origin" | "data">,
  expectedOrigin: string,
  policy: BuilderDocumentPolicy,
): BuilderPreviewMessage | undefined {
  if (event.origin !== expectedOrigin) return undefined;
  if (typeof event.data !== "object" || event.data === null) return undefined;
  const candidate = event.data as Partial<BuilderPreviewMessage>;
  if (
    candidate.channel !== BUILDER_PREVIEW_PROTOCOL ||
    candidate.version !== BUILDER_PREVIEW_PROTOCOL_VERSION
  ) return undefined;
  if (candidate.type === "snapshot") {
    const snapshot = candidate as Partial<BuilderPreviewSnapshotMessage>;
    assertBuilderDocument(snapshot.document, policy);
    if (
      typeof snapshot.viewport !== "object" || snapshot.viewport === null ||
      typeof snapshot.appearance !== "object" || snapshot.appearance === null ||
      (snapshot.mode !== "edit" && snapshot.mode !== "interact") ||
      !(snapshot.selectionId === null ||
        typeof snapshot.selectionId === "string")
    ) return undefined;
    return snapshot as BuilderPreviewSnapshotMessage;
  }
  if (candidate.type === "callback-witness") {
    const witness = candidate as Partial<BuilderPreviewCallbackWitnessMessage>;
    return typeof witness.nodeId === "string" &&
        typeof witness.prop === "string" && typeof witness.summary === "string"
      ? witness as BuilderPreviewCallbackWitnessMessage
      : undefined;
  }
  return undefined;
}
