import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import { transitionMarkdownBrowser } from "../src/cli/interactive/markdown-browser-machine.ts";
import { renderMarkdownBrowser } from "../src/cli/interactive/markdown-browser-renderer.ts";
import { projectTerminalInspectorHtml } from "../src/cli/projection.ts";
import {
  createMarkdownBrowserCatalogueState,
  type MarkdownBrowserCataloguePosture,
} from "./markdown-browser-example.ts";

/** One deterministic browser frame and its browser-ready inspector fragment. */
export interface MarkdownBrowserReviewArtifact {
  readonly id: string;
  readonly title: string;
  readonly columns: number;
  readonly rows: number;
  readonly frame: string;
  readonly inspectorHtml: string;
}

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

function reviewArtifact(
  id: string,
  title: string,
  columns: number,
  rows: number,
  facts: TerminalCapabilities,
  posture: MarkdownBrowserCataloguePosture,
): MarkdownBrowserReviewArtifact {
  const state = createMarkdownBrowserCatalogueState(
    facts,
    rows,
    "dark",
    posture,
  );
  const frame = renderMarkdownBrowser(state, facts);
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
      theme: "dark",
    }),
  });
}

function resizedArtifact(): MarkdownBrowserReviewArtifact {
  const narrow = capabilities(40);
  let state = createMarkdownBrowserCatalogueState(
    narrow,
    24,
    "dark",
    "split-reader",
  );
  for (let page = 0; page < 3; page += 1) {
    state = transitionMarkdownBrowser(state, {
      kind: "key",
      key: { kind: "named", name: "page-down" },
    }, narrow).state;
  }
  const wide = capabilities(120);
  state = transitionMarkdownBrowser(state, {
    kind: "resize",
    columns: 120,
    rows: 30,
  }, wide).state;
  const frame = renderMarkdownBrowser(state, wide);
  const title = "Resize result · 40×24 to 120×30";
  return Object.freeze({
    id: "resize-result",
    title,
    columns: 120,
    rows: 30,
    frame,
    inspectorHtml: projectTerminalInspectorHtml(frame, {
      columns: 120,
      rows: 30,
      title,
      theme: "dark",
    }),
  });
}

/** Five required visual-review postures rendered only from explicit facts. */
export function markdownBrowserReviewArtifacts(): readonly MarkdownBrowserReviewArtifact[] {
  return Object.freeze([
    reviewArtifact(
      "initial-picker",
      "Initial full-height picker",
      80,
      24,
      capabilities(80),
      "initial-picker",
    ),
    reviewArtifact(
      "split-reader",
      "Split picker and Markdown reader",
      80,
      24,
      capabilities(80),
      "split-reader",
    ),
    reviewArtifact(
      "single-pane",
      "Single-pane document fallback",
      40,
      24,
      capabilities(40),
      "single-document",
    ),
    reviewArtifact(
      "no-color",
      "No-colour ASCII reader",
      80,
      24,
      capabilities(80, {
        colorDepth: "none",
        hyperlinks: false,
        unicode: false,
      }),
      "split-reader",
    ),
    resizedArtifact(),
  ]);
}
