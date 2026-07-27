import { PathReference } from "../path-reference/path-reference.tsx";
import { Rule } from "./rule.tsx";

export default function RuleExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <Rule
        origin={<PathReference path="AGENTS.md" />}
        scope="Every code change"
      >
        Commit generated outputs with the authored source that produced them.
      </Rule>
      <Rule
        origin={<PathReference path="project.toml" />}
        scope="Published styles"
      >
        Public classes and custom properties use the project namespace.
      </Rule>
    </div>
  );
}
