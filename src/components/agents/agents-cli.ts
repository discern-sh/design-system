/**
 * Internal text, width, and styling helpers for Agents CLI renderers.
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
export function agentsCliWidth(
  requested: number | undefined,
  capabilities: TerminalCapabilities,
  minimum = 12,
): number {
  const width = requested ?? capabilities.columns;
  if (!Number.isSafeInteger(width) || width < minimum) {
    throw new TypeError(
      `agents width must be a safe integer of at least ${minimum}; received ${width}`,
    );
  }
  const resolved = Math.min(width, capabilities.columns);
  if (resolved < minimum) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold this agent frame`,
    );
  }
  return resolved;
}

/** Validate caller-authored terminal text before it reaches an Agents frame. */
export function assertAgentsCliText(
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

/** Select the Token-derived theme used by one Agents frame. */
export function agentsCliTheme(
  options: CliPresentationOptions,
): TerminalTheme {
  return resolveTerminalTheme(options);
}

/** Style an Agents heading with a semantic Token-derived tone. */
export function styleAgentsHeading(
  value: string,
  tone: TerminalSemanticTone,
  capabilities: TerminalCapabilities,
  options: CliPresentationOptions,
): string {
  const theme = agentsCliTheme(options);
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
export function agentsPrefixedLines(
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

/** Wrap one labeled Agents fact with readable continuation lines. */
export function agentsFactLines(
  label: string,
  value: string,
  width: number,
): readonly string[] {
  const prefix = `${label}: `;
  if (width - measureText(prefix) < 10) {
    return [
      truncateText(`${label}:`, width),
      ...agentsPrefixedLines("  ", value, width),
    ];
  }
  return agentsPrefixedLines(prefix, value, width);
}

/** Indent and wrap a free-text Agents block. */
export function agentsIndentedLines(
  value: string,
  width: number,
  indent = 2,
): readonly string[] {
  return value.split("\n").flatMap((line) =>
    agentsPrefixedLines(" ".repeat(indent), line === "" ? " " : line, width)
  );
}
