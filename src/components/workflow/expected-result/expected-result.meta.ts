import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Expected result",
  slug: "expected-result",
  group: "Workflow",
  order: 30,
  description:
    "Observable output or a stated end state that tells a reader how to recognise a successful command or procedure.",
  accessibility: [
    "The visible label names the excerpt as an expectation rather than verified live status.",
    "Output remains semantic preformatted code and its focusable region scrolls horizontally from the keyboard instead of wrapping.",
    "No success colour appears until a consumer has actually verified the outcome.",
  ],
} satisfies ComponentMeta;
