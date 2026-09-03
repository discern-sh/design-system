/**
 * Internal text, width, and styling helpers for Workflow CLI renderers.
 *
 * @module
 */

import { styleText } from "../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../cli/capabilities.ts";
import type { CliPresentationOptions } from "../../cli/contracts.ts";
import { measureText, truncateText, wrapText } from "../../cli/text.ts";
import {
  resolveTerminalTheme,
  type TerminalSemanticTone,
  type TerminalTheme,
  terminalToneColor,
} from "../../cli/theme.ts";

/** Resolve a caller width against the terminal and reject unusable frames. */
export function workflowCliWidth(
  requested: number | undefined,
  capabilities: TerminalCapabilities,
  minimum = 12,
): number {
  const width = requested ?? capabilities.columns;
  if (!Number.isSafeInteger(width) || width < minimum) {
    throw new TypeError(
      `workflow width must be a safe integer of at least ${minimum}; received ${width}`,
    );
  }
  const resolved = Math.min(width, capabilities.columns);
  if (resolved < minimum) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold this workflow frame`,
    );
  }
  return resolved;
}

/** Validate caller-authored terminal text before it reaches a frame. */
export function assertWorkflowCliText(
  value: string,
  name: string,
  multiline = false,
): void {
  const checked = multiline
    ? value.replaceAll("\n", "").replaceAll("\t", "")
    : value;
  if (value === "" || /[\p{Cc}\p{Cf}]/u.test(checked)) {
    throw new TypeError(
      `${name} must be non-empty and ${
        multiline ? "terminal-safe" : "control-free"
      }`,
    );
  }
}

/** Select the Token-derived theme used by one Workflow frame. */
export function workflowCliTheme(
  options: CliPresentationOptions,
): TerminalTheme {
  return resolveTerminalTheme(options);
}

/** Style a Workflow heading with a semantic Token-derived tone. */
export function styleWorkflowHeading(
  value: string,
  tone: TerminalSemanticTone,
  capabilities: TerminalCapabilities,
  options: CliPresentationOptions,
): string {
  const theme = workflowCliTheme(options);
  return styleText(
    value,
    {
      ...theme.typography.strong,
      color: terminalToneColor(theme, tone),
    },
    capabilities,
  );
}

/** Wrap one value after a fixed visible prefix. */
export function workflowPrefixedLines(
  prefix: string,
  value: string,
  width: number,
): readonly string[] {
  const prefixWidth = measureText(prefix);
  if (prefixWidth >= width) {
    return [truncateText(`${prefix}${value}`, width)];
  }
  const available = width - prefixWidth;
  const lines = value.split("\n").flatMap((line) => wrapText(line, available));
  const resolved = lines.length === 0 ? [""] : lines;
  return resolved.map((line, index) =>
    `${index === 0 ? prefix : " ".repeat(prefixWidth)}${line}`
  );
}

/** Wrap one labeled Workflow fact with aligned continuation lines. */
export function workflowFactLines(
  label: string,
  value: string,
  width: number,
): readonly string[] {
  const prefix = `${label}: `;
  if (width - measureText(prefix) < 10) {
    return [
      truncateText(`${label}:`, width),
      ...workflowPrefixedLines("  ", value, width),
    ];
  }
  return workflowPrefixedLines(prefix, value, width);
}

/** Indent and wrap a free-text Workflow block. */
export function workflowIndentedLines(
  value: string,
  width: number,
  indent = 2,
): readonly string[] {
  const prefix = " ".repeat(indent);
  return value.split("\n").flatMap((line) =>
    workflowPrefixedLines(prefix, line === "" ? " " : line, width)
  );
}

/** Preserve a path's terminal segment when a terminal frame narrows. */
export function workflowPathText(
  path: string,
  width: number,
  capabilities: TerminalCapabilities,
): string {
  if (measureText(path) <= width) return path;
  const separator = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const suffix = separator < 0 ? path : path.slice(separator + 1);
  const prefix = separator < 0 ? "" : path.slice(0, separator + 1);
  const marker = capabilities.unicode ? "…/" : ".../";
  if (measureText(marker) + measureText(suffix) <= width) {
    const prefixWidth = width - measureText(marker) - measureText(suffix);
    return `${truncateText(prefix, prefixWidth, "")}${marker}${suffix}`;
  }
  return truncateText(suffix, width, capabilities.unicode ? "…" : ".");
}
