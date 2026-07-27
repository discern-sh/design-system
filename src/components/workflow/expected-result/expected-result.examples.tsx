import { ExpectedResult } from "./expected-result.tsx";

export default function ExpectedResultExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <ExpectedResult>
        On branch main{"\n"}nothing to commit, working tree clean
      </ExpectedResult>
      <ExpectedResult variant="state">
        The test process exits successfully and returns control to the shell.
      </ExpectedResult>
    </div>
  );
}
