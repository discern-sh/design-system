import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Light backdrop",
  slug: "light-backdrop",
  group: "Artwork",
  order: 15,
  description:
    "Quiet, optional surface illumination, complete when still and neutral outside an Accent scope.",
  cli: {
    stance: "exempt",
    reason:
      "Light backdrop is decorative spatial illumination without a terminal information or interaction equivalent.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "One selected opening or feature surface needs quiet illumination behind a complete foreground composition.",
  ],
  notWhen: [
    "Repeated Card grids or dense controls need clarity: omit LightBackdrop and use Card's static shaded texture instead.",
  ],
  accessibility: [
    "The decorative layer is hidden from assistive technology and never intercepts input.",
    "Still is the default. Explicit ambient motion obeys reduced motion; forced colours omit the light.",
    "Keep foreground content above the plane and provide a still control when requesting continuous ambient motion.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Still illumination",
  only: "web",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);
export default meta;
