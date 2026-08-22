/**
 * Generic design-system fixture content for playground journeys. Everything
 * here stays product-neutral: token roles, spacing steps, and motif names
 * rather than any consumer's state, routes, or commands.
 *
 * @module
 */

import {
  filterInteractionEntries,
  type InteractionChoice,
  type InteractionEntry,
  type MarkdownBrowserEntry,
} from "../../src/cli/interactive/mod.ts";

/** Flat swatch list with duplicate visible labels and one disabled entry. */
export const swatchChoices = [
  { id: "amber", label: "Amber", value: "amber" },
  { id: "azure", label: "Azure", value: "azure" },
  { id: "citrine", label: "Citrine", value: "citrine" },
  { id: "neutral-cool", label: "Neutral", value: "neutral-cool" },
  { id: "neutral-warm", label: "Neutral", value: "neutral-warm" },
  { id: "cobalt", label: "Cobalt (retired)", value: "cobalt", disabled: true },
] as const satisfies readonly InteractionChoice<string>[];

/** Flat spacing steps used by the multiselect journey's initial selection. */
export const spacingChoices = [
  { id: "space-1", label: "Space 1 — hairline", value: "space-1" },
  { id: "space-2", label: "Space 2 — compact", value: "space-2" },
  { id: "space-3", label: "Space 3 — cozy", value: "space-3" },
  { id: "space-4", label: "Space 4 — default", value: "space-4" },
  { id: "space-6", label: "Space 6 — roomy", value: "space-6" },
  { id: "space-8", label: "Space 8 — expansive", value: "space-8" },
] as const satisfies readonly InteractionChoice<string>[];

/** Grouped semantic roles with headings and one disabled reserved entry. */
export const tokenRoleChoices = [
  {
    kind: "group-heading",
    id: "heading-surface-roles",
    label: "Surface roles",
  },
  { id: "canvas", label: "Canvas", value: "canvas" },
  { id: "canvas-raised", label: "Canvas raised", value: "canvas-raised" },
  { id: "ink", label: "Ink", value: "ink" },
  { kind: "group-heading", id: "heading-signal-roles", label: "Signal roles" },
  { id: "accent", label: "Accent", value: "accent" },
  { id: "success", label: "Success", value: "success" },
  { id: "warning", label: "Warning", value: "warning" },
  { id: "danger", label: "Danger", value: "danger" },
  {
    id: "inverse",
    label: "Inverse (reserved)",
    value: "inverse",
    disabled: true,
  },
] as const satisfies readonly InteractionEntry<string>[];

/** Document-shaped choices that exercise semantic titles and quieter paths. */
export const documentChoices = [
  {
    kind: "group-heading",
    id: "heading-orientation",
    label: "Orientation",
    description: "00-orientation/",
  },
  {
    id: "design-principles",
    label: "Design principles",
    description: "design-principles.md",
    value: "00-orientation/design-principles.md",
  },
  {
    id: "cli-rendering",
    label: "CLI rendering",
    description: "70-cli/README.md",
    value: "70-cli/README.md",
  },
  {
    kind: "group-heading",
    id: "heading-decisions",
    label: "Architecture decisions",
    description: "_adr/",
  },
  {
    id: "semantic-inline",
    label: "Own semantic inline content",
    description: "0019-own-semantic-inline-content.md",
    value: "_adr/0019-own-semantic-inline-content.md",
  },
  {
    id: "legacy-terminal-contract",
    label: "Legacy terminal contract",
    description: "0002-react-free-cli-renderer-contract.md",
    value: "_adr/0002-react-free-cli-renderer-contract.md",
    disabled: true,
  },
] as const satisfies readonly InteractionEntry<string>[];

/** Grouped caller-owned Markdown and explicit actions for the reader journey. */
export const markdownBrowserEntries = [
  {
    kind: "group-heading",
    id: "guides",
    label: "Guides",
    description: "Practical package integration guides",
  },
  {
    kind: "document",
    id: "getting-started",
    label: "Getting started",
    description: "A complete keyboard reading walkthrough",
    path: "guides/getting-started.md",
    source: `# Getting started

Search the grouped picker, then press Enter to open a document.

> The picker and document keep independent scroll positions.

## Keyboard

- Type to search while the picker has focus.
- Use **Tab** and **Shift+Tab** to move between panes.
- Use Page Up, Page Down, Home, and End in the focused pane.
- Use **]** and **[** to traverse links; Enter follows the focused link.
- Press Escape or \`q\` in the document to return to the full-height picker.

[Jump to links and mouse](#links-and-mouse), [open the testing guide](testing.md#fake-terminal), or return an [external destination](https://example.test/design-system/reader).

| Terminal | Layout |
| --- | --- |
| Ordinary height | Split picker and reader |
| Constrained height | One focused pane |

## Links and mouse

Keyboard access is complete. Optional mouse tracking adds picker clicks, link activation, and pane-local wheel scrolling.

${
      Array.from(
        { length: 24 },
        (_, index) =>
          `Reading landmark ${index + 1} remains meaningful after rewrapping.`,
      ).join("\n\n")
    }`,
  },
  {
    kind: "document",
    id: "testing",
    label: "Testing the interaction",
    description: "Scripted keys, resizes, and restoration",
    path: "guides/testing.md",
    source: `# Testing the interaction

## Fake terminal

Drive the real adapter with a fake terminal and semantic resize and mouse events.

\`\`\`ts
enqueueTerminalEvents(io, events);
io.enqueueMouse(mouseEvent);
await requestMarkdownBrowser(options, { io });
\`\`\`

Assert the typed result only after the terminal has been restored.`,
  },
  {
    kind: "group-heading",
    id: "actions",
    label: "Actions",
    description: "Return to the caller before performing an effect",
  },
  {
    kind: "action",
    id: "read-online",
    label: "Read the docs online",
    description: "The playground reports the returned action only",
    value: "read-online",
  },
  {
    kind: "exit",
    id: "quit",
    label: "Quit",
    description: "Leave the Markdown browser",
  },
] as const satisfies readonly MarkdownBrowserEntry<string>[];

/**
 * Long grouped list: 26 selectable entries across four headed groups, with a
 * cross-group duplicate label ("Divider") under distinct stable IDs and one
 * disabled entry, for viewport and repeated-navigation stress.
 */
export const longGroupedChoices = [
  { kind: "group-heading", id: "heading-foundations", label: "Foundations" },
  { id: "foundations-canvas", label: "Canvas", value: "foundations/canvas" },
  { id: "foundations-ink", label: "Ink", value: "foundations/ink" },
  { id: "foundations-accent", label: "Accent", value: "foundations/accent" },
  { id: "foundations-success", label: "Success", value: "foundations/success" },
  { id: "foundations-warning", label: "Warning", value: "foundations/warning" },
  { id: "foundations-danger", label: "Danger", value: "foundations/danger" },
  { id: "foundations-divider", label: "Divider", value: "foundations/divider" },
  { kind: "group-heading", id: "heading-spacing", label: "Spacing" },
  { id: "spacing-space-1", label: "Space 1", value: "spacing/space-1" },
  { id: "spacing-space-2", label: "Space 2", value: "spacing/space-2" },
  { id: "spacing-space-3", label: "Space 3", value: "spacing/space-3" },
  { id: "spacing-space-4", label: "Space 4", value: "spacing/space-4" },
  { id: "spacing-space-6", label: "Space 6", value: "spacing/space-6" },
  {
    id: "spacing-space-8",
    label: "Space 8 (retired)",
    value: "spacing/space-8",
    disabled: true,
  },
  { kind: "group-heading", id: "heading-typography", label: "Typography" },
  { id: "typography-display", label: "Display", value: "typography/display" },
  { id: "typography-heading", label: "Heading", value: "typography/heading" },
  { id: "typography-body", label: "Body", value: "typography/body" },
  { id: "typography-caption", label: "Caption", value: "typography/caption" },
  { id: "typography-code", label: "Code", value: "typography/code" },
  {
    id: "typography-annotation",
    label: "Annotation",
    value: "typography/annotation",
  },
  { kind: "group-heading", id: "heading-motifs", label: "Motifs" },
  { id: "motifs-rule", label: "Rule", value: "motifs/rule" },
  { id: "motifs-ribbon", label: "Ribbon", value: "motifs/ribbon" },
  { id: "motifs-weave", label: "Weave", value: "motifs/weave" },
  { id: "motifs-spinner", label: "Spinner", value: "motifs/spinner" },
  { id: "motifs-beacon", label: "Beacon", value: "motifs/beacon" },
  { id: "motifs-divider", label: "Divider", value: "motifs/divider" },
] as const satisfies readonly InteractionEntry<string>[];

/**
 * Grapheme, width, and duplication stress: multi-codepoint clusters,
 * combining marks, wide CJK, duplicate visible labels, and long labels.
 * ZWJ-joined emoji stay out deliberately: the package rejects
 * control/format characters (including U+200D) in choice labels.
 */
export const unicodeStressChoices = [
  {
    kind: "group-heading",
    id: "heading-graphemes",
    label: "Grapheme clusters",
  },
  { id: "flag-pair", label: "🇯🇵 Regional flag pair", value: "flag-pair" },
  { id: "modifier", label: "👍🏽 Skin-tone modifier", value: "modifier" },
  { id: "combining", label: "Décor (combining mark)", value: "combining" },
  { id: "cjk", label: "設計システムの選択肢", value: "cjk" },
  {
    kind: "group-heading",
    id: "heading-duplicates",
    label: "Duplicate labels",
  },
  { id: "duplicate-first", label: "Neutral swatch", value: "duplicate-first" },
  {
    id: "duplicate-second",
    label: "Neutral swatch",
    value: "duplicate-second",
  },
  { kind: "group-heading", id: "heading-width", label: "Width stress" },
  {
    id: "long-label",
    label:
      "A deliberately long label that keeps going well past a narrow viewport to show truncation and wrapping behaviour",
    value: "long-label",
  },
  {
    id: "wide-emoji",
    label: "🎨🧵🔺🔻🎯 Wide emoji run beside 全角文字",
    value: "wide-emoji",
  },
] as const satisfies readonly InteractionEntry<string>[];

/** Token-name candidates for the autocomplete journey's ghost completion. */
export const tokenNameSuggestions = [
  "accent",
  "accent-strong",
  "canvas",
  "canvas-raised",
  "danger",
  "ink",
  "ink-muted",
  "space-2",
  "success",
  "warning",
] as const;

/**
 * Keep async Playground providers around the package-owned static matcher,
 * which matches labels and descriptions while retaining group structure.
 */
export function searchGroupedEntries<T>(
  entries: readonly InteractionEntry<T>[],
  query: string,
): readonly InteractionEntry<T>[] {
  return filterInteractionEntries(entries, query.trim());
}
