/**
 * Pure terminal renderer and deterministic example states for CTA band.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { CtaBandAlign, CtaBandTone } from "./cta-band.types.ts";
import { marketingCliWidth, wrapMarketingCliText } from "../marketing-frame.ts";

/** Inputs accepted by the terminal CTA band renderer. */
export interface CtaBandCliProps {
  readonly title: string;
  readonly description?: string;
  readonly eyebrow?: string;
  readonly actions?: readonly string[];
  readonly note?: string;
  readonly tone?: CtaBandTone;
  readonly align?: CtaBandAlign;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic CTA band states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<CtaBandCliProps>[] = [
  {
    name: "accent",
    props: {
      eyebrow: "Ready when you are",
      title: "Turn the next project into the new standard",
      description: "Start with one workflow and keep the proof.",
      actions: ["Get started", "Read the guide"],
      note: "No hidden setup.",
    },
  },
] as const;

/** Render one high-emphasis boxed terminal call to action. */
const renderCtaBandCli: CliRenderer<CtaBandCliProps> = (
  props,
  capabilities,
) => {
  if (props.title.trim() === "") {
    throw new TypeError("CTA band title must be non-empty");
  }
  const width = marketingCliWidth(props.width, capabilities);
  const tone = props.tone ?? "accent";
  const semanticTone = tone === "sunken" ? "neutral" : "accent";
  const theme = terminalThemes[props.theme ?? "dark"];
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
    props.note === undefined ? "" : wrapMarketingCliText(props.note, bodyWidth),
  ], { spacing: 1 });
  return renderBox({
    body,
    title: "Call to action",
    width,
    borderStyle: { color: terminalToneColor(theme, semanticTone) },
  }, capabilities);
};

export default renderCtaBandCli;
