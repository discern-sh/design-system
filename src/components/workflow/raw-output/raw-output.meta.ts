import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Raw output",
  slug: "raw-output",
  group: "Workflow",
  order: 230,
  description:
    "Native disclosure for machine-oriented detail, with a visible collapsed or expanded label and faithful horizontal overflow.",
  accessibility: [
    "Native details and summary semantics keep the disclosure operable without client JavaScript.",
    "Collapsed and expanded are visible text labels that change with the native open state.",
    "Machine output remains semantic preformatted code and scrolls in both axes instead of forcing the page wider.",
    "The disclosure marker is hidden decoration, and its motion is removed when reduced motion is requested.",
  ],
} satisfies ComponentMeta;
