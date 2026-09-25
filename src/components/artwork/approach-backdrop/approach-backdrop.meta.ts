import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Approach backdrop",
  slug: "approach-backdrop",
  group: "Artwork",
  order: 30,
  description:
    "Nested right-anchored triangles that a station draws outward and a wave of light answers, with optional arrival, drift, and scroll dolly.",
  cli: {
    stance: "exempt",
    reason:
      "Approach backdrop's nested right-anchored triangles, emitted wavefront, and depth-weighted rings require scalable browser geometry with no honest terminal-cell equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "Foreground copy needs a clear column while a constructed focal point gathers at the edge.",
  ],
  notWhen: [
    "The decorative field must remain even across the complete canvas.",
    "A page cannot offer readers a way to pause motion that never ends; leave `drift` unset there.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "The entrance and its wave of light settle within five seconds; only an opted-in drift continues after that.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Approach field",
  only: "web",
}, {
  id: "arrival",
  label: "Arrival with drift",
  only: "web",
}, {
  id: "lantern",
  label: "Lantern light",
  only: "web",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
