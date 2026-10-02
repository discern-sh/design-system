import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import type {
  MarkdownBrowserEntry,
  MarkdownBrowserLinkResolution,
  MarkdownBrowserLinkResolverInput,
  MarkdownBrowserOptions,
} from "../src/cli/interactive/markdown-browser-model.ts";
import { markdownBrowserApplication } from "../src/cli/interactive/markdown-browser-request.ts";
import type { MarkdownBrowserStep } from "../src/cli/interactive/markdown-browser-view.ts";
import {
  markdownChartExampleMarkdown,
  markdownChartExampleResource,
} from "../src/chart/markdown.example.ts";
import {
  markdownDiagramExampleMarkdown,
  markdownDiagramExampleResource,
} from "../src/diagram/markdown.example.ts";
import { ApplicationPreview } from "./application-preview.ts";
import type { CatalogueTerminalPresentation } from "./terminal-theme.ts";

/** Markdown corpus exercising the browser's document-reading treatment. */
export const markdownBrowserDocumentSource =
  `# A deliberately long guide heading that wraps without losing its meaning

This guide explains a reusable reading surface at a comfortable measure.

> Keep the selected document and the reading position as separate facts.

- Search a grouped corpus.
- Open one document.
- Scroll each pane independently.

| Profile | Shape |
| --- | --- |
| Compact | 40 × 24 |
| Standard | 80 × 24 |

\`\`\`ts
const state = createState(entries);
render(state);
\`\`\`

[Read the reference](#navigation-details), [open note one](../reference/note-1.md#details), or visit the [external reference](https://example.com/reference).

${
    Array.from(
      { length: 12 },
      (_, index) =>
        `Paragraph ${
          index + 1
        } keeps a stable semantic landmark across terminal rewrapping.`,
    ).join("\n\n")
  }

## Navigation details

An internal fragment stays inside the reader and keeps the caller's picker state.

${
    Array.from(
      { length: 24 },
      (_, index) =>
        `Paragraph ${
          index + 13
        } keeps a stable semantic landmark across terminal rewrapping.`,
    ).join("\n\n")
  }

${markdownDiagramExampleMarkdown}

${markdownChartExampleMarkdown}`;

const generatedDocuments = Array.from({ length: 18 }, (_, index) => ({
  kind: "document" as const,
  id: `note-${index + 1}`,
  label: `Reference note ${index + 1}`,
  description: `A supporting note for browser navigation ${index + 1}`,
  path: `reference/note-${index + 1}.md`,
  source: `# Reference note ${index + 1}\n\n## Details\n\nSupporting material ${
    index + 1
  }.`,
}));

/** Generic grouped documents and explicit actions shown in the Catalogue. */
export const markdownBrowserEntries = [
  {
    kind: "group-heading",
    id: "guides",
    label: "Guides",
    description: "Practical deployment and operation guides",
  },
  {
    kind: "document",
    id: "reader-guide",
    label: "Keyboard Markdown browser",
    description: "Search, focus, resize, and restoration",
    path: "guides/keyboard-markdown-browser.md",
    source: markdownBrowserDocumentSource,
    diagrams: [markdownDiagramExampleResource],
    charts: [markdownChartExampleResource],
  },
  ...generatedDocuments.slice(0, 9),
  {
    kind: "group-heading",
    id: "reference",
    label: "Reference",
    description: "Detailed package contracts",
  },
  ...generatedDocuments.slice(9),
  {
    kind: "group-heading",
    id: "actions",
    label: "Actions",
    description: "Leave the terminal before performing an external effect",
  },
  {
    kind: "action",
    id: "read-online",
    label: "Read the docs online",
    description: "Return control to the caller",
    value: "online",
  },
  {
    kind: "exit",
    id: "quit",
    label: "Quit",
    description: "Close this browser",
  },
] as const satisfies readonly MarkdownBrowserEntry<string>[];

/**
 * Resolve a relative link among the admitted documents by path, keeping
 * its fragment, as a caller's resolver would.
 */
export function resolveMarkdownBrowserExampleLink(
  input: MarkdownBrowserLinkResolverInput,
): MarkdownBrowserLinkResolution {
  const [path = "", fragment] = input.destination.split("#");
  const parts = input.sourcePath.split("/").slice(0, -1);
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== "." && part !== "") parts.push(part);
  }
  const target = parts.join("/");
  const document = input.availableDocuments.find((candidate) =>
    candidate.path === target
  );
  return document === undefined ? { kind: "unresolved" } : {
    kind: "document",
    documentId: document.id,
    ...(fragment === undefined || fragment === "" ? {} : { fragment }),
  };
}

/** Browser options shared by Catalogue frames and deterministic tests. */
export const markdownBrowserOptions = {
  label: "Documentation library",
  placeholder: "Search titles and descriptions",
  entries: markdownBrowserEntries,
  resolveLink: resolveMarkdownBrowserExampleLink,
} as const satisfies MarkdownBrowserOptions<string>;

/** One reviewable browser state. */
export type MarkdownBrowserCataloguePosture =
  | "contents"
  | "document"
  | "keyboard-link"
  | "pointer-link"
  | "search"
  | "linked-document"
  | "internal-destination"
  | "diagram-document"
  | "chart-document";

/** Scroll a preview until a text sits near the top, or fail the posture. */
function scrollTo(
  preview: ApplicationPreview<MarkdownBrowserStep>,
  text: string,
): void {
  const near = () =>
    preview.text.split("\n").slice(0, 5).some((row) => row.includes(text));
  for (let line = 0; line < 400 && !near(); line += 1) {
    const before = preview.text;
    preview.key("down");
    if (preview.text === before) break;
  }
  if (!preview.text.includes(text)) {
    throw new TypeError(`the Catalogue posture never shows ${text}`);
  }
}

/** Drive a browser to one posture without a terminal, as the runtime would. */
export function markdownBrowserCataloguePreview(
  capabilities: TerminalCapabilities,
  rows: number,
  presentation: CatalogueTerminalPresentation,
  posture: MarkdownBrowserCataloguePosture,
  options: MarkdownBrowserOptions<string> = markdownBrowserOptions,
): ApplicationPreview<MarkdownBrowserStep> {
  const { application } = markdownBrowserApplication(
    {
      ...options,
      ...(posture === "pointer-link" ? { mouse: true } : {}),
    },
    { respond: () => undefined, closing: () => {} },
  );
  const preview = new ApplicationPreview(
    application,
    capabilities,
    rows,
    presentation,
  );
  switch (posture) {
    case "contents":
      return preview;
    case "search":
      return preview.key("/").type("note 1");
    default:
      preview.key("enter");
  }
  switch (posture) {
    case "keyboard-link":
      preview.key("tab");
      break;
    case "pointer-link":
      scrollTo(preview, "external reference");
      preview.click("external reference");
      break;
    case "linked-document":
      preview.key("tab", "tab", "enter");
      break;
    case "internal-destination":
      preview.key("tab", "enter");
      break;
    case "diagram-document":
      scrollTo(preview, "Review a change");
      break;
    case "chart-document":
      scrollTo(preview, "Reviews completed by weekday");
      break;
    default:
      break;
  }
  return preview;
}

/** Render one deterministic browser posture. */
export function renderMarkdownBrowserCatalogueFrame(
  capabilities: TerminalCapabilities,
  rows: number,
  presentation: CatalogueTerminalPresentation,
  posture: MarkdownBrowserCataloguePosture = "document",
): string {
  return markdownBrowserCataloguePreview(
    capabilities,
    rows,
    presentation,
    posture,
  ).frame;
}
