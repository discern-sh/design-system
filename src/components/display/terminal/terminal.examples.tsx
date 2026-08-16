import type { CatalogueExampleState } from "../../../../catalogue/conformance.ts";
import { Badge } from "../badge/badge.tsx";
import { Terminal } from "./terminal.tsx";

function StandardTerminalState() {
  return (
    <Terminal title="~/project — verify">
      <span className="discern-terminal__command-prefix">$</span>{" "}
      deno task verify{"\n"}
      <span className="discern-terminal__muted">
        Check formatting, types, catalogue, and tests
      </span>
      {"\n"}
      <span className="discern-terminal__success">✓</span> 18 tests passed{"\n"}
      <span className="discern-terminal__command-prefix">$</span>
      {" "}
    </Terminal>
  );
}

function ShowcaseTerminalState() {
  return (
    <Terminal
      title="agent result"
      actions={<Badge tone="accent">structured output</Badge>}
      footer={
        <>
          <span>bounded context</span>
          <span>explicit state</span>
          <span>useful next step</span>
        </>
      }
      variant="showcase"
    >
      {`{
  "ok": false,
  "error": "behind_trunk",
  "state": "4 commits behind",
  "next": "call project_update"
}`}
    </Terminal>
  );
}

export const catalogueStates = [
  { name: "standard", label: "Standard", Example: StandardTerminalState },
  { name: "showcase", label: "Showcase", Example: ShowcaseTerminalState },
] satisfies readonly CatalogueExampleState[];

export default function TerminalExamples() {
  return (
    <div className="discern-example-stack">
      <StandardTerminalState />
      <ShowcaseTerminalState />
    </div>
  );
}
