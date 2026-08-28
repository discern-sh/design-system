import { useState } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./dialog.meta.ts";
import { Dialog } from "./dialog.tsx";

const openDefaultDialog = {
  action: "click",
  target: { role: "button", name: "Open confirmation" },
} as const;

export const conformance = [{
  example: "default",
  name: "opening and escaping the modal restores focus to its trigger",
  steps: [
    openDefaultDialog,
    {
      expect: "visible",
      target: { role: "dialog", name: "Save changes?" },
    },
    {
      expect: "focused",
      target: { role: "button", name: "Close dialog" },
    },
    { action: "press", key: "Escape" },
    {
      expect: "hidden",
      target: { role: "dialog", name: "Save changes?" },
    },
    {
      expect: "focused",
      target: { role: "button", name: "Open confirmation" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

interface DialogScenarioProps {
  readonly trigger: string;
  readonly title: string;
  readonly body: string;
  readonly kicker?: string;
  readonly actions?: readonly string[];
}

function DialogScenario(
  { trigger, title, body, kicker, actions }: DialogScenarioProps,
) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{trigger}</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        kicker={kicker}
        title={title}
        actions={actions === undefined
          ? undefined
          : actions.map((action) => (
            <Button
              key={action}
              variant={action === actions[0] ? "ghost" : "primary"}
              onClick={() => setOpen(false)}
            >
              {action}
            </Button>
          ))}
      >
        <p>{body}</p>
      </Dialog>
    </>
  );
}

function DefaultDialogState() {
  return (
    <DialogScenario
      trigger="Open confirmation"
      kicker="Confirm"
      title="Save changes?"
      body="This action makes the update available."
      actions={["Cancel", "Save"]}
    />
  );
}

function SubmittedDialogState() {
  return (
    <DialogScenario
      trigger="Show submitted dialog"
      title="Changes saved"
      body="The update is now available."
    />
  );
}

function CancelledDialogState() {
  return (
    <DialogScenario
      trigger="Show cancelled dialog"
      title="Save changes?"
      body="No changes were made."
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "default",
      Example: DefaultDialogState,
      capture: {
        prepare: [{ action: "click", selector: ":scope > .discern-button" }],
        selectors: [".discern-dialog__panel"],
      },
    },
    {
      id: "submitted",
      Example: SubmittedDialogState,
      capture: {
        prepare: [{ action: "click", selector: ":scope > .discern-button" }],
        selectors: [".discern-dialog__panel"],
      },
    },
    {
      id: "cancelled",
      Example: CancelledDialogState,
      capture: {
        prepare: [{ action: "click", selector: ":scope > .discern-button" }],
        selectors: [".discern-dialog__panel"],
      },
    },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "open-dialog",
      label: "Open dialog",
      example: "default",
      category: "motion",
      sequence: [
        openDefaultDialog,
        { checkpoint: { id: "dialog-open", label: "Open and focused" } },
      ],
    },
    {
      id: "close-dialog",
      label: "Close and restore focus",
      example: "default",
      category: "motion",
      sequence: [
        openDefaultDialog,
        { action: "press", key: "Escape" },
        {
          expect: "focused",
          target: { role: "button", name: "Open confirmation" },
        },
        { checkpoint: { id: "dialog-closed", label: "Closed and restored" } },
      ],
      capture: { selectors: [":scope > .discern-button"] },
    },
  ] as const,
);

export default function DialogExamples() {
  return <DefaultDialogState />;
}
