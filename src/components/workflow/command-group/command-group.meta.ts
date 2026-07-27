import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Command group",
  slug: "command-group",
  group: "Workflow",
  order: 20,
  description:
    "Named command alternatives stacked with clear labels, keeping every option readable and executable in static HTML without tab behaviour.",
  accessibility: [
    "Alternatives remain an ordered list rather than becoming hidden tab panels.",
    "A string title labels the group automatically; non-text titles should be paired with an explicit aria-label.",
    "Each alternative retains the Command component's complete run context and copy behaviour.",
  ],
} satisfies ComponentMeta;
