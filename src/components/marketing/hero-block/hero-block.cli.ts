/**
 * Pure terminal renderer and deterministic example states for Hero block.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
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
import { renderMotifDivider } from "../../../cli/motifs.ts";
import type { HeroBlockLayout, HeroBlockSurface } from "./hero-block.types.ts";
import { marketingCliWidth, wrapMarketingCliText } from "../marketing-frame.ts";
import meta, { componentExampleVocabulary } from "./hero-block.meta.ts";

/** Inputs accepted by the terminal Hero block renderer. */
export interface HeroBlockCliProps extends TerminalMotifOptions {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly actions?: readonly string[];
  readonly meta?: string;
  readonly visual?: string;
  readonly layout?: HeroBlockLayout;
  readonly surface?: HeroBlockSurface;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

const cliExampleImplementations = [
  {
    name: "split",
    props: {
      eyebrow: "New collection",
      title: "Make the complicated feel inevitable.",
      description:
        "A flexible opening composition for a clear promise, an immediate next step, and one memorable piece of evidence.",
      actions: ["Start exploring", "See the details"],
      meta: "Primary action · secondary action · optional note",
      visual:
        "A useful example view\nFlexible visual slot\nWindows, diagrams, screenshots, code, or editorial artwork.",
      layout: "split",
      surface: "accent",
    },
  },
  {
    name: "showcase",
    props: {
      eyebrow: "For people doing consequential work",
      title: "A bolder way to build.",
      description:
        "Give a substantial idea the scale, evidence, and working space it needs without changing the rest of the interface.",
      actions: ["See it in practice", "Read the method"],
      meta: "One clear promise · one substantial piece of evidence",
      visual:
        "project · ready for review\nevidence ready\nWide visual evidence remains the final word.\nThe showcase layout gives a supporting preview room to breathe beneath the opening promise.",
      layout: "showcase",
      surface: "atmospheric",
    },
  },
] as const satisfies readonly CliExample<HeroBlockCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Hero block states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<HeroBlockCliProps>[] =
  cliExampleImplementations;

/** Render a terminal title banner beneath a quiet leading-marker rule. */
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
    props.visual === undefined || props.layout === "showcase"
      ? ""
      : joinVertical([
        "Visual",
        wrapMarketingCliText(props.visual, bodyWidth),
      ]),
  ], { spacing: 1 });
  const hero = renderBox({
    body,
    title: "Hero",
    width,
    borderStyle: { color: terminalToneColor(theme, semanticTone) },
  }, capabilities);
  const evidence = props.visual === undefined || props.layout !== "showcase"
    ? ""
    : renderBox({
      body: wrapMarketingCliText(props.visual, bodyWidth),
      title: "Evidence",
      width,
      borderStyle: { color: terminalToneColor(theme, "neutral") },
    }, capabilities);
  return joinVertical([
    renderMotifDivider({
      width,
      alignment: "start",
      tone: semanticTone,
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      ...motifPassthrough(props),
    }, { ...capabilities, columns: width }),
    joinVertical([hero, evidence], { spacing: evidence === "" ? 0 : 1 }),
  ]);
};

export default renderHeroBlockCli;
