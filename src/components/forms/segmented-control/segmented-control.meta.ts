import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "SegmentedControl",
  slug: "segmented-control",
  group: "Forms",
  order: 65,
  description:
    "A labelled native radio group for one of a few peer settings, with stable submitted values and no hydration requirement.",
  purposes: ["procedural-workflow"],
  useWhen: [
    "Choose one of a few peer settings that benefit from being visible together.",
  ],
  notWhen: [
    "Use Tabs to switch associated content panels, or consumer-owned links for navigation.",
    "Use Radio for choices with substantial descriptions, Select for a longer option list, and Checkbox for multiple selections.",
  ],
  cli: { stance: "rendered" },
  accessibility: [
    "The visible legend names a native radio group. Tab enters the selected enabled option; arrow keys select enabled peers and labels activate their inputs without hydration.",
    "The shared name submits the stable value. A default selects the first enabled option; a supplied value must match an item. Disabled choices remain visible and do not submit.",
    "The selected surface is underlined as well as filled, focus has a visible ring, and narrow local allocations stack the choices.",
    "The CLI is a deterministic selection frame; it does not capture keys or create an interactive request.",
  ],
} satisfies ComponentMeta;

/** Canonical peer-selection postures shared by Web and CLI. */
export const componentExampleVocabulary = [
  { id: "default", label: "Peer selection" },
  { id: "long-labels", label: "Long labels" },
  { id: "icons", label: "Icons with labels" },
  { id: "disabled", label: "Disabled group" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);
export default meta;
