export { builderFileStem } from "../export.ts";

/** Browser file effects kept outside the accepted document authority. */
export function downloadBuilderSource(
  source: string,
  filename: string,
  mediaType = "text/plain;charset=utf-8",
): void {
  let url: string | undefined;
  let anchor: HTMLAnchorElement | undefined;
  try {
    url = URL.createObjectURL(new Blob([source], { type: mediaType }));
    anchor = globalThis.document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    globalThis.document.body.append(anchor);
    anchor.click();
  } finally {
    anchor?.remove();
    if (url !== undefined) {
      const createdUrl = url;
      globalThis.setTimeout(() => URL.revokeObjectURL(createdUrl), 0);
    }
  }
}

/** Clipboard effect with an explicit, user-actionable rejection. */
export async function copyBuilderSource(
  source: string,
  clipboard: Pick<Clipboard, "writeText"> = navigator.clipboard,
): Promise<
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string }
> {
  try {
    await clipboard.writeText(source);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "Clipboard access was denied. Select the source and copy it manually.",
    };
  }
}
