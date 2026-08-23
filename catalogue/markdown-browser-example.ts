import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import type { TerminalThemeVariant } from "../src/cli/theme.ts";
import { transitionMarkdownBrowser } from "../src/cli/interactive/markdown-browser-machine.ts";
import {
  createMarkdownBrowserState,
  type MarkdownBrowserEntry,
  type MarkdownBrowserOptions,
  type MarkdownBrowserState,
} from "../src/cli/interactive/markdown-browser-model.ts";
import {
  markdownBrowserLinkOccurrences,
  renderMarkdownBrowser,
} from "../src/cli/interactive/markdown-browser-renderer.ts";
import {
  markdownDiagramExampleMarkdown,
  markdownDiagramExampleResource,
} from "../src/diagram/markdown.example.ts";

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

${markdownDiagramExampleMarkdown}`;

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

/** Browser options shared by Catalogue frames and deterministic tests. */
export const markdownBrowserOptions = {
  label: "Documentation library",
  placeholder: "Search titles, descriptions, and paths",
  entries: markdownBrowserEntries,
} as const satisfies MarkdownBrowserOptions<string>;

/** Pure Catalogue browser posture. */
export type MarkdownBrowserCataloguePosture =
  | "initial-picker"
  | "split-reader"
  | "single-document"
  | "single-picker"
  | "keyboard-link"
  | "pointer-link"
  | "pointer-picker"
  | "internal-destination";

/** Construct one deterministic state without reading a process or terminal. */
export function createMarkdownBrowserCatalogueState(
  capabilities: TerminalCapabilities,
  rows: number,
  theme: TerminalThemeVariant,
  posture: MarkdownBrowserCataloguePosture,
): MarkdownBrowserState<string> {
  const single = posture === "single-document" || posture === "single-picker";
  let state = createMarkdownBrowserState(
    {
      ...markdownBrowserOptions,
      ...(single ? { pickerMinimumRows: 11, documentMinimumRows: 12 } : {}),
    },
    { columns: capabilities.columns, rows },
    { theme },
  );
  if (posture === "initial-picker") return state;
  state = transitionMarkdownBrowser(state, {
    kind: "key",
    key: { kind: "named", name: "enter" },
  }, capabilities).state;
  if (posture === "single-picker") {
    state = transitionMarkdownBrowser(state, {
      kind: "key",
      key: { kind: "named", name: "tab" },
    }, capabilities).state;
  }
  if (posture === "pointer-picker") {
    state = transitionMarkdownBrowser(state, {
      kind: "mouse",
      action: "press",
      button: "left",
      column: 4,
      row: 3,
      modifiers: { shift: false, alt: false, control: false },
    }, capabilities).state;
  }
  if (
    posture === "keyboard-link" || posture === "pointer-link" ||
    posture === "internal-destination"
  ) {
    state = transitionMarkdownBrowser(state, {
      kind: "key",
      key: { kind: "text", text: "]" },
    }, capabilities).state;
  }
  if (posture === "pointer-link") {
    state = transitionMarkdownBrowser(state, {
      kind: "key",
      key: { kind: "named", name: "escape" },
    }, capabilities).state;
    const link = markdownBrowserLinkOccurrences(state, capabilities)[0];
    const region = link?.regions[0];
    if (region === undefined) {
      throw new TypeError("Catalogue pointer posture has no visible link");
    }
    const documentTop = state.layout.mode === "split"
      ? 2 + state.layout.pickerRows
      : 2;
    state = transitionMarkdownBrowser(state, {
      kind: "mouse",
      action: "press",
      button: "left",
      column: region.startColumn + 1,
      row: documentTop + region.row,
      modifiers: { shift: false, alt: false, control: false },
    }, capabilities).state;
  }
  if (posture === "internal-destination") {
    const activated = transitionMarkdownBrowser(state, {
      kind: "key",
      key: { kind: "named", name: "enter" },
    }, capabilities);
    if (activated.linkRequest === undefined) {
      throw new TypeError("Catalogue fragment posture has no link request");
    }
    state = transitionMarkdownBrowser(activated.state, {
      kind: "link-resolution",
      request: activated.linkRequest,
      resolution: { kind: "fragment", fragment: "navigation-details" },
    }, capabilities).state;
  }
  return state;
}

/** Render one deterministic complete-frame browser review posture. */
export function renderMarkdownBrowserCatalogueFrame(
  capabilities: TerminalCapabilities,
  rows: number,
  theme: TerminalThemeVariant,
  posture: MarkdownBrowserCataloguePosture = "split-reader",
): string {
  return renderMarkdownBrowser(
    createMarkdownBrowserCatalogueState(capabilities, rows, theme, posture),
    capabilities,
  );
}
