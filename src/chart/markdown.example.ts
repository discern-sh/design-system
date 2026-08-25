/** Shared consumer-shaped Markdown chart example for Catalogue and tests. */

import { chartAltText } from "./accessibility.ts";
import { renderChartMarkdownImage } from "./markdown.ts";
import type { BarChartSpec } from "./kinds/bar/bar.spec.ts";

export const markdownChartExampleSpec = Object.freeze(
  {
    kind: "bar",
    title: "Reviews completed by weekday",
    summary: "Midweek days complete the most reviews.",
    categories: Object.freeze([
      Object.freeze({ id: "mon", label: "Monday" }),
      Object.freeze({ id: "wed", label: "Wednesday" }),
      Object.freeze({ id: "fri", label: "Friday" }),
    ]),
    series: Object.freeze([
      Object.freeze({
        id: "completed",
        label: "Completed",
        values: Object.freeze([4, 9, 6]),
      }),
    ]),
  } as const satisfies BarChartSpec,
);

export const markdownChartExampleSource =
  "/catalogue/generated/markdown-reviews-by-weekday.svg";
export const markdownChartExampleAlt = chartAltText(markdownChartExampleSpec);
export const markdownChartExampleResource = Object.freeze({
  source: markdownChartExampleSource,
  spec: markdownChartExampleSpec,
});
export const markdownChartExampleMarkdown = [
  "# Review throughput",
  "",
  renderChartMarkdownImage(markdownChartExampleResource),
  "",
  "Continue with the [review guide](guide.md#review).",
].join("\n");
