import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Expected result",
  slug: "expected-result",
  group: "Workflow",
  order: 30,
  cli: { stance: "rendered" },
  description:
    "Observable output or a stated end state that tells a reader how to recognise a successful command or procedure.",
  purposes: [
    "building-documentation",
    "displaying-tool-output",
    "procedural-workflow",
  ],
  useWhen: [
    "A command or procedure needs observable proof that tells the reader what success should look like.",
  ],
  notWhen: [
    "The outcome has already been measured; use Result summary for a run or Verification report for a multi-check record.",
  ],
  accessibility: [
    "The visible label names the excerpt as an expectation rather than verified live status.",
    "Output remains semantic preformatted code and its focusable region scrolls horizontally from the keyboard instead of wrapping.",
    "No success colour appears until a consumer has actually verified the outcome.",
  ],
} satisfies ComponentMeta;
