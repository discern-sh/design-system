import type {
  CatalogueExampleState,
  ConformanceScenario,
} from "../../../../catalogue/conformance.ts";
import { Diagnostic } from "./diagnostic.tsx";

const verboseEvidence =
  'Type \'"pending" | "complete"\' is not assignable to type \'"complete"\'. The value may still be pending when this branch renders.';
const rawDetail =
  'TS2322 [ERROR]: Type \'"pending" | "complete"\' is not assignable to type \'"complete"\'.\n    at src/components/workflow/example/example.tsx:118:17\nFound 1 error.';

export const conformance = [{
  name: "long location and verbose evidence stay contained at narrow width",
  viewport: { width: 390, height: 1400 },
  steps: [{
    expect: "within-viewport",
    target: { selector: "[data-example-diagnostic-stress]" },
  }, {
    expect: "visible",
    target: {
      selector:
        "[data-example-diagnostic-stress] .discern-path-reference__suffix",
    },
  }, {
    expect: "scrollable-x",
    target: {
      selector:
        "[data-example-diagnostic-stress] .discern-diagnostic__evidence pre",
    },
  }, {
    expect: "visible",
    target: {
      selector:
        "[data-example-diagnostic-stress] .discern-diagnostic__evidence code",
    },
  }],
}] satisfies readonly ConformanceScenario[];

function VerboseFailureState() {
  return (
    <Diagnostic
      title="Type check failed"
      impact="The package cannot be built until the incompatible value is corrected."
      path="/path/to/a/deliberately/long/project/src/components/workflow/example/example.tsx"
      line={118}
      column={17}
      pathCopyable
      evidence={verboseEvidence}
      reproductionCommand="deno task typecheck"
      retryCommand="deno task typecheck --reload"
      workingDirectory="/path/to/project"
      correction='Handle the "pending" case before assigning the value, then rerun the type check.'
      rawDetail={rawDetail}
      data-example-diagnostic-stress
    />
  );
}

function AttentionState() {
  return (
    <Diagnostic
      severity="attention"
      title="Generated output is stale"
      impact="The checked-in surface may not match its authored metadata."
      correction="Regenerate the derived files and inspect the resulting diff."
    />
  );
}

export const catalogueStates = [
  {
    name: "verbose-failure",
    label: "Verbose failure",
    Example: VerboseFailureState,
  },
  { name: "attention", label: "Attention", Example: AttentionState },
] satisfies readonly CatalogueExampleState[];

export default function DiagnosticExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <VerboseFailureState />
      <AttentionState />
    </div>
  );
}
