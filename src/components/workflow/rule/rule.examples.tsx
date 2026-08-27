import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { PathReference } from "../path-reference/path-reference.tsx";
import { Rule } from "./rule.tsx";
import meta, { componentExampleVocabulary } from "./rule.meta.ts";

function GeneratedFileRuleState() {
  return (
    <Rule
      origin={<PathReference path="CONTRIBUTING.md" />}
      scope="Generated references"
    >
      Commit generated outputs with the authored source that produced them.
    </Rule>
  );
}

function NamespacedStyleRuleState() {
  return (
    <Rule
      origin={<PathReference path="project.toml" />}
      scope="Published styles"
    >
      Public classes and custom properties use the project namespace.
    </Rule>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: GeneratedFileRuleState },
    { id: "namespaced-styles", Example: NamespacedStyleRuleState },
  ],
);

export default function RuleExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <GeneratedFileRuleState />
      <NamespacedStyleRuleState />
    </div>
  );
}
