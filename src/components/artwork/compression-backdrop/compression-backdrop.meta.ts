import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Compression backdrop",
  slug: "compression-backdrop",
  group: "Artwork",
  order: 110,
  description:
    "Ticked ribbon whose concertina fold compresses while its flat runs preserve the apparent length.",
  cli: {
    stance: "exempt",
    reason:
      "Compression backdrop's ticked ribbon depends on a scalable concertina fold and continuous flat runs; a terminal frame cannot express that decorative geometry honestly.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A wide surface needs one measured linear gesture with slow, material movement.",
  ],
  notWhen: [
    "The background needs an even texture across the complete canvas.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Compression field",
  only: "web",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
