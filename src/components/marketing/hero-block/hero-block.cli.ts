/**
 * Pure terminal renderer and deterministic example states for Hero block.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { renderMotifPattern } from "../../../cli/motifs.ts";
import type { HeroBlockLayout, HeroBlockSurface } from "./hero-block.types.ts";
import { marketingCliWidth, wrapMarketingCliText } from "../marketing-frame.ts";

/** Inputs accepted by the terminal Hero block renderer. */
export interface HeroBlockCliProps extends TerminalMotifOptions {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly actions?: readonly string[];
  readonly meta?: string;
  readonly layout?: HeroBlockLayout;
  readonly surface?: HeroBlockSurface;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Hero block states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<HeroBlockCliProps>[] = [
  {
    name: "opening",
    props: {
      eyebrow: "New collection",
      title: "Make the complicated feel inevitable",
      description: "One clear system from first decision to final proof.",
      actions: ["See the details", "Get started"],
      meta: "Built for careful work.",
    },
  },
] as const;

/** Render a terminal title banner beneath the effective motif weave. */
const renderHeroBlockCli: CliRenderer<HeroBlockCliProps> = (
  props,
  capabilities,
) => {
  if (props.title.trim() === "") {
    throw new TypeError("hero block title must be non-empty");
  }
  const width = marketingCliWidth(props.width, capabilities);
  const theme = terminalThemes[props.theme ?? "dark"];
  const semanticTone = props.surface === "sunken" ? "neutral" : "accent";
  const bodyWidth = width - 4;
  const body = joinVertical([
    props.eyebrow === undefined
      ? ""
      : wrapMarketingCliText(props.eyebrow, bodyWidth),
    wrapMarketingCliText(props.title, bodyWidth),
    props.description === undefined
      ? ""
      : wrapMarketingCliText(props.description, bodyWidth),
    props.actions?.length
      ? props.actions.map((action) => `[${action}]`).join("  ")
      : "",
    props.meta === undefined ? "" : wrapMarketingCliText(props.meta, bodyWidth),
  ], { spacing: 1 });
  return joinVertical([
    renderMotifPattern({
      length: width,
      tone: semanticTone,
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      ...motifPassthrough(props),
    }, { ...capabilities, columns: width }),
    renderBox({
      body,
      title: "Hero",
      width,
      borderStyle: { color: terminalToneColor(theme, semanticTone) },
    }, capabilities),
  ]);
};

export default renderHeroBlockCli;
