/**
 * Shared React-free text hierarchy for Marketing CLI renderers.
 *
 * @module
 */

import { styleText } from "../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../cli/capabilities.ts";
import { joinVertical } from "../../cli/layout.ts";
import { wrapText } from "../../cli/text.ts";
import {
  type TerminalSemanticTone,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../cli/theme.ts";

/** Shared heading inputs for a terminal Marketing section. */
export interface MarketingCliHeaderOptions {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly tone?: TerminalSemanticTone;
  readonly theme?: TerminalThemeVariant;
  readonly width: number;
}

/** Resolve and validate a bounded width for a Marketing CLI frame. */
export function marketingCliWidth(
  requested: number | undefined,
  capabilities: TerminalCapabilities,
  maximum = 72,
): number {
  const width = Math.min(requested ?? maximum, capabilities.columns, maximum);
  if (!Number.isSafeInteger(width) || width < 12) {
    throw new TypeError(
      `marketing frame width must be a safe integer of at least 12; received ${width}`,
    );
  }
  return width;
}

/** Wrap plain content without losing its intentional paragraph boundaries. */
export function wrapMarketingCliText(value: string, width: number): string {
  return value.split("\n").flatMap((line) => wrapText(line, width)).join("\n");
}

/** Render the shared eyebrow, title, and description hierarchy. */
export function renderMarketingCliHeader(
  options: MarketingCliHeaderOptions,
  capabilities: TerminalCapabilities,
): string {
  if (options.title.trim() === "") {
    throw new TypeError("marketing frame title must be non-empty");
  }
  const theme = terminalThemes[options.theme ?? "dark"];
  const tone = options.tone ?? "accent";
  return joinVertical([
    options.eyebrow === undefined ? "" : styleText(
      wrapMarketingCliText(options.eyebrow, options.width),
      theme.typography.annotation,
      capabilities,
    ),
    styleText(
      wrapMarketingCliText(options.title, options.width),
      {
        ...theme.typography.display,
        color: terminalToneColor(theme, tone),
      },
      capabilities,
    ),
    options.description === undefined ? "" : styleText(
      wrapMarketingCliText(options.description, options.width),
      theme.typography.muted,
      capabilities,
    ),
  ]);
}
