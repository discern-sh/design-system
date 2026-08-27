import { componentExampleImageManifest } from "../generated/example-images-manifest.ts";
import { representativeComponentExampleImage } from "../example-images.ts";

export const COMPONENT_EXAMPLE_IMAGE_REVIEW_PATH =
  "/catalogue/example-images/review/";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Source-rendered review sheet for exact crop edges and thumbnail posture. */
export function renderComponentExampleImageReviewPage(): string {
  const figures = componentExampleImageManifest.entries.map((entry) => {
    const representative = representativeComponentExampleImage(
      entry.slug,
      entry.theme,
    )?.exampleId === entry.exampleId;
    const identity = `${entry.componentName} — ${entry.label} — ${entry.theme}`;
    return `<article data-component="${escapeHtml(entry.slug)}" data-example="${
      escapeHtml(entry.exampleId)
    }" data-theme="${entry.theme}" data-representative="${representative}">
      <header><strong>${
      escapeHtml(identity)
    }</strong><span>${entry.width}×${entry.height} · ${
      representative ? "representative" : "canonical"
    }</span></header>
      <div class="natural"><img src="${
      escapeHtml(entry.assetUrl)
    }" width="${entry.width}" height="${entry.height}" alt="${
      escapeHtml(identity)
    }"></div>
      <div class="thumbnail"><img src="${
      escapeHtml(entry.assetUrl)
    }" width="${entry.width}" height="${entry.height}" alt=""><span>240×150 consumer frame</span></div>
    </article>`;
  }).join("\n");
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Discern Component example image review</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; background: Canvas; color: CanvasText; }
    body { margin: 0; padding: 24px; }
    h1 { margin-block-start: 0; }
    main { display: grid; gap: 28px; }
    article { min-width: 0; padding-block-start: 18px; border-block-start: 1px solid color-mix(in srgb, CanvasText 24%, transparent); }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-block-end: 12px; }
    header span { color: color-mix(in srgb, CanvasText 68%, transparent); }
    .natural { overflow: auto; max-height: 720px; background: repeating-conic-gradient(#8882 0 25%, transparent 0 50%) 0 / 16px 16px; }
    .natural img { display: block; width: auto; max-width: none; height: auto; image-rendering: auto; }
    .thumbnail { display: grid; width: 240px; height: 150px; margin-block-start: 12px; place-items: center; border: 1px solid color-mix(in srgb, CanvasText 24%, transparent); background: Canvas; }
    .thumbnail img { grid-area: 1 / 1; max-width: 100%; max-height: 100%; object-fit: contain; }
    .thumbnail span { grid-area: 1 / 1; align-self: end; padding: 3px 5px; background: color-mix(in srgb, Canvas 90%, transparent); font-size: 11px; }
  </style>
</head>
<body>
  <h1>Component example images</h1>
  <p>${componentExampleImageManifest.entries.length} exact-bounds theme entries. Natural pixels expose crop edges; the smaller frame previews consumer fitting without adding chrome to the asset.</p>
  <main>${figures}</main>
</body>
</html>`;
}
