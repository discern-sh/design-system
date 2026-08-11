import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Standard meter",
  slug: "standard-meter",
  group: "Workflow",
  order: 240,
  cli: { stance: "rendered" },
  description:
    "Quality reading against a rising floor or falling ceiling, with current value, limit, headroom, and an optional plain-text trend.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "A quality measure must be read against an explicit rising floor or falling ceiling with visible headroom.",
  ],
  notWhen: [
    "The value is generic progress without a defended limit; use Meter or Stat.",
  ],
  accessibility: [
    "Within-or-outside status, current value, limit, floor-or-ceiling direction, and headroom are all visible text; the bar is supporting magnitude, not the only reading.",
    "The composed Meter carries programmatic now, minimum, and maximum values.",
    "Improving, drifting, and flat trends appear as visible words alongside semantic colour.",
  ],
} satisfies ComponentMeta;
