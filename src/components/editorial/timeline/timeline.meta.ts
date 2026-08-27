import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Timeline",
  slug: "timeline",
  group: "Editorial",
  order: 100,
  cli: { stance: "rendered" },
  description:
    "Chronological narrative for histories, release stories, investigations, and staged programmes, with optional status and detail.",
  accessibility: [
    "Events remain an ordered list and visual marker status supplements rather than replaces the written content.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Editorial timeline",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
