import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { Prose } from "../../editorial/prose/prose.tsx";
import meta, { componentExampleVocabulary } from "./glossary-term.meta.ts";
import { GlossaryTerm } from "./glossary-term.tsx";

export const conformance = [{
  name: "keyboard focus reveals and leaves a glossary definition",
  viewport: { width: 390, height: 844 },
  steps: [
    {
      action: "focus",
      target: {
        selector:
          "[data-example-glossary-term] .discern-glossary-term__trigger",
      },
    },
    {
      expect: "visible",
      target: { role: "group", name: "Reading measure definition" },
    },
    {
      expect: "within-viewport",
      target: { role: "group", name: "Reading measure definition" },
    },
    { action: "press", key: "Tab" },
    {
      expect: "hidden",
      target: { role: "group", name: "Reading measure definition" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function GlossaryTermExamples() {
  return (
    <Prose>
      <p>
        A{" "}
        <GlossaryTerm
          definition="A line-length boundary that keeps continuous prose comfortable to scan."
          data-example-glossary-term
        >
          reading measure
        </GlossaryTerm>{" "}
        helps a longer explanation remain readable.
      </p>
    </Prose>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: GlossaryTermExamples }],
);
