/** The sample's guide: a small Markdown corpus the application opens on its own screen. */
import type {
  MarkdownBrowserEntry,
  MarkdownBrowserOptions,
  MarkdownBrowserResumableState,
} from "@discern-sh/design-system/cli/interactive";

/** Grouped guide pages about the sample, linked to one another. */
export const DEMO_GUIDE_ENTRIES: readonly MarkdownBrowserEntry<never>[] = [
  {
    kind: "group-heading",
    id: "using",
    label: "Using Studio",
    description: "How the sample's screen works",
  },
  {
    kind: "document",
    id: "jobs",
    label: "Jobs and groups",
    description: "What each group means and how rows move",
    path: "using/jobs.md",
    source: `# Jobs and groups

Studio lists jobs by what they need next: those **to review** first, then
those that need **attention**, then running, scheduled, idle, and paused jobs.

A job that finishes moves to its new group a moment after you stop pressing
keys, so a row never jumps under the selection. See [keys](keys.md) for every
key, and [sheets](sheets.md#confirming) for how a change is confirmed.

## Details

The detail beside the list follows the selection. Press Space to read it at
full width, and Page Up or Page Down to scroll it.`,
  },
  {
    kind: "document",
    id: "keys",
    label: "Keys",
    description: "One meaning per key, everywhere",
    path: "using/keys.md",
    source: `# Keys

| Key | Does |
| --- | --- |
| Enter | Runs the selected job |
| . | Opens the actions menu |
| Ctrl+K | Opens the command palette |
| / | Filters the list |
| g | Opens this guide |
| q | Quits |

Escape always closes the nearest thing and never quits. Back to
[jobs and groups](jobs.md).`,
  },
  {
    kind: "document",
    id: "sheets",
    label: "Sheets",
    description: "Reading a change before it happens",
    path: "using/sheets.md",
    source: `# Sheets

A sheet states what a change does before it does it.

## Confirming

A sheet opens on its safe choice. A confirm button waits until every line of
the sheet has been on screen, and a destructive one until you type its name.`,
  },
];

/** The guide's options, resuming where the reader left it. */
export function demoGuideOptions(
  mouse: boolean,
  initialState?: MarkdownBrowserResumableState,
): MarkdownBrowserOptions<never> {
  return {
    label: "Studio guide",
    entries: DEMO_GUIDE_ENTRIES,
    mouse,
    ...(initialState === undefined ? {} : { initialState }),
    resolveLink: ({ destination, availableDocuments }) => {
      const [path = "", fragment] = destination.split("#");
      const document = availableDocuments.find((candidate) =>
        candidate.path === `using/${path}`
      );
      return document === undefined ? { kind: "unresolved" } : {
        kind: "document",
        documentId: document.id,
        ...(fragment === undefined ? {} : { fragment }),
      };
    },
  };
}
