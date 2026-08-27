import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./prose.meta.ts";
import { Prose } from "./prose.tsx";

function LeadProseExample() {
  return (
    <Prose lead dropCap>
      <p>
        Good long-form design gives the first paragraph enough presence to open
        the argument without turning every sentence into display type.
      </p>
      <p>The rest settles into a calm reading measure.</p>
    </Prose>
  );
}

function RichStructureExample() {
  return (
    <Prose>
      <p>
        A reading context keeps <strong>inline meaning</strong> beside{" "}
        <a href="#prose-example">its reference</a>.
      </p>
      <h2 id="prose-example">A durable reading rhythm</h2>
      <ul>
        <li>Structural children keep their own semantics.</li>
        <li>Prose supplies only measure and rhythm.</li>
      </ul>
      <p>
        A hard break remains intentional.<br />
        The next line stays in the same paragraph.
      </p>
    </Prose>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: LeadProseExample },
    { id: "rich-structure", Example: RichStructureExample },
  ],
);

export default function ProseExamples() {
  return (
    <div className="discern-example-stack">
      <LeadProseExample />
      <RichStructureExample />
    </div>
  );
}
