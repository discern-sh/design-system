/**
 * Pure terminal renderer and deterministic example states for Timeline.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { terminalMotifRepertoire } from "../../../cli/motif.ts";
import { measureText, wrapText } from "../../../cli/text.ts";
import {
  resolveTerminalTheme,
  terminalThemeColor,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./timeline.meta.ts";
import type { TimelineStatus } from "./timeline.types.ts";

/** One terminal Timeline event. */
export interface TimelineCliItem {
  readonly date: string;
  readonly title: string;
  readonly description: string;
  readonly detail?: string;
  readonly status?: TimelineStatus;
}

/** Inputs accepted by the terminal Timeline renderer. */
export interface TimelineCliProps extends CliPresentationOptions {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly items: readonly TimelineCliItem[];
  readonly maxWidth?: number;
}

const cliExampleImplementations = [{
  name: "default",
  props: {
    eyebrow: "Publication history",
    title: "A feature from draft to print.",
    items: [
      {
        date: "Week 01",
        title: "Draft",
        description: "The initial outline is complete.",
        status: "complete",
      },
      {
        date: "Week 03",
        title: "Edit",
        description: "Supporting details are under review.",
        status: "current",
      },
      {
        date: "Week 06",
        title: "Publish",
        description: "Final copy is scheduled.",
      },
    ],
  },
}] as const satisfies readonly CliExample<TimelineCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Timeline states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<TimelineCliProps>[] =
  cliExampleImplementations;

const STATUS_TONES = {
  complete: "success",
  current: "accent",
  upcoming: "neutral",
} as const;

function hanging(
  prefix: string,
  value: string,
  width: number,
): readonly string[] {
  const lines = wrapText(value, Math.max(1, width - measureText(prefix)));
  return lines.map((line, index) =>
    `${index === 0 ? prefix : " ".repeat(measureText(prefix))}${line}`
  );
}

/** Render a status-explicit vertical Timeline using the effective motif. */
const renderTimelineCli: CliRenderer<TimelineCliProps> = (
  props,
  capabilities,
) => {
  if (props.title.trim() === "" || props.items.length === 0) {
    throw new TypeError("timeline title and items must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 12) {
    throw new TypeError(
      `timeline width must be a safe integer of at least 12; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const theme = resolveTerminalTheme(props);
  const blocks: string[] = [];
  if (props.eyebrow !== undefined) {
    blocks.push(styleText(props.eyebrow.toLocaleUpperCase(), {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-accent-700"),
    }, capabilities));
  }
  blocks.push(styleText(wrapText(props.title, width).join("\n"), {
    ...theme.typography.display,
    color: terminalThemeColor(theme, "--discern-color-ink"),
  }, capabilities));
  if (props.description !== undefined) {
    blocks.push(wrapText(props.description, width).join("\n"));
  }
  const separator = capabilities.unicode ? " — " : " - ";
  const rail = capabilities.unicode ? "│" : "|";
  const events = props.items.map((item, index) => {
    const status = item.status ?? "upcoming";
    const repertoire = terminalMotifRepertoire(
      props.motif,
      capabilities.unicode,
    );
    const marker = styleText(
      status === "complete"
        ? repertoire.status.complete
        : repertoire.status.incomplete,
      { color: terminalToneColor(theme, STATUS_TONES[status]) },
      capabilities,
    );
    const label = `${item.date}${separator}${item.title} [${status}]`;
    const labelLines = hanging("  ", label, width);
    const header = `${marker}${labelLines[0]?.slice(1) ?? ""}`;
    const continuing = index < props.items.length - 1;
    const contentPrefix = continuing ? `${rail}   ` : "    ";
    const content = hanging(contentPrefix, item.description, width);
    const lines = [header, ...labelLines.slice(1), ...content];
    if (item.detail !== undefined) {
      lines.push(styleText(
        hanging(contentPrefix, item.detail, width).join("\n"),
        {
          ...theme.typography.annotation,
          color: terminalThemeColor(theme, "--discern-color-ink-muted"),
        },
        capabilities,
      ));
    }
    if (continuing) lines.push(rail);
    return lines.join("\n");
  });
  blocks.push(events.join("\n"));
  return joinVertical(blocks, { spacing: 1 });
};

export default renderTimelineCli;
