/**
 * Pure terminal renderer and deterministic example states for CTA band.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { CtaBandAlign, CtaBandTone } from "./cta-band.types.ts";
import { marketingCliWidth, wrapMarketingCliText } from "../marketing-frame.ts";
import meta, { componentExampleVocabulary } from "./cta-band.meta.ts";

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

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      eyebrow: "Continue",
      title: "Make the next step clear.",
      description:
        "Pair one direct invitation with a quieter alternative and a short reassurance.",
      actions: ["Primary action", "Secondary action"],
      note: "Add a short reassurance when it helps the decision.",
    },
  },
] as const satisfies readonly CliExample<CtaBandCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic CTA band states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<CtaBandCliProps>[] =
  cliExampleImplementations;

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
