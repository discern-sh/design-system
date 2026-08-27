import { assert, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogueExamples as procedureExamples } from "../src/components/workflow/procedure/procedure.examples.tsx";
import { catalogueExamples as procedureStepExamples } from "../src/components/workflow/procedure-step/procedure-step.examples.tsx";

Deno.test("active Procedure examples carry the same visible current-step meaning on Web", () => {
  for (const examples of [procedureExamples, procedureStepExamples]) {
    const active = examples.find(({ id }) => id === "active");
    assert(active !== undefined);
    const html = renderToStaticMarkup(createElement(active.Example));
    assertStringIncludes(html, 'aria-current="step"');
    assertStringIncludes(html, "Current step.");
  }
});
