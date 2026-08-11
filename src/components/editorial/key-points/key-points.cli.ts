/**
 * Pure terminal renderer and deterministic example states for Key points.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { measureText, wrapText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { KeyPointsTone } from "./key-points.types.ts";

/** One terminal Key points entry. */
export interface KeyPointCliItem {
  readonly title: string;
  readonly description: string;
}

/** Inputs accepted by the terminal Key points renderer. */
export interface KeyPointsCliProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly items: readonly KeyPointCliItem[];
  readonly tone?: KeyPointsTone;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Key points states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<KeyPointsCliProps>[] = [
  {
    name: "brief",
    props: {
      eyebrow: "The brief",
      title: "Ideas to carry into the work",
      items: [
        {
          title: "Begin with evidence",
          description: "Observe the real state before proposing a change.",
        },
        {
          title: "Leave a trace",
          description: "Preserve what the next reader will need.",
        },
      ],
    },
  },
] as const;

const TONES = {
  accent: "accent",
  sunken: "neutral",
  contrast: "neutral",
} as const;

function hanging(prefix: string, value: string, width: number): string {
  const available = width - measureText(prefix);
  const lines = wrapText(value, Math.max(1, available));
  return lines.map((line, index) =>
    `${index === 0 ? prefix : " ".repeat(measureText(prefix))}${line}`
  ).join("\n");
}

/** Render an ordered editorial brief with hanging descriptions. */
const renderKeyPointsCli: CliRenderer<KeyPointsCliProps> = (
  props,
  capabilities,
) => {
  if (props.title.trim() === "" || props.items.length === 0) {
    throw new TypeError("key points title and items must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 10) {
    throw new TypeError(
      `key points width must be a safe integer of at least 10; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const theme = terminalThemes[props.theme ?? "dark"];
  const semanticTone = TONES[props.tone ?? "accent"];
  const blocks: string[] = [];
  if (props.eyebrow !== undefined) {
    blocks.push(styleText(props.eyebrow.toLocaleUpperCase(), {
      ...theme.typography.annotation,
      color: terminalToneColor(theme, semanticTone),
    }, capabilities));
  }
  blocks.push(styleText(wrapText(props.title, width).join("\n"), {
    ...theme.typography.display,
    color: terminalThemeColor(theme, "--discern-color-ink"),
  }, capabilities));
  const digits = Math.max(2, String(props.items.length).length);
  for (const [index, item] of props.items.entries()) {
    const number = String(index + 1).padStart(digits, "0");
    const prefix = `${number}  `;
    const title = hanging(prefix, item.title, width);
    const description = hanging(
      " ".repeat(measureText(prefix)),
      item.description,
      width,
    );
    blocks.push(joinVertical([
      styleText(title, {
        ...theme.typography.strong,
        color: terminalToneColor(theme, semanticTone),
      }, capabilities),
      description,
    ]));
  }
  return joinVertical(blocks, { spacing: 1 });
};

export default renderKeyPointsCli;
