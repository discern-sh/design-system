import { useState } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import { Input } from "../../forms/input/input.tsx";
import meta, { componentExampleVocabulary } from "./dialog.meta.ts";
import { Dialog } from "./dialog.tsx";

export const conformance = [{
  name: "opening and escaping the modal restores focus to its trigger",
  steps: [
    { action: "click", target: { role: "button", name: "Open dialog" } },
    {
      expect: "visible",
      target: { role: "dialog", name: "Lorem ipsum dolor" },
    },
    {
      expect: "focused",
      target: { role: "button", name: "Close dialog" },
    },
    { action: "press", key: "Escape" },
    {
      expect: "hidden",
      target: { role: "dialog", name: "Lorem ipsum dolor" },
    },
    {
      expect: "focused",
      target: { role: "button", name: "Open dialog" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

interface DialogScenarioProps {
  readonly trigger: string;
  readonly title: string;
  readonly body: string;
  readonly kicker?: string;
  readonly actions?: readonly string[];
  readonly initialOpen?: boolean;
}

function DialogScenario(
  { trigger, title, body, kicker, actions, initialOpen = false }:
    DialogScenarioProps,
) {
  const [open, setOpen] = useState(initialOpen);
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
      initialOpen
    />
  );
}

function ConformanceDialogState() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        kicker="Example"
        title="Lorem ipsum dolor"
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Continue</Button>
          </>
        }
      >
        <Input label="Lorem ipsum" placeholder="Dolor sit amet" />
      </Dialog>
    </>
  );
}

function SubmittedDialogState() {
  return (
    <DialogScenario
      trigger="Show submitted dialog"
      title="Changes saved"
      body="The update is now available."
      initialOpen
    />
  );
}

function CancelledDialogState() {
  return (
    <DialogScenario
      trigger="Show cancelled dialog"
      title="Save changes?"
      body="No changes were made."
      initialOpen
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultDialogState },
    { id: "submitted", Example: SubmittedDialogState },
    { id: "cancelled", Example: CancelledDialogState },
  ],
);

export default function DialogExamples() {
  return <ConformanceDialogState />;
}
