import { Receipt } from "./receipt.tsx";

export default function ReceiptExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <Receipt
        style={{ width: "min(100%, 22rem)" }}
        title="Checkout refactor"
        stamp="pass"
        meta={[
          { label: "branch", value: "agent/checkout-flow" },
          { label: "commit", value: "4f2c9d1" },
          { label: "finished", value: <time dateTime="09:41">09:41</time> },
        ]}
        checks={[
          { label: "format", state: "pass" },
          { label: "lint", state: "pass" },
          { label: "types", state: "pass" },
          { label: "tests", state: "pass", value: "184 passed" },
        ]}
        summary="Ready for review"
        footer="12 files changed · +310 −204"
      />
      <Receipt
        style={{ width: "min(100%, 22rem)" }}
        title="Payment step"
        stamp="fail"
        checks={[
          { label: "format", state: "pass" },
          { label: "types", state: "pass" },
          { label: "tests", state: "fail", value: "2 of 184 failing" },
          { label: "preview", state: "skip" },
        ]}
        footer="Fix the failing cases before handing off."
      />
    </div>
  );
}
