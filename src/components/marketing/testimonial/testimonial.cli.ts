/**
 * Pure terminal renderer and deterministic example states for Testimonial.
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
import type { TestimonialLayout } from "./testimonial.types.ts";
import { marketingCliWidth, wrapMarketingCliText } from "../marketing-frame.ts";

/** Inputs accepted by the terminal Testimonial renderer. */
export interface TestimonialCliProps {
  readonly quote: string;
  readonly author: string;
  readonly authorRole?: string;
  readonly eyebrow?: string;
  readonly metric?: string;
  readonly metricLabel?: string;
  readonly layout?: TestimonialLayout;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Testimonial states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<TestimonialCliProps>[] = [
  {
    name: "wide",
    props: {
      eyebrow: "In their words",
      quote: "The evidence made every review calmer.",
      author: "A. Reviewer",
      authorRole: "Engineering lead",
      metric: "42%",
      metricLabel: "less rework",
    },
  },
] as const;

/** Render an attributed terminal quotation with an optional outcome metric. */
const renderTestimonialCli: CliRenderer<TestimonialCliProps> = (
  props,
  capabilities,
) => {
  if (props.quote.trim() === "" || props.author.trim() === "") {
    throw new TypeError("testimonial quote and author must be non-empty");
  }
  const width = marketingCliWidth(props.width, capabilities);
  const innerWidth = width - 4;
  const quote = capabilities.unicode ? `“${props.quote}”` : `"${props.quote}"`;
  const attribution = `${capabilities.unicode ? "—" : "--"} ${props.author}${
    props.authorRole === undefined ? "" : `, ${props.authorRole}`
  }`;
  const story = joinVertical([
    props.eyebrow ?? "",
    wrapMarketingCliText(quote, innerWidth),
    wrapMarketingCliText(attribution, innerWidth),
  ], { spacing: 1 });
  const metric = props.metric === undefined
    ? ""
    : joinVertical([props.metric, props.metricLabel ?? ""]);
  const body = joinVertical([story, metric], { spacing: 1 });
  const theme = terminalThemes[props.theme ?? "dark"];
  return renderBox({
    body,
    title: "Testimonial",
    width,
    borderStyle: { color: terminalToneColor(theme, "accent") },
  }, capabilities);
};

export default renderTestimonialCli;
