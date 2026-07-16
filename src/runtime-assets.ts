/** The optional asset packs a runtime emission may select. */
export const runtimeAssetSelections = ["fonts", "grain"] as const;
/** One selectable optional asset pack. */
export type RuntimeAssetSelection = (typeof runtimeAssetSelections)[number];

/** One embedded asset file the emitter can write for a selection. */
export interface EmbeddedRuntimeAsset {
  readonly selection: RuntimeAssetSelection;
  readonly path: string;
  readonly mediaType: string;
  readonly encoding: "base64" | "utf8";
  readonly contents: string;
}
