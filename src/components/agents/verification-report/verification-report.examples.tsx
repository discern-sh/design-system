import { denseVerificationReport } from "../operational-examples.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { VerificationReport } from "./verification-report.tsx";
import { Diffstat } from "../../display/diffstat/diffstat.tsx";
import meta, {
  componentExampleVocabulary,
} from "./verification-report.meta.ts";

function PassingReportState() {
  return (
    <VerificationReport
      style={{ width: "min(100%, 22rem)" }}
      title="Checkout refactor"
      stamp="pass"
      meta={[
        { label: "branch", value: <code>agent/checkout-flow</code> },
        { label: "commit", value: <code>4f2c9d1</code> },
      ]}
      checks={[
        { label: "format", state: "pass" },
        { label: "types", state: "pass" },
        { label: "tests", state: "pass", value: "184 passed" },
      ]}
      summary="Ready for review"
      footer={
        <>
          12 files changed · <Diffstat added={310} removed={204} />
        </>
      }
    />
  );
}

function FailingReportState() {
  return (
    <VerificationReport
      style={{ width: "min(100%, 22rem)" }}
      title="Payment step"
      stamp="fail"
      checks={[
        { label: "format", state: "pass" },
        { label: "types", state: "pass" },
        { label: "tests", state: "fail", value: "2 of 184 failing" },
        { label: "preview", state: "skip" },
      ]}
      nextAction="Fix the failing cases before handing off."
    />
  );
}

function DenseState() {
  return <VerificationReport {...denseVerificationReport} />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: PassingReportState },
    { id: "failure", Example: FailingReportState },
    { id: "dense", Example: DenseState },
  ],
);

export default function VerificationReportExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <PassingReportState />
      <FailingReportState />
    </div>
  );
}

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    ...(["narrow", "wide"] as const).map((inlineSize) => ({
      id: `dense-${inlineSize}`,
      label: `Dense evidence at ${inlineSize} width`,
      example: "dense",
      category: "responsive" as const,
      requirements: { inlineSize },
      sequence: [{
        checkpoint: {
          id: `dense-${inlineSize}-reading`,
          label: "Outcome, identity and boundaries",
        },
      }],
    })),
    {
      id: "open-evidence",
      label: "Opened complete evidence",
      example: "dense",
      category: "interaction",
      requirements: { inlineSize: "narrow" },
      sequence: [
        {
          action: "click",
          target: {
            selector: ".discern-verification-report__evidence > summary",
          },
        },
        {
          expect: "visible",
          target: { selector: ".discern-verification-report__checks" },
        },
        {
          checkpoint: {
            id: "evidence-open",
            label: "24 exact checks and artifact context",
          },
        },
      ],
    },
  ],
);
