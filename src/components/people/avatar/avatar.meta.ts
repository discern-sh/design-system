import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";
const meta = {
  name: "Avatar",
  slug: "avatar",
  group: "People",
  order: 10,
  cli: { stance: "rendered" },
  description:
    "Identity mark for one person: portrait photo or UI monogram in five sizes, with an optional presence badge.",
  accessibility: [
    'A named avatar carries role="img" with the person\'s name — and presence, when set — as its accessible label; set decorative when adjacent text already names the person.',
    "Presence is never colour alone: the labelled form folds it into the accessible name, and composers such as Persona render their own text alternative.",
    "The monogram is aria-hidden decoration derived from the name, so assistive technology hears the name, never the letters.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Initials with presence" },
    {
      id: "portrait",
      label: "Portrait",
      only: "web",
      reason:
        "The package's text-cell terminal contract has no raster-image primitive with which to reproduce this portrait.",
    },
    { id: "square", label: "Square" },
  ],
);

export default meta;
