/** Builder-native drag payload shared by discovery, preview, and Layers. */
export const BUILDER_DRAG_MIME = "application/x-discern-builder";

export type BuilderDragPayload =
  | { readonly type: "palette"; readonly slug: string }
  | { readonly type: "child"; readonly id: string };

/** Put one typed payload on a native drag transfer. */
export function writeBuilderDragPayload(
  transfer: DataTransfer,
  payload: BuilderDragPayload,
): void {
  transfer.setData(BUILDER_DRAG_MIME, JSON.stringify(payload));
  transfer.effectAllowed = payload.type === "palette" ? "copy" : "move";
}

/** Ignore foreign or malformed drag data at the Builder boundary. */
export function readBuilderDragPayload(
  transfer: DataTransfer,
): BuilderDragPayload | undefined {
  try {
    const raw = transfer.getData(BUILDER_DRAG_MIME);
    if (raw === "") return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const payload = parsed as { type?: unknown; slug?: unknown; id?: unknown };
    if (payload.type === "palette" && typeof payload.slug === "string") {
      return { type: "palette", slug: payload.slug };
    }
    if (payload.type === "child" && typeof payload.id === "string") {
      return { type: "child", id: payload.id };
    }
  } catch {
    // A foreign drag is not a Builder command.
  }
  return undefined;
}
