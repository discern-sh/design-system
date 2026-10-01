import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import { projectTerminalInspectorHtml } from "../src/cli/projection.ts";
import {
  type MarkdownBrowserCataloguePosture,
  markdownBrowserCataloguePreview,
} from "./markdown-browser-example.ts";
import { defaultCatalogueTerminalPresentation } from "./terminal-theme.ts";

/** One deterministic browser frame and its browser-ready inspector fragment. */
export interface MarkdownBrowserReviewArtifact {
  readonly id: string;
  readonly title: string;
  readonly columns: number;
  readonly rows: number;
  readonly frame: string;
  readonly inspectorHtml: string;
}

/** Canonical local Catalogue route for the complete Markdown browser review. */
export const MARKDOWN_BROWSER_REVIEW_PATH =
  "/catalogue/reviews/markdown-browser/";

/** Historical transient path retained as a redirect for shared review links. */
export const MARKDOWN_BROWSER_LEGACY_REVIEW_PATH =
  "/catalogue/dist/markdown-browser-review.html";

function capabilities(
  columns: number,
  options: Partial<TerminalCapabilities> = {},
): TerminalCapabilities {
  return {
    ansiControl: true,
    colorDepth: "truecolor",
    columns,
    hyperlinks: true,
    unicode: true,
    ...options,
  };
}

function artifact(
  id: string,
  title: string,
  rows: number,
  frame: string,
  columns: number,
): MarkdownBrowserReviewArtifact {
  return Object.freeze({
    id,
    title,
    columns,
    rows,
    frame,
    inspectorHtml: projectTerminalInspectorHtml(frame, {
      columns,
      rows,
      title,
      ...defaultCatalogueTerminalPresentation,
    }),
  });
}

function reviewArtifact(
  id: string,
  title: string,
  rows: number,
  facts: TerminalCapabilities,
  posture: MarkdownBrowserCataloguePosture,
): MarkdownBrowserReviewArtifact {
  const frame = markdownBrowserCataloguePreview(
    facts,
    rows,
    defaultCatalogueTerminalPresentation,
    posture,
  ).frame;
  return artifact(id, title, rows, frame, facts.columns);
}

function resizedArtifact(): MarkdownBrowserReviewArtifact {
  const preview = markdownBrowserCataloguePreview(
    capabilities(40),
    24,
    defaultCatalogueTerminalPresentation,
    "document",
  );
  preview.key("page-down", "page-down", "page-down").resize(120, 30);
  return artifact(
    "resize-result",
    "Resize result · 40×24 to 120×30",
    30,
    preview.frame,
    120,
  );
}

/** Every required visual-review posture, rendered only from explicit facts. */
export function markdownBrowserReviewArtifacts(): readonly MarkdownBrowserReviewArtifact[] {
  return Object.freeze([
    reviewArtifact(
      "contents",
      "Contents with the selected document previewed",
      24,
      capabilities(80),
      "contents",
    ),
    reviewArtifact(
      "contents-wide",
      "Wide contents beside a readable preview",
      30,
      capabilities(120),
      "contents",
    ),
    reviewArtifact(
      "narrow-contents",
      "Narrow contents with a summary strip",
      24,
      capabilities(40),
      "contents",
    ),
    reviewArtifact(
      "document",
      "A document in the reader",
      24,
      capabilities(80),
      "document",
    ),
    reviewArtifact(
      "keyboard-link",
      "Keyboard-focused link",
      24,
      capabilities(80),
      "keyboard-link",
    ),
    reviewArtifact(
      "pointer-link",
      "Mouse-followed link",
      24,
      capabilities(80, { mouseTracking: true }),
      "pointer-link",
    ),
    reviewArtifact(
      "search",
      "Search across every entry",
      24,
      capabilities(80),
      "search",
    ),
    reviewArtifact(
      "linked-document",
      "A linked document opened at its heading",
      24,
      capabilities(80),
      "linked-document",
    ),
    reviewArtifact(
      "internal-destination",
      "A fragment within the document",
      24,
      capabilities(80),
      "internal-destination",
    ),
    reviewArtifact(
      "no-color",
      "No-colour ASCII reader",
      24,
      capabilities(80, {
        colorDepth: "none",
        hyperlinks: false,
        unicode: false,
      }),
      "keyboard-link",
    ),
    reviewArtifact(
      "diagram-document",
      "Resource-upgraded Diagram in the reader",
      24,
      capabilities(80),
      "diagram-document",
    ),
    reviewArtifact(
      "chart-document",
      "Resource-upgraded Chart in the reader",
      24,
      capabilities(80),
      "chart-document",
    ),
    resizedArtifact(),
  ]);
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Render the complete self-contained browser review from deterministic frames. */
export function renderMarkdownBrowserReviewPage(): string {
  const sections = markdownBrowserReviewArtifacts().map((artifact) =>
    `<section class="review" id="${escapeHtml(artifact.id)}" aria-labelledby="${
      escapeHtml(`${artifact.id}-title`)
    }">
  <header class="review__header">
    <div>
      <h2 id="${escapeHtml(`${artifact.id}-title`)}">${
      escapeHtml(artifact.title)
    }</h2>
      <p>${artifact.columns} × ${artifact.rows}</p>
    </div>
    <a href="#top">Back to top</a>
  </header>
  ${artifact.inspectorHtml}
</section>`
  ).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Markdown browser · CLI review</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #111318; color: #f2f4f8; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #111318; }
    a { color: #9fc4ff; }
    main { display: grid; gap: 3rem; width: min(100% - 2rem, 78rem); margin: 0 auto; padding: 3rem 0 5rem; }
    .intro { display: grid; gap: 0.8rem; max-width: 48rem; }
    .intro p, .review__header p { margin: 0; color: #aeb6c5; }
    .eyebrow { color: #9fc4ff !important; font: 700 0.75rem/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.08em; text-transform: uppercase; }
    h1, h2 { margin: 0; line-height: 1.15; }
    h1 { font-size: clamp(2rem, 5vw, 3.5rem); }
    h2 { font-size: clamp(1.2rem, 3vw, 1.65rem); }
    .review { display: grid; gap: 1rem; scroll-margin-block-start: 1rem; }
    .review__header { display: flex; gap: 1rem; align-items: end; justify-content: space-between; }
    .review__header > div { display: grid; gap: 0.3rem; }
    .review__header a { font-size: 0.85rem; white-space: nowrap; }
    @media (max-width: 40rem) {
      main { width: min(100% - 1rem, 78rem); padding-block-start: 1.5rem; }
      .review__header { align-items: start; }
    }
  </style>
</head>
<body>
  <main id="top">
    <header class="intro">
      <p class="eyebrow">discern Design System · CLI review</p>
      <h1>Markdown browser</h1>
      <p>Deterministic terminal postures of the browser running on the application runtime — contents, reading, search, followed links, and resource-upgraded Diagram and Chart — rendered from the package's real application model. Geometry metrics are conformance facts; repeated-line notices are advisory review cues for intentional Markdown spacing.</p>
      <p><a href="/catalogue/?surface=cli#terminal-layout-markdown-browser">Open the interactive Catalogue recipe</a></p>
    </header>
    ${sections}
  </main>
</body>
</html>
`;
}
