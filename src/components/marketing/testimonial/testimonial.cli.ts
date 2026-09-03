/**
 * Pure terminal renderer and deterministic example states for Testimonial.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type {
  CliExample,
  CliPresentationOptions,
  CliRenderer,
} from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { resolveTerminalTheme, terminalToneColor } from "../../../cli/theme.ts";
import type { TestimonialLayout } from "./testimonial.types.ts";
import { marketingCliWidth, wrapMarketingCliText } from "../marketing-frame.ts";
import meta, { componentExampleVocabulary } from "./testimonial.meta.ts";

/** Inputs accepted by the terminal Testimonial renderer. */
export interface TestimonialCliProps extends CliPresentationOptions {
  readonly quote: string;
  readonly author: string;
  readonly authorRole?: string;
  readonly eyebrow?: string;
  readonly metric?: string;
  readonly metricLabel?: string;
  readonly layout?: TestimonialLayout;
  readonly width?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: {
      eyebrow: "Example perspective",
      quote: "The shared evidence made the final review easier to follow.",
      author: "Project reviewer",
      authorRole: "Engineering lead",
      metric: "One",
      metricLabel: "clear recommendation",
    },
  },
] as const satisfies readonly CliExample<TestimonialCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Testimonial states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<TestimonialCliProps>[] =
  cliExampleImplementations;

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
  const theme = resolveTerminalTheme(props);
  return renderBox({
    body,
    title: "Testimonial",
    width,
    borderStyle: { color: terminalToneColor(theme, "accent") },
  }, capabilities);
};

export default renderTestimonialCli;
