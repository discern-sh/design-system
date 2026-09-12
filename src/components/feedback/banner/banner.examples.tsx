import { useEffect, useId, useState } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { Button } from "../../core/button/button.tsx";
import { Progress } from "../progress/progress.tsx";
import meta, { componentExampleVocabulary } from "./banner.meta.ts";
import { Banner } from "./banner.tsx";

function DefaultBannerState() {
  return (
    <Banner
      heading="Information: a new version is available"
      actions={<Button variant="secondary">Review changes</Button>}
    >
      Your current work is saved. Review what has changed before choosing when
      to update.
    </Banner>
  );
}
function AccentBannerState() {
  return (
    <Banner tone="accent" heading="Featured update">
      Review the featured change and decide whether it fits your workflow.
    </Banner>
  );
}
function SuccessBannerState() {
  return (
    <Banner tone="success" heading="Checks passed">
      All eight files are ready. You can continue with the reviewed version.
    </Banner>
  );
}
function WarningBannerState() {
  return (
    <Banner
      tone="warning"
      heading="Warning: changes need review"
      actions={<Button variant="secondary">Review changes</Button>}
    >
      Two files have changed since the last review. Check the updated contents
      before continuing; your saved version is still available.
    </Banner>
  );
}
function DangerBannerState() {
  return (
    <Banner
      tone="danger"
      heading="Critical: files could not be saved"
      actions={<Button variant="secondary">Try saving again</Button>}
    >
      Your edits are still open in this session. Check the connection and try
      again before leaving this page.
    </Banner>
  );
}

/** Catalogue consumer fixture: supplied outcomes, timers and announcements stay outside the package Components. */
export function FeedbackTransitionExample(
  { outcome }: { readonly outcome: "success" | "failure" },
) {
  const id = useId();
  const [state, setState] = useState<
    "ready" | "loading" | "success" | "failure"
  >("ready");
  useEffect(() => {
    if (state !== "loading") return;
    const timer = setTimeout(() => setState(outcome), 1800);
    return () => clearTimeout(timer);
  }, [state, outcome]);
  const messages = {
    ready: {
      heading: "Ready to check",
      body: "Start the review when you are ready.",
    },
    loading: {
      heading: "Checking files",
      body:
        "Waiting for the review result. You can keep reading while the check runs.",
    },
    success: {
      heading: "Files checked successfully",
      body: "All eight files passed. The reviewed files are ready to use.",
    },
    failure: {
      heading: "File check interrupted",
      body:
        "The review service is unavailable. Your files are unchanged; check files again to retry.",
    },
  };
  const message = messages[state];
  return (
    <section
      aria-labelledby={`${id}-title`}
      style={{
        display: "grid",
        gap: "var(--discern-space-4)",
        containerType: "inline-size",
      }}
    >
      <h3 id={`${id}-title`} style={{ margin: 0 }}>File review</h3>
      <p style={{ margin: 0 }}>
        Review 8 selected files. Originals stay unchanged.
      </p>
      <Banner
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tone={state === "success"
          ? "success"
          : state === "failure"
          ? "danger"
          : "neutral"}
        heading={message.heading}
        style={{ minBlockSize: "clamp(8rem, calc(29rem - 100cqi), 12rem)" }}
      >
        {message.body}
      </Banner>
      <div
        aria-hidden={state !== "loading"}
        style={{ visibility: state === "loading" ? "visible" : "hidden" }}
      >
        <Progress
          label="Review selected files"
          context="Waiting for the review service"
        />
      </div>
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            if (state !== "loading") setState("loading");
          }}
        >
          Check files
        </Button>
      </div>
    </section>
  );
}
function LoadingSuccess() {
  return <FeedbackTransitionExample outcome="success" />;
}
function LoadingFailure() {
  return <FeedbackTransitionExample outcome="failure" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultBannerState },
    { id: "accent", Example: AccentBannerState },
    { id: "success", Example: SuccessBannerState },
    { id: "warning", Example: WarningBannerState },
    { id: "danger", Example: DangerBannerState },
    { id: "loading-success", Example: LoadingSuccess },
    { id: "loading-failure", Example: LoadingFailure },
  ],
);

export const conformance = (["success", "failure"] as const).map((outcome) => ({
  example: `loading-${outcome}`,
  name: `file review retains focus through ${outcome}`,
  steps: [
    { action: "focus", target: { role: "button", name: "Check files" } },
    {
      action: "press",
      key: "Enter",
      target: { role: "button", name: "Check files" },
    },
    {
      expect: "visible",
      target: { role: "progressbar", name: "Review selected files" },
    },
    {
      expect: "visible",
      target: {
        role: "heading",
        name: outcome === "success"
          ? "Files checked successfully"
          : "File check interrupted",
      },
    },
    { expect: "focused", target: { role: "button", name: "Check files" } },
  ],
})) satisfies readonly ConformanceScenario[];

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    ...(["success", "failure"] as const).flatMap((outcome) =>
      [false, true].map((reducedMotion) => ({
        id: `${outcome}-${reducedMotion ? "reduced" : "production"}`,
        label: `Loading to ${outcome}${
          reducedMotion ? " with reduced motion" : " at production speed"
        }`,
        example: `loading-${outcome}`,
        category: "motion" as const,
        requirements: { inlineSize: 390, reducedMotion },
        sequence: [
          {
            action: "focus" as const,
            target: { role: "button", name: "Check files" },
          },
          {
            action: "click" as const,
            target: { role: "button", name: "Check files" },
          },
          {
            checkpoint: {
              id: `${outcome}-${reducedMotion}-waiting`,
              label: "Waiting with context",
            },
          },
        ],
      }))
    ),
    {
      id: "long-warning",
      label: "Long warning in a narrow region",
      example: "warning",
      category: "responsive",
      requirements: { inlineSize: 260 },
      sequence: [{
        checkpoint: {
          id: "warning-hierarchy",
          label: "Heading, explanation and action",
        },
      }],
    },
  ],
);
export default DefaultBannerState;
