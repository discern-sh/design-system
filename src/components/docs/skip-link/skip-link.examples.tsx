import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./skip-link.meta.ts";
import { SkipLink } from "./skip-link.tsx";

export const conformance = [{
  example: "default",
  name: "the hidden bypass link surfaces on the next keyboard tab stop",
  steps: [
    {
      action: "click",
      target: { role: "button", name: "Focus me, then press Tab" },
    },
    { action: "press", key: "Tab" },
    { expect: "focused", target: { selector: ".discern-skip-link" } },
  ],
}] satisfies readonly ConformanceScenario[];

export default function SkipLinkExamples() {
  return (
    <div className="discern-example-stack">
      <p>
        A bypass link renders as a page's first tab stop and stays visually
        hidden until keyboard focus reaches it. Try it here: press the button
        below, then press Tab — the link surfaces in the top-left corner.
      </p>
      <div>
        <Button variant="secondary">Focus me, then press Tab</Button>
        <SkipLink href="#skip-link-target" />
      </div>
      <p id="skip-link-target">Lorem ipsum main content landing point.</p>
    </div>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: SkipLinkExamples }],
);
