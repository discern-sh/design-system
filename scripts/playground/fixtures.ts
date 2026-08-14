/**
 * Generic design-system fixture content for playground journeys. Everything
 * here stays product-neutral: token roles, spacing steps, and motif names
 * rather than any consumer's state, routes, or commands.
 *
 * @module
 */

import type {
  InteractionChoice,
  InteractionEntry,
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
 * Filter grouped entries by a case-insensitive label match, keeping each
 * group heading exactly when at least one of its choices matches.
 */
export function searchGroupedEntries<T>(
  entries: readonly InteractionEntry<T>[],
  query: string,
): readonly InteractionEntry<T>[] {
  const needle = query.trim().toLocaleLowerCase();
  const results: InteractionEntry<T>[] = [];
  let pendingHeading: InteractionEntry<T> | undefined;
  for (const entry of entries) {
    if (entry.kind === "group-heading") {
      pendingHeading = entry;
      continue;
    }
    if (needle === "" || entry.label.toLocaleLowerCase().includes(needle)) {
      if (pendingHeading !== undefined) {
        results.push(pendingHeading);
        pendingHeading = undefined;
      }
      results.push(entry);
    }
  }
  return results;
}
