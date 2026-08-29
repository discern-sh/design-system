import { useState } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import meta, { componentExampleVocabulary } from "./toast.meta.ts";
import { Toast } from "./toast.tsx";

export const conformance = [{
  example: "success",
  name: "the labelled dismiss action removes its notification",
  steps: [
    {
      action: "click",
      target: { role: "button", name: "Dismiss notification" },
    },
    {
      expect: "hidden",
      target: { selector: ".discern-toast--success" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

function DefaultToastState() {
  return <Toast>Settings saved.</Toast>;
}

function SuccessToastState() {
  const [visible, setVisible] = useState(true);
  return visible
    ? (
      <Toast
        tone="success"
        icon={<ExampleIcon name="check" />}
        onDismiss={() => setVisible(false)}
      >
        Changes saved.
      </Toast>
    )
    : null;
}

function WarningToastState() {
  return <Toast tone="warning">Connection is slow.</Toast>;
}

function DangerToastState() {
  return <Toast tone="danger" onDismiss={() => {}}>Could not save.</Toast>;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultToastState },
    { id: "success", Example: SuccessToastState },
    { id: "warning", Example: WarningToastState },
    { id: "danger", Example: DangerToastState },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "press-dismiss",
    label: "Dismiss pointer contact",
    example: "danger",
    category: "interaction",
    sequence: [
      {
        action: "pointer-down",
        target: { role: "button", name: "Dismiss notification" },
      },
      {
        checkpoint: {
          id: "toast-dismiss-pressed",
          label: "Dismiss pointer held",
        },
      },
      {
        action: "pointer-up",
        target: { role: "button", name: "Dismiss notification" },
      },
    ],
  }] as const,
);

export default function ToastExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <DefaultToastState />
      <SuccessToastState />
      <DangerToastState />
    </div>
  );
}
