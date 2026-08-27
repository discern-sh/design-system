/**
 * Pure terminal renderer and deterministic example states for Logo cloud.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  joinVertical,
  layoutColumns,
  wrapInlineCluster,
} from "../../../cli/layout.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { marketingCliWidth, wrapMarketingCliText } from "../marketing-frame.ts";
import type { LogoCloudVariant } from "./logo-cloud.types.ts";
import meta, { componentExampleVocabulary } from "./logo-cloud.meta.ts";

/** Inputs accepted by the terminal Logo cloud renderer. */
export interface LogoCloudCliProps {
  readonly label?: string;
  readonly items: readonly string[];
  readonly theme?: TerminalThemeVariant;
  readonly variant?: LogoCloudVariant;
  readonly width?: number;
}

const cliExampleImplementations = [
  {
    name: "grid",
    props: {
      label: "Example organisations",
      items: [
        "Provider one",
        "Provider two",
        "Provider three",
        "Provider four",
      ],
      variant: "grid",
    },
  },
  {
    name: "strip",
    props: {
      label: "Available across example providers",
      items: [
        "Provider one",
        "Provider two",
        "Provider three",
        "Provider four",
      ],
      variant: "strip",
    },
  },
] as const satisfies readonly CliExample<LogoCloudCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Logo cloud states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<LogoCloudCliProps>[] =
  cliExampleImplementations;

/** Render a wrapping terminal name roll without pretending to reproduce marks. */
const renderLogoCloudCli: CliRenderer<LogoCloudCliProps> = (
  props,
  capabilities,
) => {
  if (
    props.items.length === 0 || props.items.some((item) => item.trim() === "")
  ) {
    throw new TypeError("logo cloud requires non-empty item names");
  }
  const width = marketingCliWidth(props.width, capabilities);
  const theme = terminalThemes[props.theme ?? "dark"];
  const mark = capabilities.unicode ? "◆" : "*";
  const entries = props.items.map((item) => `${mark} ${item}`);
  const variant = props.variant ?? "strip";
  const names = variant === "strip"
    ? wrapInlineCluster(entries, { columns: width, gap: 2 })
    : renderLogoCloudGrid(entries, width);
  return joinVertical([
    props.label === undefined ? "" : styleText(
      wrapMarketingCliText(props.label, width),
      theme.typography.annotation,
      capabilities,
    ),
    styleText(names, {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "neutral"),
    }, capabilities),
  ]);
};

function renderLogoCloudGrid(
  entries: readonly string[],
  width: number,
): string {
  const columnCount = Math.max(
    1,
    Math.min(entries.length, Math.floor((width + 2) / 16)),
  );
  const rows: string[] = [];
  for (let index = 0; index < entries.length; index += columnCount) {
    rows.push(layoutColumns(entries.slice(index, index + columnCount), {
      columns: width,
      gap: columnCount === 1 ? 0 : 2,
    }));
  }
  return joinVertical(rows);
}

export default renderLogoCloudCli;
