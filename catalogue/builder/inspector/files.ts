/** Browser file effects kept outside the accepted document authority. */
export function downloadBuilderSource(source: string, filename: string): void {
  let url: string | undefined;
  let anchor: HTMLAnchorElement | undefined;
  try {
    url = URL.createObjectURL(new Blob([source], { type: "application/json" }));
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

/** Deterministic lowercase filename stem with a blank-name fallback. */
export function builderFileStem(name: string): string {
  const stem = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
    /^-|-$/g,
    "",
  );
  return stem === "" ? "composition" : stem;
}
