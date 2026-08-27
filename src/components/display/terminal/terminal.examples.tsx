import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Badge } from "../badge/badge.tsx";
import meta, { componentExampleVocabulary } from "./terminal.meta.ts";
import { Terminal } from "./terminal.tsx";

function StandardTerminalState() {
  return (
    <Terminal title="~/workspace — check">
      <span className="discern-terminal__command-prefix">$</span>{" "}
      task check{"\n"}
      <span className="discern-terminal__muted">
        Check formatting, types, and tests
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
      title="structured result"
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
  "error": "out_of_date",
  "state": "refresh required",
  "next": "refresh state"
}`}
    </Terminal>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "standard", Example: StandardTerminalState },
    { id: "showcase", Example: ShowcaseTerminalState },
  ],
);

export default function TerminalExamples() {
  return (
    <div className="discern-example-stack">
      <StandardTerminalState />
      <ShowcaseTerminalState />
    </div>
  );
}
